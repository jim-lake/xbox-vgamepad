/**
 * Setup for the extract integration test. Builds, starts server, launches browser
 * with extension loaded via CDP. Leaves browser open for manual testing.
 * Usage: npm run test:extract:setup
 */
'use strict';

const path = require('path');
const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');

const DIST_DIR = path.resolve(path.join(__dirname, '..', '..', 'build-test'));
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
        const range = req.headers.range;
        if (range) {
          const parts = range.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${stat.size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': end - start + 1,
            'Content-Type': 'video/mp4',
          });
          fs.createReadStream(filePath, { start, end }).pipe(res);
        } else {
          res.writeHead(200, {
            'Content-Type': 'video/mp4',
            'Content-Length': stat.size,
          });
          fs.createReadStream(filePath).pipe(res);
        }
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

  await new Promise((r) => setTimeout(r, 2000));

  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });

  console.log('Chrome Canary running with extension. Ctrl+C to close.');
  await new Promise(() => {});
}

run().catch((e) => {
  console.error(e.message);
  if (server) server.close();
  process.exit(1);
});
