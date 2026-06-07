/**
 * Smoke test: verifies Chrome Prompt API (LanguageModel) works in the
 * extension's isolated world content script context.
 *
 * Requires:
 * - Chrome Canary with Gemini Nano model downloaded
 * - Extension built: vite build --mode test
 *
 * Usage: npm run test:extract:smoke
 */
const path = require('path');
const puppeteer = require('puppeteer-core');
const http = require('http');

const DIST_DIR = path.join(__dirname, '..', '..', 'build-test');
const PROFILE_DIR = path.join(__dirname, 'profile');
const CHROME =
  process.env.CHROME_PATH ||
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary';
const PORT = 9444;

let server;

function startServer() {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body><button id="btn">click</button></body></html>');
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
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
    await page.click('#btn');

    console.log('Chrome Prompt API smoke test (isolated world)\n');

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

    if (!isolatedContextId) return;

    await assert('LanguageModel global exists', async () => {
      const result = await cdp.send('Runtime.evaluate', {
        expression: 'typeof LanguageModel',
        contextId: isolatedContextId,
      });
      if (result.result.value === 'undefined')
        throw new Error('LanguageModel is undefined');
    });

    await assert('availability() is downloadable or available', async () => {
      const result = await cdp.send('Runtime.evaluate', {
        expression: `(async () => {
          try {
            const avail = await LanguageModel.availability({
              expectedInputs: [{ type: 'image' }, { type: 'text', languages: ['en'] }],
              expectedOutputs: [{ type: 'text', languages: ['en'] }],
            });
            return JSON.stringify({ available: avail });
          } catch (e) {
            return JSON.stringify({ error: e.message });
          }
        })()`,
        contextId: isolatedContextId,
        awaitPromise: true,
      });
      const parsed = JSON.parse(result.result.value);
      if (parsed.error) throw new Error(parsed.error);
      console.log(`      status: "${parsed.available}"`);
      if (parsed.available === 'unavailable')
        throw new Error(
          'Model unavailable — ensure Gemini Nano is downloaded in Chrome Canary'
        );
    });

    await assert('can create session and prompt', async () => {
      const result = await cdp.send('Runtime.evaluate', {
        expression: `(async () => {
          try {
            const t0 = performance.now();
            const session = await LanguageModel.create({
              expectedInputs: [{ type: 'image' }, { type: 'text', languages: ['en'] }],
              expectedOutputs: [{ type: 'text', languages: ['en'] }],
            });
            const t1 = performance.now();
            const response = await session.prompt(
              'Describe a red circle sprite from a 2D game in exactly one sentence.'
            );
            const t2 = performance.now();
            session.destroy();
            return JSON.stringify({
              response,
              createMs: Math.round(t1 - t0),
              promptMs: Math.round(t2 - t1),
            });
          } catch (e) {
            return JSON.stringify({ error: e.message });
          }
        })()`,
        contextId: isolatedContextId,
        awaitPromise: true,
        timeout: 120000,
      });
      const parsed = JSON.parse(result.result.value);
      if (parsed.error) throw new Error(parsed.error);
      console.log(
        `      create: ${parsed.createMs}ms, prompt: ${parsed.promptMs}ms`
      );
      console.log(`      response: "${parsed.response}"`);
    });
  } finally {
    await browser.close();
    server.close();
    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

run();
