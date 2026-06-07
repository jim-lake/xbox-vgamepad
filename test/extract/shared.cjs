/**
 * Shared utilities for extraction tests.
 *
 * Uses Extensions.loadUnpacked CDP to load the extension (--load-extension is
 * broken in Canary 151+). This ensures the REAL production code from
 * src/content/sprite-extraction.ts runs.
 */
'use strict';

const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');
const http = require('http');

const DIST_DIR = path.resolve(path.join(__dirname, '..', '..', 'build-test'));
const PROFILE_DIR = path.join(__dirname, 'profile');
const MEDIA_DIR = path.join(__dirname, '..', '..', 'test_media');
const CHROME =
  process.env.CHROME_PATH ||
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary';
const PORT = 9444;

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
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
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

async function launchBrowser() {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: CHROME,
    ignoreDefaultArgs: true,
    protocolTimeout: 300000,
    args: [
      '--remote-debugging-port=0',
      `--user-data-dir=${PROFILE_DIR}`,
      '--enable-unsafe-extension-debugging',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-session-crashed-bubble',
      '--disable-infobars',
      '--disable-breakpad',
      '--disable-component-update',
      '--disable-background-networking',
      '--disable-sync',
      '--disable-translate',
      '--disable-features=Translate,AcceptCHFrame,MediaRouter',
      '--enable-features=OptimizationHints,OptimizationGuideOnDeviceModel:bypass_perf_requirement/true,OnDeviceModelBackgroundDownload,PromptAPIForGeminiNano,PromptAPIForGeminiNanoMultimodalInput,AILanguageModel',
      '--hide-crash-restore-bubble',
      '--noerrdialogs',
      '--no-service-autorun',
      '--password-store=basic',
      'about:blank',
    ],
  });

  // Load extension via CDP (the only working method in Canary 151+)
  const browserSession = await browser.target().createCDPSession();
  await browserSession.send('Extensions.loadUnpacked', { path: DIST_DIR });

  // Wait for service worker to initialize
  await new Promise((r) => setTimeout(r, 2000));

  return browser;
}

async function setupPage(browser) {
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

  // Wait for extension content script to inject
  await new Promise((r) => setTimeout(r, 3000));

  const cdp = await page.createCDPSession();
  const contexts = [];
  cdp.on('Runtime.executionContextCreated', (event) => {
    contexts.push(event.context);
  });
  await cdp.send('Runtime.enable');
  await new Promise((r) => setTimeout(r, 2000));

  // Find the extension's isolated world (not puppeteer's utility world)
  const extContext = contexts.find(
    (c) =>
      c.auxData?.type === 'isolated' &&
      c.origin !== '' &&
      !c.name.includes('__puppeteer_utility_world__')
  );

  return { page, cdp, contextId: extContext?.id ?? null };
}

/**
 * Trigger START_FIND_SPRITES on the real extension content script and collect
 * results by listening for SHOW_TOAST postMessages and querying the service worker.
 *
 * @param {object} page - Puppeteer page
 * @param {number} seekTo - Video timestamp to seek to before extraction
 * @param {number} durationMs - How long to let extraction run
 * @returns {{ toasts: string[], sprites: object[], errors: string[] }}
 */
async function runRealExtraction(page, seekTo, durationMs) {
  // Seek the video
  await page.evaluate((ts) => {
    const v = document.querySelector('video');
    v.currentTime = ts;
    return new Promise((r) => v.addEventListener('seeked', r, { once: true }));
  }, seekTo);
  await page.evaluate(() => document.querySelector('video').play());
  await new Promise((r) => setTimeout(r, 500));

  // Set up toast listener before triggering extraction
  await page.evaluate(() => {
    window.__extractToasts = [];
    window.addEventListener('message', (e) => {
      if (
        e.data?.source === 'xbox-vgamepad-content-script' &&
        e.data?.type === 'SHOW_TOAST'
      ) {
        window.__extractToasts.push(e.data.text);
      }
    });
  });

  // Trigger START_FIND_SPRITES via postMessage (content script listens for this)
  await page.evaluate(() => {
    window.postMessage(
      { source: 'xbox-vgamepad-content-script', type: 'START_FIND_SPRITES' },
      '*'
    );
  });

  // Let the real extraction pipeline run
  await new Promise((r) => setTimeout(r, durationMs));

  // Stop extraction by blurring the window
  await page.evaluate(() => {
    window.dispatchEvent(new Event('blur'));
  });
  await new Promise((r) => setTimeout(r, 2000));

  // Collect results
  const toasts = await page.evaluate(() => window.__extractToasts || []);

  // Check for errors in console (already captured if needed)
  const errors = [];

  return { toasts, errors };
}

/**
 * Validate sprite output quality. Returns array of { name, pass, detail } objects.
 */
function validateSprites(sprites) {
  const checks = [];

  // Labels are concise (not hallucinated / prompt leak)
  const tooLong = sprites.filter((s) => s.label.length > 60);
  checks.push({
    name: 'labels are concise (<=60 chars)',
    pass: tooLong.length === 0,
    detail:
      tooLong.length > 0
        ? `"${tooLong[0].label}" is ${tooLong[0].label.length} chars`
        : '',
  });

  // Labels don't echo the prompt
  const promptLeak = sprites.filter(
    (s) =>
      s.label.includes('Reply ONLY') ||
      s.label.includes('JSON') ||
      s.label.includes('game element')
  );
  checks.push({
    name: 'labels are not prompt text',
    pass: promptLeak.length === 0,
    detail: promptLeak.length > 0 ? `"${promptLeak[0].label}"` : '',
  });

  // Labels contain at least 2 consecutive letters (not just numbers/symbols)
  const nonDescriptive = sprites.filter((s) => !/[a-zA-Z]{2,}/.test(s.label));
  checks.push({
    name: 'labels are descriptive (contain words)',
    pass: nonDescriptive.length === 0,
    detail: nonDescriptive.length > 0 ? `"${nonDescriptive[0].label}"` : '',
  });

  // Dimensions diversity (if >=3 sprites, not all identical dimensions)
  if (sprites.length >= 3) {
    const uniqueDims = new Set(sprites.map((s) => `${s.w}x${s.h}`));
    checks.push({
      name: 'sprite dimensions are diverse',
      pass: uniqueDims.size >= 2,
      detail: `all ${sprites.length} sprites are ${sprites[0].w}x${sprites[0].h}`,
    });
  }

  return checks;
}

module.exports = {
  DIST_DIR,
  PORT,
  startServer,
  launchBrowser,
  setupPage,
  runRealExtraction,
  validateSprites,
};
