/**
 * Generic span extraction test runner.
 * Usage: node run-span.cjs <name> <startSec> [durationMs]
 *
 * Examples:
 *   node run-span.cjs early 5 55000
 *   node run-span.cjs quarter 120
 */
'use strict';

const {
  startServer,
  launchBrowser,
  setupPage,
  runRealExtraction,
  clearSpritesDB,
  loadSpritesFromExtension,
  saveResultsToDisk,
} = require('./shared.cjs');

const args = process.argv.slice(2);
const SPAN_NAME = args[0] || 'span';
const SPAN_START = parseInt(args[1] || '5', 10);
const SPAN_DURATION = parseInt(args[2] || '55000', 10);

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
    const { page, cdp, contextId } = await setupPage(browser);
    const label =
      SPAN_START < 60 ? `${SPAN_START}s` : `${Math.floor(SPAN_START / 60)}min`;
    console.log(
      `Sprite extraction — ${SPAN_NAME.toUpperCase()} span (${label}, real extension)\n`
    );

    assert('extension content script injected', !!contextId);
    if (!contextId) {
      process.exit(1);
      return;
    }

    console.log(
      `  Running extraction at ${SPAN_START}s for ${SPAN_DURATION / 1000}s...`
    );
    await clearSpritesDB(browser);
    const { toasts, candidates } = await runRealExtraction(
      page,
      SPAN_START,
      SPAN_DURATION
    );

    console.log(`  Toasts: ${toasts.length}, Candidates: ${candidates.length}`);
    toasts.forEach((t) => console.log(`    "${t}"`));

    // Load sprites from IndexedDB via service worker
    const sprites = await loadSpritesFromExtension(
      browser,
      contextId,
      'Test Game'
    );

    // Save results to disk
    const dir = saveResultsToDisk({
      sprites,
      candidates,
      testName: SPAN_NAME,
    });
    console.log(`  Results saved → ${dir}`);
    console.log(`    candidates: ${candidates.length}, sprites: ${sprites.length}`);

    assert(
      'extraction started',
      toasts.some((t) => t.includes('Finding sprites'))
    );

    assert(
      'candidates were found',
      candidates.length > 0,
      'no candidates extracted from video'
    );

    const foundToasts = toasts.filter((t) => t.startsWith('Found:'));
    assert(
      'AI verified sprites',
      foundToasts.length > 0,
      `extraction ran but no sprites found in ${SPAN_NAME} span`
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
