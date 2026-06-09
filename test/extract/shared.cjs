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
  // Clear stale service worker cache so the fresh build's SW code is used
  const swCachePath = path.join(PROFILE_DIR, 'Default', 'Service Worker');
  if (fs.existsSync(swCachePath)) {
    fs.rmSync(swCachePath, { recursive: true, force: true });
  }

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
 * @param {number} durationMs - How long to let extraction run (used as videoEndTime = seekTo + durationMs/1000)
 * @returns {{ toasts: string[], candidates: object[], errors: string[] }}
 */
async function runRealExtraction(page, seekTo, durationMs) {
  const videoEndTime = seekTo + durationMs / 1000;

  // Set up toast and candidate listener before triggering extraction
  // Remove previous listener to avoid accumulating duplicates across samples
  await page.evaluate(() => {
    if (window.__extractListener) {
      window.removeEventListener('message', window.__extractListener);
    }
    window.__extractToasts = [];
    window.__extractCandidates = [];
    window.__extractDebug = [];
    window.__extractCandidatesDone = false;
    window.__extractAiIdle = false;
    window.__extractListener = (e) => {
      if (e.data?.source === 'xbox-vgamepad-content-script') {
        if (e.data.type === 'SHOW_TOAST') {
          window.__extractToasts.push(e.data.text);
        } else if (e.data.type === 'EXTRACT_CANDIDATES_DONE') {
          window.__extractCandidatesDone = true;
        } else if (e.data.type === 'EXTRACT_AI_IDLE') {
          window.__extractAiIdle = true;
        } else if (e.data.type === 'EXTRACT_DEBUG') {
          const entry = { phase: e.data.phase, meta: e.data.meta };
          if (e.data.buffer) {
            const bytes = new Uint8Array(e.data.buffer);
            let binary = '';
            for (let i = 0; i < bytes.length; i++)
              binary += String.fromCharCode(bytes[i]);
            entry.b64 = btoa(binary);
          }
          window.__extractDebug.push(entry);
          // Also populate __extractCandidates for backward compat
          if (e.data.phase === 'candidate') {
            window.__extractCandidates.push({
              rect: e.data.meta.rect,
              index: e.data.meta.index,
              frameNum: e.data.meta.frameNum,
              b64: entry.b64 || null,
            });
          }
        }
      }
    };
    window.addEventListener('message', window.__extractListener);
  });

  // Trigger START_FIND_SPRITES with video time bounds
  await page.evaluate(
    (start, end) => {
      window.postMessage(
        {
          source: 'xbox-vgamepad-content-script',
          type: 'START_FIND_SPRITES',
          videoStartTime: start,
          videoEndTime: end,
        },
        '*'
      );
    },
    seekTo,
    videoEndTime
  );

  // Wait for both EXTRACT_CANDIDATES_DONE and EXTRACT_AI_IDLE
  // Timeout: video duration + 25 minutes for AI processing
  const timeout = durationMs + 1500000;
  try {
    await page.waitForFunction(
      () => window.__extractCandidatesDone && window.__extractAiIdle,
      { timeout }
    );
  } catch (e) {
    const status = await page.evaluate(() => ({
      candidatesDone: window.__extractCandidatesDone,
      aiIdle: window.__extractAiIdle,
      toasts: window.__extractToasts,
      candidates: window.__extractCandidates?.length,
    }));
    console.log(
      '  waitForFunction timed out. Status:',
      JSON.stringify(status, null, 2)
    );
    throw e;
  }

  // Collect results
  const toasts = await page.evaluate(() => window.__extractToasts || []);
  const candidates = await page.evaluate(
    () => window.__extractCandidates || []
  );
  const debug = await page.evaluate(() => window.__extractDebug || []);

  return { toasts, candidates, debug, errors: [] };
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

/**
 * Use the extension's real LanguageModel to verify that extracted sprite labels
 * are coherent game elements (not hallucinated garbage). This is a secondary
 * AI validation pass using the SAME production AI pathway.
 *
 * @param {object} cdp - CDP session for the page
 * @param {number} contextId - Extension isolated world context ID
 * @param {string[]} labels - Sprite labels to verify
 * @returns {{ valid: string[], invalid: string[], error: string|null }}
 */
async function aiVerifyLabels(cdp, contextId, labels) {
  if (!labels.length) return { valid: [], invalid: [], error: null };

  const labelList = labels.slice(0, 10).join(', ');
  const result = await cdp.send('Runtime.evaluate', {
    expression: `(async () => {
      try {
        const session = await LanguageModel.create({
          expectedInputs: [{ type: 'text', languages: ['en'] }],
          expectedOutputs: [{ type: 'text', languages: ['en'] }],
        });
        const response = await session.prompt(
          'I have these labels from a game sprite extractor: [${labelList.replace(/'/g, "\\'")}]. ' +
          'For each label, reply ONLY with JSON: {"results":[{"label":"...","valid":true/false}]}. ' +
          'Mark valid=true if the label sounds like a real game element (HUD, character, item, effect). ' +
          'Mark valid=false if it sounds like garbage, prompt text, or nonsense.'
        );
        session.destroy();
        return JSON.stringify({ response });
      } catch (e) {
        return JSON.stringify({ error: e.message });
      }
    })()`,
    contextId,
    awaitPromise: true,
    timeout: 120000,
  });

  try {
    const parsed = JSON.parse(result.result.value);
    if (parsed.error) return { valid: [], invalid: [], error: parsed.error };

    const match = parsed.response.match(
      /\{[^{}]*"results"\s*:\s*\[[^\]]*\][^{}]*\}/s
    );
    if (!match) return { valid: labels, invalid: [], error: null }; // If can't parse, assume valid

    const data = JSON.parse(match[0]);
    const valid = [];
    const invalid = [];
    for (const r of data.results || []) {
      if (r.valid) valid.push(r.label);
      else invalid.push(r.label);
    }
    return { valid, invalid, error: null };
  } catch {
    // If AI response isn't parseable, don't fail — just note it
    return { valid: labels, invalid: [], error: null };
  }
}

