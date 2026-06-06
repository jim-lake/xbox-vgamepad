/**
 * Setup for the extract integration test. Builds, starts server, launches browser.
 * Leaves browser open for manual testing.
 * Usage: npm run test:extract:setup
 */
'use strict';

const path = require('path');
const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');

const DIST_DIR = path.join(__dirname, '..', '..', 'build-test');
const PROFILE_DIR = path.join(__dirname, 'profile');
const MEDIA_DIR = path.join(__dirname, '..', '..', 'test_media');
const CHROME =
  process.env.CHROME_PATH ||
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary';
const PORT = 9444;

let server;

function startServer() {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      if (req.url === '/test_media/test.mp4') {
        const filePath = path.join(MEDIA_DIR, 'test.mp4');
        const stat = fs.statSync(filePath);
        res.writeHead(200, {
          'Content-Type': 'video/mp4',
          'Content-Length': stat.size,
        });
        fs.createReadStream(filePath).pipe(res);
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
      res.writeHead(404);
      res.end('Not found');
    });
    server.listen(PORT, '127.0.0.1', () => resolve());
  });
}

async function run() {
  await startServer();
  console.log(`Server running on http://127.0.0.1:${PORT}/`);

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
      `http://127.0.0.1:${PORT}/`,
    ],
  });

  console.log('Chrome Canary running with extension. Ctrl+C to close.');
  await new Promise(() => {});
}

run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
