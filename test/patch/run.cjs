/**
 * Co-op patch integration test.
 *
 * Validates that the co-op patch intercepts `onGamepadChanged` on a live xCloud
 * session. Requires a pre-authenticated Chrome profile (see README.md).
 *
 * Usage: npm run test:patch
 */

'use strict';

const puppeteer = require('puppeteer-core');
const path = require('path');

const PROFILE_DIR = path.join(__dirname, 'profile');
const DIST_DIR = path.join(__dirname, '..', '..', 'build-test');
const CHROME_PATH =
  process.env.CHROME_PATH || require('puppeteer').executablePath();
const XBOX_PLAY_URL =
  'https://www.xbox.com/en-US/play/launch/gang-beasts/BPQZT43FWD49';
const TIMEOUT = 90_000;

function timestamp() {
  return new Date().toISOString().slice(11, 23);
}

function info(...args) {
  console.log(`[${timestamp()}] INFO:`, ...args);
}

function error(...args) {
  console.error(`[${timestamp()}] ERROR:`, ...args);
}

async function run() {
  info('Starting co-op patch test');
  info('Chrome path:', CHROME_PATH);
  info('Profile dir:', PROFILE_DIR);
  info('Extension dir:', DIST_DIR);

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
      '--restore-last-session=false',
    ],
  });

  info('Browser launched');

  // Close any stale tabs from previous runs
  const existingPages = await browser.pages();
  for (const p of existingPages) {
    if (p.url() !== 'about:blank') {
      await p.close();
    }
  }

  const page = await browser.newPage();
  const logs = [];
  const allConsoleLogs = [];

  page.on('console', (msg) => {
    const text = msg.text();
    allConsoleLogs.push(text);
    if (text.includes('[COOP-PATCH]')) {
      logs.push(text);
      info('⚡ PATCH LOG:', text);
    }
  });

  page.on('pageerror', (err) => {
    error('Page error:', err.message);
  });

  info('Navigating to', XBOX_PLAY_URL);
  await page.goto(XBOX_PLAY_URL, {
    waitUntil: 'networkidle2',
    timeout: TIMEOUT,
  });
  info('Page loaded');

  // Wait for game-stream to appear (user may need to manually start a game)
  info('Waiting for #game-stream element (start a game if needed)...');
  try {
    await page.waitForSelector('#game-stream', { timeout: TIMEOUT });
  } catch {
    error('#game-stream not found within timeout.');
    error('Make sure you are logged in and a game is running.');
    info('Total console logs captured:', allConsoleLogs.length);
    info(
      'COOP-PATCH logs captured:',
      logs.length,
      logs.length > 0 ? logs : '(none)'
    );
    await page.close();
    await browser.close();
    process.exitCode = 1;
    return;
  }
  info('✓ Game stream detected');

  // Wait a moment for the extension to initialize
  info('Waiting 3s for extension initialization...');
  await new Promise((r) => setTimeout(r, 3000));

  // Check if the patch trap was installed
  const trapLogs = logs.filter((l) => l.includes('Trap installed'));
  if (trapLogs.length > 0) {
    info('✓ Patch trap was installed');
  } else {
    info('⚠ No trap installation log found yet (may appear later)');
  }

  // Exercise: activate a config that uses gamepad index 1
  info('Activating gamepad config with index 1...');
  await page.evaluate(() => {
    window.postMessage(
      {
        source: 'xbox-vgamepad-content-script',
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'coop-test',
        gamepadConfig: {
          keyboardConfig: {
            KeyA: [
              { type: 'action', gamepadIndex: 1, action: 'leftStickLeft' },
            ],
          },
          mouseConfig: { mouseControls: [] },
        },
      },
      '*'
    );
  });

  // Wait for patch logs indicating interception
  info('Waiting for patch interception logs (up to 20s)...');
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (
      logs.some((l) => l.includes('index=1') && l.includes('connected=true'))
    ) {
      break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  // Now disable to trigger disconnect
  info('Disabling gamepad to trigger disconnect...');
  await page.evaluate(() => {
    window.postMessage(
      { source: 'xbox-vgamepad-content-script', type: 'DISABLE_GAMEPAD' },
      '*'
    );
  });

  info('Waiting 3s for disconnect logs...');
  await new Promise((r) => setTimeout(r, 3000));

  // Assertions
  info('');
  info('=== RESULTS ===');
  info('Total COOP-PATCH logs:', logs.length);
  for (const l of logs) {
    info('  ', l);
  }

  const patchInstalled = logs.some((l) =>
    l.includes('Patching onGamepadChanged')
  );
  const connectLog = logs.some(
    (l) => l.includes('index=1') && l.includes('connected=true')
  );
  const disconnectLog = logs.some(
    (l) => l.includes('index=1') && l.includes('connected=false')
  );

  info('');
  if (patchInstalled || connectLog) {
    info('✓ Patch was applied to onGamepadChanged prototype');
  } else {
    error('✗ Patch was NOT applied (lt class not detected)');
    process.exitCode = 1;
  }

  if (connectLog) {
    info('✓ Patch intercepted gamepad 1 connect');
  } else {
    error('✗ No connect interception for index=1');
    process.exitCode = 1;
  }

  if (disconnectLog) {
    info('✓ Patch intercepted gamepad 1 disconnect');
  } else {
    error('✗ No disconnect interception for index=1');
    process.exitCode = 1;
  }

  info('');
  if (!process.exitCode) {
    info('🎉 All assertions passed!');
  } else {
    error('Some assertions failed. Review logs above.');
  }

  await page.close();
  await browser.close();
  info('Browser closed');
}

run().catch((err) => {
  error('Test crashed:', err.message);
  error(err.stack);
  process.exitCode = 1;
});
