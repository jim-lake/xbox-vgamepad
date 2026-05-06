const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const EXERCISER_HTML = path.join(__dirname, 'gamepad-exerciser.html');
const DIST_DIR = path.join(__dirname, '..', 'dist');

let server;
let serverPort;

function startServer() {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(fs.readFileSync(EXERCISER_HTML, 'utf8'));
    });
    server.listen(0, '127.0.0.1', () => {
      serverPort = server.address().port;
      resolve(serverPort);
    });
  });
}

function stopServer() {
  if (server) server.close();
}

function patchManifest(port) {
  const manifestPath = path.join(DIST_DIR, 'manifest.json');
  const original = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(original);
  for (const script of manifest.content_scripts) {
    script.matches.push(`http://127.0.0.1:${port}/*`);
  }
  for (const entry of manifest.web_accessible_resources) {
    entry.matches.push(`http://127.0.0.1:${port}/*`);
  }
  // Add tabs permission so we can query tab IDs for messaging
  if (!manifest.permissions.includes('tabs')) {
    manifest.permissions.push('tabs');
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  return () => fs.writeFileSync(manifestPath, original);
}

async function launchBrowserWithExtension() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/chromium',
    args: [
      `--disable-extensions-except=${DIST_DIR}`,
      `--load-extension=${DIST_DIR}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${serverPort}/`, { waitUntil: 'load' });
  await page.waitForFunction(
    () => document.getElementById('status')?.textContent === 'connected',
    { timeout: 10000 }
  );
  return { browser, page };
}

async function getButtonStates(page) {
  return page.evaluate(() => {
    const el = document.getElementById('buttons');
    const data = el?.getAttribute('data-buttons');
    if (!data) return null;
    return data.split(',').map((v) => v === '1');
  });
}

async function getButtonValues(page) {
  return page.evaluate(() => {
    const el = document.getElementById('button-values');
    const data = el?.getAttribute('data-values');
    if (!data) return null;
    return data.split(',').map(Number);
  });
}

async function getAxesStates(page) {
  return page.evaluate(() => {
    const el = document.getElementById('axes');
    const data = el?.getAttribute('data-axes');
    if (!data) return null;
    return data.split(',').map(Number);
  });
}

async function getGamepadIdentity(page) {
  return page.evaluate(() => {
    const id = document
      .getElementById('gamepad-id')
      ?.getAttribute('data-value');
    const index = document
      .getElementById('gamepad-index')
      ?.getAttribute('data-value');
    const mapping = document
      .getElementById('gamepad-mapping')
      ?.getAttribute('data-value');
    const connected = document
      .getElementById('gamepad-connected')
      ?.getAttribute('data-value');
    return {
      id,
      index: index != null ? Number(index) : null,
      mapping,
      connected,
    };
  });
}

async function getButtonTouched(page) {
  return page.evaluate(() => {
    const el = document.getElementById('button-touched');
    const data = el?.getAttribute('data-touched');
    if (!data) return null;
    return data.split(',').map((v) => v === '1');
  });
}

async function getEventCounts(page) {
  return page.evaluate(() => {
    const el = document.getElementById('event-log');
    return {
      connectCount: Number(el?.getAttribute('data-connect-count') || '0'),
      disconnectCount: Number(el?.getAttribute('data-disconnect-count') || '0'),
    };
  });
}

async function getConnectionStatus(page) {
  return page.evaluate(() => document.getElementById('status')?.textContent);
}

async function waitForButton(page, buttonIndex, pressed, timeout = 3000) {
  const target = pressed ? '1' : '0';
  await page.waitForFunction(
    (idx, val) => {
      const el = document.getElementById('buttons');
      const data = el?.getAttribute('data-buttons');
      if (!data) return false;
      return data.split(',')[idx] === val;
    },
    { timeout },
    buttonIndex,
    target
  );
}

async function waitForAxis(
  page,
  axisIndex,
  comparator,
  threshold,
  timeout = 3000
) {
  await page.waitForFunction(
    (idx, cmp, thr) => {
      const el = document.getElementById('axes');
      const data = el?.getAttribute('data-axes');
      if (!data) return false;
      const val = parseFloat(data.split(',')[idx]);
      if (cmp === 'gt') return val > thr;
      if (cmp === 'lt') return val < thr;
      return Math.abs(val - thr) < 0.01;
    },
    { timeout },
    axisIndex,
    comparator,
    threshold
  );
}