/**
 * Clear all sprites from the extension's IndexedDB.
 * @param {object} browser - Puppeteer browser instance
 */
async function clearSpritesDB(browser) {
  const swTarget = await browser
    .waitForTarget(
      (t) =>
        t.type() === 'service_worker' && t.url().includes('service-worker'),
      { timeout: 5000 }
    )
    .catch(() => null);
  if (!swTarget) return;

  const cdpSW = await swTarget.createCDPSession();
  await cdpSW.send('Runtime.enable');
  await cdpSW.send('Runtime.evaluate', {
    expression: `(async () => {
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open('xvg-sprites', 1);
        req.onupgradeneeded = () => {
          const d = req.result;
          if (!d.objectStoreNames.contains('sprites')) d.createObjectStore('sprites');
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      await new Promise((resolve, reject) => {
        const tx = db.transaction('sprites', 'readwrite');
        tx.objectStore('sprites').clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    })()`,
    awaitPromise: true,
    timeout: 5000,
  });
  await cdpSW.detach();
}

/**
 * Load sprites from the extension's IndexedDB by evaluating in the service worker.
 * The service worker has the xvg-sprites DB in the extension's origin.
 * @param {object} browser - Puppeteer browser instance
 * @param {string} game - Game name
 * @returns {Array<{label: string, w: number, h: number, png: number[]}>}
 */
