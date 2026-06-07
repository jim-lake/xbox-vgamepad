/**
 * Smoke test: validates that Chrome Canary injects the extension's content script.
 *
 * Uses --enable-unsafe-extension-debugging + browser-level CDP Extensions.loadUnpacked.
 *
 * Usage: node test/extract/canary-inject-smoke.cjs
 */
'use strict';

const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');
const http = require('http');

const DIST_DIR = path.resolve(path.join(__dirname, '..', '..', 'build-test'));
const FRESH_PROFILE = path.join(__dirname, 'profile-smoke-test');
const CHROME =
  process.env.CHROME_PATH ||
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary';
const PORT = 9444;

let server;

async function run() {
  fs.rmSync(FRESH_PROFILE, { recursive: true, force: true });

  server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html><body><h1>inject test</h1></body></html>');
  });
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: CHROME,
    ignoreDefaultArgs: true,
    protocolTimeout: 30000,
    args: [
      '--remote-debugging-port=0',
      `--user-data-dir=${FRESH_PROFILE}`,
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

  try {
    // Use browser-level CDP session for Extensions domain
    const session = await browser.target().createCDPSession();
    const loadResult = await session.send('Extensions.loadUnpacked', {
      path: DIST_DIR,
    });
    console.log(`✓ Extension loaded: ${loadResult.id}`);

    // Wait for service worker
    await new Promise((r) => setTimeout(r, 2000));

    // Navigate to test page
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
    await new Promise((r) => setTimeout(r, 3000));

    // Check execution contexts
    const cdp = await page.createCDPSession();
    const contexts = [];
    cdp.on('Runtime.executionContextCreated', (event) =>
      contexts.push(event.context)
    );
    await cdp.send('Runtime.enable');
    await new Promise((r) => setTimeout(r, 2000));

    console.log('\nExecution contexts:');
    for (const c of contexts) {
      const type = c.auxData?.type || 'main';
      console.log(`  [${type}] origin=${c.origin} name="${c.name}"`);
      if (c.auxData?.type === 'isolated' && !c.name.includes('__puppeteer')) {
        const r = await cdp.send('Runtime.evaluate', {
          expression: `JSON.stringify({ chromeRuntime: typeof chrome?.runtime?.sendMessage })`,
          contextId: c.id,
        });
        console.log(`    APIs: ${r.result.value}`);
      }
    }

    const extContext = contexts.find(
      (c) =>
        c.auxData?.type === 'isolated' &&
        c.origin !== '' &&
        !c.name.includes('__puppeteer_utility_world__')
    );

    if (extContext) {
      console.log('\n✓ Extension content script context FOUND');
    } else {
      console.log('\n✗ Extension content script context NOT FOUND');
    }
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch((e) => {
  console.error(e);
  if (server) server.close();
  process.exit(1);
});
