const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const HTML_FILE = path.join(__dirname, 'gamepad-manual.html');
const PORT = 9333;

// Patch manifest to allow localhost
const manifestPath = path.join(DIST_DIR, 'manifest.json');
const originalManifest = fs.readFileSync(manifestPath, 'utf8');
const manifest = JSON.parse(originalManifest);
manifest.content_scripts[0].matches.push(`http://127.0.0.1:${PORT}/*`);
manifest.web_accessible_resources[0].matches.push(`http://127.0.0.1:${PORT}/*`);
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(fs.readFileSync(HTML_FILE, 'utf8'));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('\n🎮 Manual Gamepad Tester');
  console.log('========================\n');
  console.log(`1. Launch Chrome/Chromium with the extension loaded:\n`);
  console.log(
    `   chromium --load-extension=${DIST_DIR} http://127.0.0.1:${PORT}/\n`
  );
  console.log(`2. Or if the extension is already installed, open:\n`);
  console.log(`   http://127.0.0.1:${PORT}/\n`);
  console.log(
    '3. Press keyboard keys to see virtual gamepad buttons light up.'
  );
  console.log(
    '   Move the mouse (after clicking the page) to see analog stick movement.\n'
  );
  console.log('Press Ctrl+C to stop.\n');
});

function cleanup() {
  fs.writeFileSync(manifestPath, originalManifest);
  process.exit();
}
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
