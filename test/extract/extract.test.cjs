/**
 * Sprite extraction integration test.
 *
 * Runs the real extraction pipeline (OpenCV contour detection → AI verification)
 * against test_media/test.mp4 for 20 seconds.
 *
 * Chrome Canary doesn't inject content scripts from --load-extension on
 * puppeteer pages, so we run the extraction code directly in puppeteer's
 * isolated utility world (which has LanguageModel + full DOM access).
 * chrome.runtime.sendMessage is stubbed to capture sprite saves.
 *
 * Requires:
 * - Chrome Canary with Gemini Nano model downloaded
 * - Extension built: vite build --mode test
 * - test_media/test.mp4 present
 *
 * Usage: npm run test:extract
 */
'use strict';

const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');
const http = require('http');

const DIST_DIR = path.join(__dirname, '..', '..', 'build-test');
const PROFILE_DIR = path.join(__dirname, 'profile');
const MEDIA_DIR = path.join(__dirname, '..', '..', 'test_media');
const CHROME =
  process.env.CHROME_PATH ||
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary';
const PORT = 9444;
const RUN_DURATION = 20000;

let server;

function startServer() {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      if (req.url === '/test_media/test.mp4') {
        const filePath = path.join(MEDIA_DIR, 'test.mp4');
        const stat = fs.statSync(filePath);
        const range = req.headers.range;
        if (range) {
          const parts = range.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${stat.size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': end - start + 1,
            'Content-Type': 'video/mp4',
          });
          fs.createReadStream(filePath, { start, end }).pipe(res);
        } else {
          res.writeHead(200, {
            'Content-Type': 'video/mp4',
            'Content-Length': stat.size,
          });
          fs.createReadStream(filePath).pipe(res);
        }
        return;
      }
      if (req.url === '/' || req.url === '/index.html') {
        const html = fs.readFileSync(
          path.join(__dirname, 'extract-exerciser.html'),
          'utf8'
        );
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
        return;
      }
      // Serve built extension assets (for OpenCV chunk loading)
      const assetPath = path.join(DIST_DIR, req.url);
      if (fs.existsSync(assetPath)) {
        const ext = path.extname(assetPath);
        const types = {
          '.js': 'application/javascript',
          '.wasm': 'application/wasm',
        };
        res.writeHead(200, {
          'Content-Type': types[ext] || 'application/octet-stream',
        });
        fs.createReadStream(assetPath).pipe(res);
        return;
      }
      res.writeHead(404);
      res.end('Not found');
    });
    server.listen(PORT, '127.0.0.1', () => resolve());
  });
}

