/**
 * Sprite extraction — MEGA TEST (12 samples, AI secondary verification).
 *
 * Usage: npm run test:extract:mega
 */
'use strict';

const {
  startServer,
  launchBrowser,
  setupPage,
  runRealExtraction,
  clearSpritesDB,
  loadSpritesFromExtension,
  aiVerifyLabels,
  saveResultsToDisk,
} = require('./shared.cjs');

const VIDEO_DURATION = 1210;
const NUM_SAMPLES = 12;
const SAMPLE_DURATION = 55000;

const TIMESTAMPS = Array.from({ length: NUM_SAMPLES }, (_, i) =>
  Math.round(5 + (i * (VIDEO_DURATION - 10)) / (NUM_SAMPLES - 1))
);

const PHASES = [
  { name: 'INTRO', range: [0, 120] },
  { name: 'EARLY', range: [120, 360] },
  { name: 'MID', range: [360, 720] },
  { name: 'LATE', range: [720, 1000] },
  { name: 'END', range: [1000, VIDEO_DURATION] },
];

function getPhase(ts) {
  return (
    PHASES.find((p) => ts >= p.range[0] && ts < p.range[1])?.name || 'UNKNOWN'
  );
}

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
    console.log('Sprite extraction — MEGA TEST (12 samples, full video)\n');
    console.log(
      `  ${NUM_SAMPLES} samples × ${SAMPLE_DURATION / 1000}s (~${Math.round((NUM_SAMPLES * SAMPLE_DURATION) / 60000)}min)\n`
    );

    assert('extension content script injected', !!contextId);
    if (!contextId) {
      process.exit(1);
      return;
    }

    const allToasts = [];
    const sampleResults = [];
    const cumulativeLabels = new Set();

    await clearSpritesDB(browser);

    for (let i = 0; i < TIMESTAMPS.length; i++) {
      const ts = TIMESTAMPS[i];
      const phase = getPhase(ts);
      const label = `${Math.floor(ts / 60)}m${(ts % 60).toString().padStart(2, '0')}s`;
      console.log(
        `\n  ── Sample ${i + 1}/${NUM_SAMPLES} at ${label} [${phase}] ──`
      );

      const { toasts } = await runRealExtraction(page, ts, SAMPLE_DURATION);
      const foundToasts = toasts.filter((t) => t.startsWith('Found:'));
      const labels = foundToasts.map((t) => t.replace('Found: ', '').trim());
      const newLabels = labels.filter((l) => !cumulativeLabels.has(l));

      labels.forEach((l) => cumulativeLabels.add(l));
      allToasts.push(...toasts);

      sampleResults.push({
        timestamp: ts,
        phase,
        spritesFound: foundToasts.length,
        labels,
        newLabels,
        started: toasts.some((t) => t.includes('Finding sprites')),
        stopped: toasts.some((t) => t.includes('stopped')),
      });

      console.log(
        `  Found: ${foundToasts.length} sprites (${newLabels.length} new)`
      );
      if (labels.length > 0) {
        console.log(`  Labels: ${labels.join(', ')}`);
      }
    }

    // Load all sprites from IndexedDB
    const sprites = await loadSpritesFromExtension(
      browser,
      contextId,
      'Test Game'
    );
    if (sprites.length > 0) {
      const dir = saveResultsToDisk({ sprites, candidates: [], testName: 'mega' });
      console.log(`\n  Sprites saved: ${sprites.length} → ${dir}`);
    }

    // === ASSERTIONS ===
    console.log(`\n  ═══ MEGA TEST VALIDATION ═══\n`);

    const uniqueLabels = [...cumulativeLabels];
    const phasesWithSprites = new Set(
      sampleResults.filter((s) => s.spritesFound > 0).map((s) => s.phase)
    );

    console.log(`  Total sprites in DB: ${sprites.length}`);
    console.log(`  Unique labels: ${uniqueLabels.length}`);
    console.log(
      `  Phases with sprites: ${[...phasesWithSprites].join(', ')}\n`
    );

    const startCount = sampleResults.filter((s) => s.started).length;
    assert(
      'pipeline started for all samples',
      startCount === NUM_SAMPLES,
      `${startCount}/${NUM_SAMPLES}`
    );

    const stopCount = sampleResults.filter((s) => s.stopped).length;
    assert(
      'pipeline stopped for all samples',
      stopCount === NUM_SAMPLES,
      `${stopCount}/${NUM_SAMPLES}`
    );

    assert(
      'found ≥3 sprites overall',
      sprites.length >= 3,
      `only ${sprites.length}`
    );

    assert(
      'sprites from ≥2 phases',
      phasesWithSprites.size >= 2,
      `only from: ${[...phasesWithSprites].join(', ')}`
    );

    const allLabels = sampleResults.flatMap((s) => s.labels);
    assert(
      'labels are meaningful',
      allLabels.every((l) => l.length > 1 && l !== 'noise')
    );
    assert(
      'labels are concise',
      allLabels.every((l) => l.length <= 60)
    );
    assert(
      'no prompt text in labels',
      allLabels.every((l) => !l.includes('Reply ONLY') && !l.includes('JSON'))
    );

    // AI secondary verification
    console.log('\n  ── AI SECONDARY VERIFICATION ──');
    if (uniqueLabels.length > 0 && contextId) {
      const { valid, invalid, error } = await aiVerifyLabels(
        cdp,
        contextId,
        uniqueLabels
      );
      if (error) {
        console.log(`  Skipped: ${error}`);
      } else {
        console.log(`  Valid: ${valid.join(', ') || '(none)'}`);
        if (invalid.length > 0) {
          console.log(`  Invalid: ${invalid.join(', ')}`);
        }
        assert(
          'AI confirms labels are game elements',
          invalid.length <= Math.ceil(uniqueLabels.length * 0.3),
          `${invalid.length}/${uniqueLabels.length} invalid`
        );
      }
    }
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
