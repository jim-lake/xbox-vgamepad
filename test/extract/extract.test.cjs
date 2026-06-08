/**
 * Sprite extraction integration test — 3 timestamps (5s, 3min, 8min).
 *
 * Usage: npm run test:extract
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

const TIMESTAMPS = [5, 180, 480];
const RUN_DURATION = 55000;

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
    console.log('Sprite extraction integration test (real extension)\n');

    assert('extension content script injected', !!contextId);
    if (!contextId) {
      process.exit(1);
      return;
    }

    const allToasts = [];
    const allCandidates = [];
    const allDebug = [];

    await clearSpritesDB(browser);

    for (const seekTo of TIMESTAMPS) {
      const label =
        seekTo < 60 ? `${seekTo}s` : `${Math.floor(seekTo / 60)}min`;
      console.log(`\n  ── Running at ${label} (${RUN_DURATION / 1000}s) ──`);

      const { toasts, candidates, debug } = await runRealExtraction(
        page,
        seekTo,
        RUN_DURATION
      );
      allToasts.push(...toasts);
      allCandidates.push(...candidates);
      allDebug.push(...(debug || []));

      console.log(
        `  Toasts: ${toasts.length}, Candidates: ${candidates.length}`
      );
      toasts.forEach((t) => console.log(`    "${t}"`));
    }

    // Load all sprites from IndexedDB after all runs
    const sprites = await loadSpritesFromExtension(
      browser,
      contextId,
      'Test Game'
    );

    // Save results to disk
    const dir = saveResultsToDisk({
      sprites,
      candidates: allCandidates,
      debug: allDebug,
      testName: 'multi',
    });
    console.log(`\n  Results saved → ${dir}`);
    console.log(
      `    candidates: ${allCandidates.length}, sprites: ${sprites.length}`
    );

    assert(
      'extraction started',
      allToasts.some((t) => t.includes('Finding sprites'))
    );

    assert(
      'candidates were found',
      allCandidates.length > 0,
      'no candidates extracted from video'
    );

    const foundToasts = allToasts.filter((t) => t.startsWith('Found:'));
    assert(
      'AI verified at least one sprite',
      foundToasts.length > 0,
      'no "Found:" toasts'
    );

    const labels = foundToasts.map((t) => t.replace('Found: ', '').trim());
    assert(
      'labels are meaningful',
      labels.every((l) => l.length > 1 && l !== 'noise')
    );

    assert(
      'extraction stopped cleanly',
      allToasts.some((t) => t.includes('stopped'))
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