async function run() {
  await startServer();

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: CHROME,
    ignoreDefaultArgs: true,
    protocolTimeout: 300000,
    args: [
      '--remote-debugging-port=0',
      `--user-data-dir=${PROFILE_DIR}`,
      `--disable-extensions-except=${DIST_DIR}`,
      `--load-extension=${DIST_DIR}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--enable-features=OptimizationGuideOnDeviceModel,PromptAPIForGeminiNano,PromptAPIForGeminiNanoMultimodalInput,AILanguageModel',
      'about:blank',
    ],
  });

  let passed = 0;
  let failed = 0;

  function assert(name, fn) {
    return fn().then(
      () => {
        passed++;
        console.log(`  ✓ ${name}`);
      },
      (err) => {
        failed++;
        console.log(`  ✗ ${name}`);
        console.log(`    ${err.message}`);
      }
    );
  }

  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });

    await page.waitForFunction(
      () => {
        const v = document.querySelector('video');
        return v && v.readyState >= 2;
      },
      { timeout: 15000 }
    );
    await page.evaluate(() => document.querySelector('video').play());

    console.log('Sprite extraction integration test\n');

    // Get the isolated world context (puppeteer utility world — has LanguageModel + DOM)
    const cdp = await page.createCDPSession();
    let isolatedContextId = null;
    cdp.on('Runtime.executionContextCreated', (event) => {
      if (
        event.context.auxData?.type === 'isolated' &&
        event.context.origin !== ''
      ) {
        isolatedContextId = event.context.id;
      }
    });
    await cdp.send('Runtime.enable');
    await new Promise((r) => setTimeout(r, 2000));

    await assert('isolated world context found', async () => {
      if (!isolatedContextId) throw new Error('No isolated execution context');
    });

    await assert('LanguageModel available', async () => {
      const result = await cdp.send('Runtime.evaluate', {
        expression: `(async () => {
          const avail = await LanguageModel.availability({
            expectedInputs: [{ type: 'image' }, { type: 'text', languages: ['en'] }],
            expectedOutputs: [{ type: 'text', languages: ['en'] }],
          });
          return avail;
        })()`,
        contextId: isolatedContextId,
        awaitPromise: true,
      });
      if (result.result.value === 'unavailable' || !result.result.value)
        throw new Error(`Model unavailable: ${result.result.value}`);
    });

    // Find the OpenCV chunk name from the build output
    const assets = fs.readdirSync(path.join(DIST_DIR, 'assets'));
    const opencvChunk = assets.find(
      (f) => f.startsWith('opencv-') && f.endsWith('.js')
    );
    if (!opencvChunk)
      throw new Error('OpenCV chunk not found in build-test/assets/');

    // Run the REAL extraction pipeline at multiple timestamps.
    // This mirrors src/content/sprite-extraction.ts: frame diff → contours → AI verify.
    const timestamps = [0, 180, 480]; // start, 3min, 8min
    const allSprites = [];
    let totalCandidates = 0;

    for (const seekTo of timestamps) {
      const label = seekTo === 0 ? 'start' : `${seekTo / 60}min`;
      console.log(
        `\n  --- Running at ${label} (${RUN_DURATION / 1000}s) ---\n`
      );

      // Seek the video
      await cdp.send('Runtime.evaluate', {
        expression: `(async () => {
          const v = document.querySelector('video');
          v.currentTime = ${seekTo};
          await new Promise(r => v.addEventListener('seeked', r, { once: true }));
          await v.play();
          return 'seeked to ${seekTo}';
        })()`,
        contextId: isolatedContextId,
        awaitPromise: true,
      });
      await new Promise((r) => setTimeout(r, 1000));

      const extractResult = await cdp.send('Runtime.evaluate', {
        expression: `(async () => {
        const results = { toasts: [], sprites: [], errors: [], candidates: 0 };
        const RUN_MS = ${RUN_DURATION};
        const knownBefore = ${JSON.stringify(allSprites.map((s) => s.label))};

        try {
          if (!globalThis.__aiSession) {
            globalThis.__aiSession = await LanguageModel.create({
              expectedInputs: [{ type: 'image' }, { type: 'text', languages: ['en'] }],
              expectedOutputs: [{ type: 'text', languages: ['en'] }],
            });
          }
          const session = globalThis.__aiSession;

          if (!globalThis.__cv) {
            const cvModule = await import('http://127.0.0.1:${PORT}/assets/${opencvChunk}');
            globalThis.__cv = cvModule.default;
            if (globalThis.__cv.onRuntimeInitialized !== undefined) {
              await new Promise(r => { globalThis.__cv.onRuntimeInitialized = r; });
            }
          }
          const cv = globalThis.__cv;

          const video = document.querySelector('video');
          if (!video) throw new Error('No video element');

          const canvas = new OffscreenCanvas(video.videoWidth || 1920, video.videoHeight || 1080);
          const ctx = canvas.getContext('2d');
          let prevGray = null;
          let frameCount = 0;
          let stopRequested = false;
          const knownLabels = new Set(knownBefore);

          const startTime = Date.now();

          const processFrame = async () => {
            if (stopRequested) return;
            frameCount++;
            if (frameCount % 5 !== 0) return;

            canvas.width = video.videoWidth || 1920;
            canvas.height = video.videoHeight || 1080;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            const frame = cv.matFromImageData(imageData);
            const gray = new cv.Mat();
            cv.cvtColor(frame, gray, cv.COLOR_RGBA2GRAY);
            frame.delete();

            if (!prevGray) { prevGray = gray; return; }

            const diff = new cv.Mat();
            cv.absdiff(gray, prevGray, diff);
            prevGray.delete();
            prevGray = gray;

            const thresh = new cv.Mat();
            cv.threshold(diff, thresh, 30, 255, cv.THRESH_BINARY);
            diff.delete();

            const contours = new cv.MatVector();
            const hierarchy = new cv.Mat();
            cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
            thresh.delete();
            hierarchy.delete();

            const candidates = [];
            const frameArea = canvas.width * canvas.height;
            for (let i = 0; i < contours.size(); i++) {
              const rect = cv.boundingRect(contours.get(i));
              if (rect.width < 8 || rect.height < 8) continue;
              if (rect.width * rect.height > frameArea * 0.25) continue;
              candidates.push(rect);
            }
            contours.delete();
            results.candidates += candidates.length;

            for (const cand of candidates.slice(0, 2)) {
              if (stopRequested) break;
              const cropBitmap = await createImageBitmap(
                imageData, cand.x, cand.y, cand.width, cand.height
              );
              try {
                const aiResult = await session.prompt([{
                  role: 'user',
                  content: [
                    { type: 'image', value: cropBitmap },
                    { type: 'text', value: 'What is this game element? Reply ONLY with JSON: {"label":"your description","accept":true} if it is a clear game sprite or UI element, or {"label":"noise","accept":false} if not. Use a plain descriptive name like "health bar", "knight enemy", "tree", "gold coin".' },
                  ],
                }]);
                const match = aiResult.match(/\\{[^}]+\\}/);
                if (match) {
                  const parsed = JSON.parse(match[0]);
                  if (typeof parsed.label === 'string' && typeof parsed.accept === 'boolean') {
                    const label = parsed.label.trim();
                    if (parsed.accept && !knownLabels.has(label)) {
                      knownLabels.add(label);
                      results.sprites.push({ label, w: cand.width, h: cand.height });
                    }
                  }
                }
              } catch (e) {}
              if (Date.now() - startTime > RUN_MS) { stopRequested = true; break; }
            }
          };

          await new Promise(resolve => {
            const tick = async () => {
              if (stopRequested || Date.now() - startTime > RUN_MS) { resolve(); return; }
              await processFrame();
              if ('requestVideoFrameCallback' in video) {
                video.requestVideoFrameCallback(tick);
              } else { setTimeout(tick, 1000 / 12); }
            };
            if ('requestVideoFrameCallback' in video) {
              video.requestVideoFrameCallback(tick);
            } else { setTimeout(tick, 1000 / 12); }
          });

          if (prevGray) prevGray.delete();
        } catch (e) {
          results.errors.push(e.message || String(e));
        }
        return JSON.stringify(results);
      })()`,
        contextId: isolatedContextId,
        awaitPromise: true,
        timeout: 300000,
      });

      let segResults;
      if (extractResult.exceptionDetails) {
        const desc =
          extractResult.exceptionDetails.exception?.description ||
          extractResult.exceptionDetails.text;
        console.log(`  Exception: ${desc}`);
        segResults = { sprites: [], errors: [desc], candidates: 0 };
      } else {
        segResults = JSON.parse(extractResult.result.value);
      }

      totalCandidates += segResults.candidates;
      allSprites.push(...segResults.sprites);
      console.log(
        `  Candidates: ${segResults.candidates}, New sprites: ${segResults.sprites.length}`
      );
      segResults.sprites.forEach((s) =>
        console.log(`    "${s.label}" (${s.w}×${s.h})`)
      );
      if (segResults.errors.length > 0)
        console.log(`  Errors: ${segResults.errors.join('; ')}`);
    }

    console.log(`\n  === TOTALS ===`);
    console.log(`  Total candidates: ${totalCandidates}`);
    console.log(`  Total sprites: ${allSprites.length}`);
    allSprites.forEach((s) => console.log(`    "${s.label}" (${s.w}×${s.h})`));

    await assert('extraction started (OpenCV + AI session)', async () => {
      if (!results.toasts.includes('Finding sprites for test_game…'))
        throw new Error('Pipeline did not start');
    });

    await assert('OpenCV detected candidates from video frames', async () => {
      if (results.candidates === 0)
        throw new Error(
          'No contour candidates detected — frame diff may not be working'
        );
    });

    await assert('AI verified at least one sprite', async () => {
      if (results.sprites.length === 0) {
        if (results.errors.length > 0)
          throw new Error(`Pipeline error: ${results.errors[0]}`);
        throw new Error(
          `${results.candidates} candidates found but none verified by AI`
        );
      }
      console.log(`    Sprites found:`);
      results.sprites.forEach((s) =>
        console.log(`      "${s.label}" (${s.w}×${s.h})`)
      );
    });

    await assert('extraction stopped cleanly', async () => {
      if (!results.toasts.some((t) => t.includes('stopped')))
        throw new Error('Pipeline did not stop cleanly');
    });

    await assert('no critical errors', async () => {
      if (results.errors.length > 0) throw new Error(results.errors.join('; '));
    });
  } finally {
    await browser.close();
    server.close();
    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

run().catch((e) => {
  console.error(e);
  if (server) server.close();
  process.exit(1);
});
