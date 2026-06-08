/**
 * Sprite extraction — FULL VIDEO test (8 samples across 20min video).
 *
 * Usage: npm run test:extract:full
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

const VIDEO_DURATION = 1210;
const NUM_SAMPLES = 8;
const SAMPLE_DURATION = 55000;

const TIMESTAMPS = Array.from({ length: NUM_SAMPLES }, (_, i) =>
  Math.round(10 + (i * (VIDEO_DURATION - 20)) / (NUM_SAMPLES - 1))
);

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
    console.log('Sprite extraction — FULL VIDEO test (real extension)\n');
    console.log(
      `  ${NUM_SAMPLES} samples × ${SAMPLE_DURATION / 1000}s (~${Math.round((NUM_SAMPLES * SAMPLE_DURATION) / 60000)}min)`
    );
    console.log(
      `  Timestamps: ${TIMESTAMPS.map((t) => `${Math.floor(t / 60)}m${t % 60}s`).join(', ')}\n`
    );

    assert('extension content script injected', !!contextId);
    if (!contextId) {
      process.exit(1);
      return;
    }

    const allToasts = [];
    const allCandidates = [];
    const allDebug = [];
    const spritesPerSample = [];

    await clearSpritesDB(browser);

    for (let i = 0; i < TIMESTAMPS.length; i++) {
      const ts = TIMESTAMPS[i];
      const label = `${Math.floor(ts / 60)}m${ts % 60}s`;
      console.log(`\n  ── Sample ${i + 1}/${NUM_SAMPLES} at ${label} ──`);

      const { toasts, candidates, debug } = await runRealExtraction(
        page,
        ts,
        SAMPLE_DURATION
      );
      const foundInSample = toasts.filter((t) => t.startsWith('Found:'));
      allToasts.push(...toasts);
      allCandidates.push(...candidates);
      allDebug.push(...(debug || []));
      spritesPerSample.push(foundInSample.length);

      console.log(
        `  Toasts: ${toasts.length}, Candidates: ${candidates.length}, Sprites: ${foundInSample.length}`
      );
      foundInSample.forEach((t) => console.log(`    ${t}`));
    }

    // Load all sprites from IndexedDB
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
      testName: 'full',
    });
    console.log(`\n  Results saved → ${dir}`);
    console.log(
      `    candidates: ${allCandidates.length}, sprites: ${sprites.length}`
    );

    const allFoundToasts = allToasts.filter((t) => t.startsWith('Found:'));
    const allLabels = allFoundToasts.map((t) =>
      t.replace('Found: ', '').trim()
    );
    const uniqueLabels = [...new Set(allLabels)];

    console.log(`\n  Total sprites: ${allFoundToasts.length}`);
    console.log(`  Total candidates: ${allCandidates.length}`);
    console.log(`  Unique labels: ${uniqueLabels.length}`);
    console.log(`  Per-sample: [${spritesPerSample.join(', ')}]`);
    console.log(`  Labels: ${uniqueLabels.join(', ')}`);

    assert(
      'extraction started',
      allToasts.some((t) => t.includes('Finding sprites'))
    );
    assert(
      'candidates were found',
      allCandidates.length > 0,
      'no candidates extracted from video'
    );
    assert(
      'found ≥3 sprites across video',
      allFoundToasts.length >= 3,
      `only ${allFoundToasts.length}`
    );

    const samplesWithSprites = spritesPerSample.filter((n) => n > 0).length;
    assert(
      'sprites from ≥2 samples',
      samplesWithSprites >= 2,
      `only ${samplesWithSprites}/${NUM_SAMPLES}`
    );
    assert(
      'labels are meaningful',
      allLabels.every((l) => l.length > 1 && l !== 'noise')
    );
    assert(
      'labels are concise',
      allLabels.every((l) => l.length <= 60)
    );
    assert(
      'labels are not prompt text',
      allLabels.every((l) => !l.includes('Reply ONLY') && !l.includes('JSON'))
    );
    assert(
      'extraction stopped',
      allToasts.filter((t) => t.includes('stopped')).length >= 1
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
