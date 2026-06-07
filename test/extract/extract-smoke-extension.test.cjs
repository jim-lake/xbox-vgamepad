/**
 * Smoke test: verifies the extension loads via CDP AND that the extension's
 * pure JS image ops are available (VERIFY_OPENCV message returns success).
 *
 * Requires:
 * - Chrome Canary with flags enabled
 * - Extension built: vite build --mode test
 *
 * Usage: npm run test:extract:smoke-extension
 */
'use strict';

const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');
const http = require('http');

const DIST_DIR = path.resolve(path.join(__dirname, '..', '..', 'build-test'));
const PROFILE_DIR = path.join(__dirname, 'profile');
const CHROME =
  process.env.CHROME_PATH ||
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary';
const PORT = 9444;

let server;

function startServer() {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      // Serve extension assets so dynamic import() resolves from page origin
      const assetPath = path.join(DIST_DIR, req.url);
      if (fs.existsSync(assetPath) && fs.statSync(assetPath).isFile()) {
        const ext = path.extname(assetPath);
        const types = {
          '.js': 'application/javascript',
          '.wasm': 'application/wasm',
          '.map': 'application/json',
        };
        res.writeHead(200, {
          'Content-Type': types[ext] || 'application/octet-stream',
        });
        fs.createReadStream(assetPath).pipe(res);
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(
        '<html><head><title>Test Game | Xbox Cloud Gaming</title></head><body><button id="btn">click</button></body></html>'
      );
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

  let passed = 0;
  let failed = 0;

  async function assert(name, fn) {
    try {
      await fn();
      passed++;
      console.log(`  ✓ ${name}`);
    } catch (err) {
      failed++;
      console.log(`  ✗ ${name}`);
      console.log(`    ${err.message}`);
    }
  }

  try {
    // Load extension via CDP
    const browserSession = await browser.target().createCDPSession();
    const loadResult = await browserSession.send('Extensions.loadUnpacked', {
      path: DIST_DIR,
    });

    console.log('Extension + image ops smoke test\n');
    console.log(`  Extension loaded: ${loadResult.id}`);

    await new Promise((r) => setTimeout(r, 2000));

    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
    await new Promise((r) => setTimeout(r, 3000));

    const cdp = await page.createCDPSession();
    const contexts = [];
    cdp.on('Runtime.executionContextCreated', (event) => {
      contexts.push(event.context);
    });
    await cdp.send('Runtime.enable');
    await new Promise((r) => setTimeout(r, 2000));

    // Find the extension's isolated world
    const extContext = contexts.find(
      (c) =>
        c.auxData?.type === 'isolated' &&
        c.origin !== '' &&
        !c.name.includes('__puppeteer_utility_world__')
    );

    await assert('extension content script context found', async () => {
      if (!extContext)
        throw new Error(
          'No extension isolated context — extension did not inject'
        );
    });

    if (!extContext) return;

    await assert('chrome.runtime available in content script', async () => {
      const result = await cdp.send('Runtime.evaluate', {
        expression: 'typeof chrome?.runtime?.sendMessage',
        contextId: extContext.id,
      });
      if (result.result.value !== 'function')
        throw new Error(`chrome.runtime.sendMessage is ${result.result.value}`);
    });

    await assert(
      'VERIFY_OPENCV message succeeds (pure JS image ops)',
      async () => {
        const result = await page.evaluate(() => {
          return new Promise((resolve) => {
            const handler = (e) => {
              if (
                e.data?.source === 'xbox-vgamepad-content-script' &&
                e.data?.type === 'VERIFY_OPENCV_RESULT'
              ) {
                window.removeEventListener('message', handler);
                resolve(e.data);
              }
            };
            window.addEventListener('message', handler);
            window.postMessage(
              { source: 'xbox-vgamepad-content-script', type: 'VERIFY_OPENCV' },
              '*'
            );
            setTimeout(
              () => resolve({ success: false, error: 'timeout' }),
              5000
            );
          });
        });
        if (!result.success) {
          throw new Error(
            `Image ops verification failed: ${result.error || 'unknown'}`
          );
        }
      }
    );
  } finally {
    await browser.close();
    server.close();
    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

run();