async function waitForAxesCentered(page, timeout = 3000) {
  await page.waitForFunction(
    () => {
      const el = document.getElementById('axes');
      const data = el?.getAttribute('data-axes');
      if (!data) return false;
      return data.split(',').every((v) => Math.abs(parseFloat(v)) < 0.01);
    },
    { timeout }
  );
}

async function waitForStatus(page, status, timeout = 10000) {
  await page.waitForFunction(
    (s) => document.getElementById('status')?.textContent === s,
    { timeout },
    status
  );
}

/**
 * Gets the extension's background service worker target so we can
 * manipulate chrome.storage from the test.
 */
async function getExtensionId(browser) {
  // Find the extension's service worker target
  const targets = browser.targets();
  const swTarget = targets.find(
    (t) =>
      t.type() === 'service_worker' && t.url().includes('chrome-extension://')
  );
  if (!swTarget) throw new Error('Could not find extension service worker');
  const url = swTarget.url();
  // chrome-extension://<id>/background.js
  const match = url.match(/chrome-extension:\/\/([^/]+)/);
  if (!match) throw new Error('Could not parse extension ID from ' + url);
  return match[1];
}

/**
 * Sets chrome.storage.sync values via the extension's background page context.
 * This lets us change configs/enabled state from the test.
 */
async function setStorageSync(browser, data) {
  const targets = browser.targets();
  const swTarget = targets.find(
    (t) =>
      t.type() === 'service_worker' && t.url().includes('chrome-extension://')
  );
  if (!swTarget) throw new Error('Could not find extension service worker');
  const worker = await swTarget.worker();
  await worker.evaluate((d) => {
    return new Promise((resolve) => chrome.storage.sync.set(d, resolve));
  }, data);
}

async function getStorageSync(browser, keys) {
  const targets = browser.targets();
  const swTarget = targets.find(
    (t) =>
      t.type() === 'service_worker' && t.url().includes('chrome-extension://')
  );
  if (!swTarget) throw new Error('Could not find extension service worker');
  const worker = await swTarget.worker();
  return worker.evaluate((k) => {
    return new Promise((resolve) => chrome.storage.sync.get(k, resolve));
  }, keys);
}

/**
 * Sends a message to the injected script by posting directly into the page context.
 * This simulates what the content script does when relaying messages from the extension.
 */
async function sendConfigToPage(page, message) {
  await page.evaluate((msg) => {
    window.postMessage(
      { source: 'xbox-vgamepad-content-script', ...msg },
      '*'
    );
  }, message);
}

async function getTabId(browser, page) {
  const swTarget = await getServiceWorker(browser);
  const worker = await swTarget.worker();
  const tabId = await worker.evaluate(() => {
    return new Promise((resolve) => {
      chrome.tabs.query({}, (tabs) => {
        // Find the first non-extension tab
        const tab = tabs.find((t) => t.url && !t.url.startsWith('chrome'));
        resolve(tab ? tab.id : null);
      });
    });
  });
  if (tabId == null) throw new Error('Could not find test page tab');
  return tabId;
}

async function getServiceWorker(browser) {
  const targets = browser.targets();
  const swTarget = targets.find(
    (t) =>
      t.type() === 'service_worker' && t.url().includes('chrome-extension://')
  );
  if (!swTarget) throw new Error('Could not find extension service worker');
  return swTarget;
}

module.exports = {
  startServer,
  stopServer,
  patchManifest,
  launchBrowserWithExtension,
  getButtonStates,
  getButtonValues,
  getButtonTouched,
  getAxesStates,
  getGamepadIdentity,
  getConnectionStatus,
  getEventCounts,
  waitForButton,
  waitForAxis,
  waitForAxesCentered,
  waitForStatus,
  setStorageSync,
  getStorageSync,
  sendConfigToPage,
  getExtensionId,
  getTabId,
  serverPort: () => serverPort,
};
