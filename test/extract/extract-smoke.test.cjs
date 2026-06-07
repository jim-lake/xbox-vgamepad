/**
 * Smoke test: verifies the extension loads via CDP and the Chrome Prompt API
 * (LanguageModel) works in the extension's real content script context.
 *
 * Uses Extensions.loadUnpacked (the only working method in Canary 151+).
 *
 * Requires:
 * - Chrome Canary with Gemini Nano model downloaded
 * - Extension built: vite build --mode test
 *
 * Usage: npm run test:extract:smoke
 */
'use strict';

const path = require('path');
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

    console.log('Chrome Prompt API smoke test (real extension)\n');
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

    // Find the extension's isolated world (not puppeteer's utility world)
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

    await assert('LanguageModel global exists', async () => {
      const result = await cdp.send('Runtime.evaluate', {
        expression: 'typeof LanguageModel',
        contextId: extContext.id,
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
        contextId: extContext.id,
        awaitPromise: true,
      });
      const parsed = JSON.parse(result.result.value);
      if (parsed.error) throw new Error(parsed.error);
      console.log(`      status: "${parsed.available}"`);
      if (parsed.available === 'unavailable')
        throw new Error('Model unavailable — ensure Gemini Nano is downloaded');
    });

    await assert(
      'can create session and prompt in extension context',
      async () => {
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
          contextId: extContext.id,
          awaitPromise: true,
          timeout: 120000,
        });
        const parsed = JSON.parse(result.result.value);
        if (parsed.error) throw new Error(parsed.error);
        console.log(
          `      create: ${parsed.createMs}ms, prompt: ${parsed.promptMs}ms`
        );
        console.log(`      response: "${parsed.response}"`);
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
