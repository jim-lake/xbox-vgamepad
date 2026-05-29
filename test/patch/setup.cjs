/**
 * Manual testing setup for the co-op patch.
 *
 * Builds the extension in test mode, launches Chrome with the extension loaded
 * and a 2-controller profile pre-seeded, then navigates to xbox.com/play.
 *
 * Usage: npm run test:patch:setup
 */

'use strict';

const puppeteer = require('puppeteer-core');
const path = require('path');

const PROFILE_DIR = path.join(__dirname, 'profile');
const DIST_DIR = path.join(__dirname, '..', '..', 'build-test');
const CHROME_PATH =
  process.env.CHROME_PATH || require('puppeteer').executablePath();
const XBOX_PLAY_URL = 'https://www.xbox.com/en-US/play';

const TWO_CONTROLLER_CONFIG = {
  keyboardConfig: {
    KeyW: [{ type: 'action', gamepadIndex: 0, action: 'leftStickUp' }],
    KeyA: [{ type: 'action', gamepadIndex: 0, action: 'leftStickLeft' }],
    KeyS: [{ type: 'action', gamepadIndex: 0, action: 'leftStickDown' }],
    KeyD: [{ type: 'action', gamepadIndex: 0, action: 'leftStickRight' }],
    Space: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
    KeyE: [{ type: 'action', gamepadIndex: 0, action: 'b' }],
    ArrowUp: [{ type: 'action', gamepadIndex: 1, action: 'leftStickUp' }],
    ArrowLeft: [{ type: 'action', gamepadIndex: 1, action: 'leftStickLeft' }],
    ArrowDown: [{ type: 'action', gamepadIndex: 1, action: 'leftStickDown' }],
    ArrowRight: [{ type: 'action', gamepadIndex: 1, action: 'leftStickRight' }],
    KeyU: [{ type: 'action', gamepadIndex: 1, action: 'a' }],
    KeyI: [{ type: 'action', gamepadIndex: 1, action: 'b' }],
    KeyO: [{ type: 'action', gamepadIndex: 1, action: 'start' }],
  },
  mouseConfig: { mouseControls: [] },
};

async function run() {
  console.log('Launching Chrome with extension and 2-controller profile...');
  console.log('  Chrome:', CHROME_PATH);
  console.log('  Extension:', DIST_DIR);
  console.log('  Profile:', PROFILE_DIR);

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: CHROME_PATH,
    userDataDir: PROFILE_DIR,
    args: [
      `--disable-extensions-except=${DIST_DIR}`,
      `--load-extension=${DIST_DIR}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-session-crashed-bubble',
    ],
  });

  // Seed 2-controller config via extension storage
  const targets = browser.targets();
  let swTarget;
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    swTarget = browser
      .targets()
      .find(
        (t) =>
          t.type() === 'service_worker' &&
          t.url().includes('chrome-extension://')
      );
    if (swTarget) break;
    await new Promise((r) => setTimeout(r, 200));
  }

  if (swTarget) {
    const worker = await swTarget.worker();
    await worker.evaluate((config) => {
      return new Promise((resolve) =>
        chrome.storage.sync.set(
          {
            ENABLED: true,
            ACTIVE_GP_CONF: 'coop-2p',
            'GP_CONF:coop-2p': config,
            GLOBAL_SETTINGS: { patchRemoteMultigamepad: true },
          },
          resolve
        )
      );
    }, TWO_CONTROLLER_CONFIG);
    console.log('  ✓ 2-controller config seeded');
  } else {
    console.warn('  ⚠ Could not find service worker to seed config');
  }

  // Navigate to xbox.com/play
  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());
  await page.goto(XBOX_PLAY_URL, {
    waitUntil: 'networkidle2',
    timeout: 30_000,
  });
  console.log('  ✓ Navigated to', XBOX_PLAY_URL);
  console.log('\nBrowser is ready for manual testing. Close it when done.');

  // Keep process alive until browser closes
  browser.on('disconnected', () => process.exit(0));
}

run().catch((err) => {
  console.error('Setup failed:', err.message);
  process.exitCode = 1;
});
