/**
 * Setup for the extract smoke test. Leaves browser open.
 * Usage: npm run test:extract:smoke:setup
 */
'use strict';

const puppeteer = require('puppeteer-core');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', '..', 'build-test');
const PROFILE_DIR = path.join(__dirname, 'profile');
const CHROME = process.env.CHROME_PATH ||
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary';

async function run() {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: CHROME,
    ignoreDefaultArgs: true,
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

  console.log('Chrome Canary running with Prompt API. Ctrl+C to close.');
  await new Promise(() => {});
}

run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
