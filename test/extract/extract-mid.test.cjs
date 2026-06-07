/**
 * Sprite extraction test — MIDDLE span (5min mark).
 * Tests real extension extraction during mid-game.
 *
 * Usage: npm run test:extract:mid
 */
'use strict';

const {
  startServer,
  launchBrowser,
  setupPage,
  runRealExtraction,
} = require('./shared.cjs');

const SPAN_START = 300;
const SPAN_DURATION = 55000;

async function run() {
  const server = await startServer();
  const browser = await launchBrowser();
  let passed = 0;
  let failed = 0;

  function assert(name, condition, detail) {
    if (condition) {
      passed++;
      console.log(`  ✓ ${name}`);
    } else {
      failed++;
      console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`);
    }
  }

  try {
    const { page, contextId } = await setupPage(browser);
    console.log('Sprite extraction — MIDDLE span (5min, real extension)\n');

    assert('extension content script injected', !!contextId);
    if (!contextId) {
      process.exit(1);
      return;
    }

    console.log(
      `  Running extraction at ${SPAN_START}s for ${SPAN_DURATION / 1000}s...`
    );
    const { toasts } = await runRealExtraction(page, SPAN_START, SPAN_DURATION);

    console.log(`  Toasts: ${toasts.length}`);
    toasts.forEach((t) => console.log(`    "${t}"`));

    assert(
      'extraction started',
      toasts.some((t) => t.includes('Finding sprites'))
    );

    const foundToasts = toasts.filter((t) => t.startsWith('Found:'));
    assert(
      'AI verified sprites',
      foundToasts.length > 0,
      `extraction ran but no sprites found in mid span`
    );

    const labels = foundToasts.map((t) => t.replace('Found: ', '').trim());
    assert(
      'labels are meaningful',
      labels.every((l) => l.length > 1 && l !== 'noise')
    );
    assert(
      'labels are concise',
      labels.every((l) => l.length <= 60)
    );
    assert(
      'labels are not prompt text',
      labels.every((l) => !l.includes('Reply ONLY') && !l.includes('JSON'))
    );

    assert(
      'extraction stopped',
      toasts.some((t) => t.includes('stopped'))
    );
  } finally {
    await browser.close();
    server.close();
    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
