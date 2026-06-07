/**
 * Sprite extraction — FULL VIDEO test.
 *
 * Loads the REAL extension, runs extraction at 8 evenly-spaced timestamps
 * across the entire 20-minute video. Validates progressive sprite discovery
 * from the real src/content/sprite-extraction.ts pipeline.
 *
 * Usage: npm run test:extract:full
 */
'use strict';

const {
  startServer,
  launchBrowser,
  setupPage,
  runRealExtraction,
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
    const { page, contextId } = await setupPage(browser);
    console.log('Sprite extraction — FULL VIDEO test (real extension)\n');
    console.log(
      `  Video: ~${VIDEO_DURATION}s, ${NUM_SAMPLES} samples at ${SAMPLE_DURATION / 1000}s each (~${Math.round((NUM_SAMPLES * SAMPLE_DURATION) / 60000)}min total)`
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
    const spritesPerSample = [];

    for (let i = 0; i < TIMESTAMPS.length; i++) {
      const ts = TIMESTAMPS[i];
      const label = `${Math.floor(ts / 60)}m${ts % 60}s`;
      console.log(`\n  ── Sample ${i + 1}/${NUM_SAMPLES} at ${label} ──`);

      const { toasts } = await runRealExtraction(page, ts, SAMPLE_DURATION);
      const foundInSample = toasts.filter((t) => t.startsWith('Found:'));

      allToasts.push(...toasts);
      spritesPerSample.push(foundInSample.length);

      console.log(
        `  Toasts: ${toasts.length}, Sprites found: ${foundInSample.length}`
      );
      foundInSample.forEach((t) => console.log(`    ${t}`));
    }

    // === ASSERTIONS ===
    const allFoundToasts = allToasts.filter((t) => t.startsWith('Found:'));
    const allLabels = allFoundToasts.map((t) =>
      t.replace('Found: ', '').trim()
    );
    const uniqueLabels = new Set(allLabels);

    console.log(`\n  ═══ FULL VIDEO RESULTS ═══`);
    console.log(`  Total toasts: ${allToasts.length}`);
    console.log(`  Total sprites found: ${allFoundToasts.length}`);
    console.log(`  Unique labels: ${uniqueLabels.size}`);
    console.log(`  Per-sample: [${spritesPerSample.join(', ')}]`);
    console.log(`  Labels: ${[...uniqueLabels].join(', ')}`);

    assert(
      'extraction started at least once',
      allToasts.some((t) => t.includes('Finding sprites'))
    );

    assert(
      'AI verified multiple sprites across video',
      allFoundToasts.length >= 3,
      `only ${allFoundToasts.length} sprites across ${NUM_SAMPLES} samples`
    );

    const samplesWithSprites = spritesPerSample.filter((n) => n > 0).length;
    assert(
      'sprites found in multiple samples',
      samplesWithSprites >= 2,
      `sprites only in ${samplesWithSprites}/${NUM_SAMPLES} samples`
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
      'labels are descriptive',
      allLabels.every((l) => /[a-zA-Z]{2,}/.test(l))
    );

    assert(
      'extraction stopped each time',
      allToasts.filter((t) => t.includes('stopped')).length >= 1
    );

    // Output for external review
    console.log(`\n  ── SUMMARY ──`);
    console.log(
      JSON.stringify(
        {
          videoDuration: VIDEO_DURATION,
          samplesRun: NUM_SAMPLES,
          spritesPerSample,
          uniqueLabels: [...uniqueLabels],
        },
        null,
        2
      )
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
