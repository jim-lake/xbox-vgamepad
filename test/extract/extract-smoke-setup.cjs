/**
 * Setup for the extract smoke test. Loads extension via CDP, leaves browser open.
 * Usage: npm run test:extract:smoke:setup
 */
'use strict';

const puppeteer = require('puppeteer-core');
const path = require('path');

const DIST_DIR = path.resolve(path.join(__dirname, '..', '..', 'build-test'));
const PROFILE_DIR = path.join(__dirname, 'profile');
const CHROME =
  process.env.CHROME_PATH ||
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary';

async function run() {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: CHROME,
    ignoreDefaultArgs: true,
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

  const browserSession = await browser.target().createCDPSession();
  const loadResult = await browserSession.send('Extensions.loadUnpacked', {
    path: DIST_DIR,
  });
  console.log(`Extension loaded: ${loadResult.id}`);
  console.log(
    'Chrome Canary running with extension + Prompt API. Ctrl+C to close.'
  );
  await new Promise(() => {});
}

run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