async function loadSpritesFromExtension(browser, contextId, game) {
  // Wake the service worker — it may have been killed during the wait.
  // Send a dummy message from the content script's isolated world via CDP.
  const pages = await browser.pages();
  const page = pages.find((p) => p.url().includes('127.0.0.1'));
  if (page && contextId) {
    const cdpPage = await page.createCDPSession();
    await cdpPage.send('Runtime.enable');
    await cdpPage
      .send('Runtime.evaluate', {
        expression: `chrome.runtime.sendMessage({ type: '__ping' }).catch(() => {})`,
        contextId,
        awaitPromise: true,
        timeout: 3000,
      })
      .catch(() => {});
    await cdpPage.detach();
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Find the service worker target
  const swTarget = await browser
    .waitForTarget(
      (t) =>
        t.type() === 'service_worker' && t.url().includes('service-worker'),
      { timeout: 5000 }
    )
    .catch(() => null);
  if (!swTarget) return [];

  const cdpSW = await swTarget.createCDPSession();
  await cdpSW.send('Runtime.enable');

  const result = await cdpSW.send('Runtime.evaluate', {
    expression: `(async () => {
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open('xvg-sprites', 1);
        req.onupgradeneeded = () => {
          const d = req.result;
          if (!d.objectStoreNames.contains('sprites')) d.createObjectStore('sprites');
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const all = await new Promise((resolve, reject) => {
        const tx = db.transaction('sprites', 'readonly');
        const store = tx.objectStore('sprites');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      db.close();
      const game = ${JSON.stringify(game)};
      const filtered = all.filter(r => r.game === game);
      return JSON.stringify(filtered.map(s => {
        const bytes = new Uint8Array(s.buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        return { label: s.spriteType, w: s.w, h: s.h, b64: btoa(binary) };
      }));
    })()`,
    awaitPromise: true,
    timeout: 10000,
  });

  await cdpSW.detach();

  try {
    const items = JSON.parse(result.result.value);
    return items.map((s) => ({
      label: s.label,
      w: s.w,
      h: s.h,
      png: [...Buffer.from(s.b64, 'base64')],
    }));
  } catch {
    return [];
  }
}

/**
 * Save extraction results (sprites + candidates + debug) to a single timestamped directory.
 * Structure:
 *   /tmp/extract-{testName}-{ts}/sprites/
 *   /tmp/extract-{testName}-{ts}/candidates/
 *   /tmp/extract-{testName}-{ts}/debug/{phase}/
 *
 * @param {object} opts
 * @param {Array<{label: string, w: number, h: number, png: number[]}>} opts.sprites
 * @param {Array<{rect: {x:number,y:number,w:number,h:number}, index: number, frameNum: number, b64: string|null}>} opts.candidates
 * @param {Array<{phase: string, meta: object, b64?: string}>} opts.debug
 * @param {string} opts.testName
 * @returns {string} Root directory path
 */
function saveResultsToDisk({ sprites, candidates, debug, testName }) {
  const root = `/tmp/extract-${testName}-${Date.now()}`;

  if (sprites && sprites.length > 0) {
    const dir = path.join(root, 'sprites');
    fs.mkdirSync(dir, { recursive: true });
    for (const sprite of sprites) {
      const safeName = sprite.label.replace(/[^a-z0-9_-]/gi, '_');
      fs.writeFileSync(
        path.join(dir, `${safeName}_${sprite.w}x${sprite.h}.png`),
        Buffer.from(sprite.png)
      );
    }
  }

  if (candidates && candidates.length > 0) {
    const dir = path.join(root, 'candidates');
    fs.mkdirSync(dir, { recursive: true });
    for (const c of candidates) {
      if (c.b64) {
        fs.writeFileSync(
          path.join(
            dir,
            `candidate_${c.index}_f${c.frameNum}_${c.rect.w}x${c.rect.h}.png`
          ),
          Buffer.from(c.b64, 'base64')
        );
      }
    }
    const manifest = candidates.map((c) => ({
      index: c.index,
      frameNum: c.frameNum,
      x: c.rect.x,
      y: c.rect.y,
      w: c.rect.w,
      h: c.rect.h,
    }));
    fs.writeFileSync(
      path.join(dir, 'candidates.json'),
      JSON.stringify(manifest, null, 2)
    );
  }

  if (debug && debug.length > 0) {
    const debugDir = path.join(root, 'debug');
    fs.mkdirSync(debugDir, { recursive: true });

    // Group by phase, write images + metadata per entry
    const phaseCounters = {};
    for (const entry of debug) {
      const phase = entry.phase;
      phaseCounters[phase] = (phaseCounters[phase] || 0) + 1;
      const idx = phaseCounters[phase];
      const phaseDir = path.join(debugDir, phase);
      fs.mkdirSync(phaseDir, { recursive: true });

      if (entry.b64) {
        fs.writeFileSync(
          path.join(phaseDir, `${idx}.png`),
          Buffer.from(entry.b64, 'base64')
        );
      }
      fs.writeFileSync(
        path.join(phaseDir, `${idx}.json`),
        JSON.stringify(entry.meta, null, 2)
      );
    }
  }

  return root;
}

module.exports = {
  DIST_DIR,
  PORT,
  startServer,
  launchBrowser,
  setupPage,
  runRealExtraction,
  clearSpritesDB,
  loadSpritesFromExtension,
  validateSprites,
  aiVerifyLabels,
  saveResultsToDisk,
};
