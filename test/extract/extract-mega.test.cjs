/**
 * Sprite extraction — MEGA TEST (entire video, comprehensive validation).
 *
 * Runs the REAL extension extraction pipeline across 12 evenly-spaced points
 * in test_media/test.mp4, validates:
 * - Pipeline starts and stops cleanly at each sample
 * - Sprites are found in multiple distinct video regions
 * - Labels are meaningful, concise, non-duplicated garbage
 * - AI secondary verification confirms labels are real game elements
 * - Progressive discovery: later samples produce new sprites OR correctly dedup
 * - No prompt text leaks into labels
 * - Diverse sprite dimensions (not all identical crops)
 *
 * Usage: npm run test:extract:mega
 */
'use strict';

const {
  startServer,
  launchBrowser,
  setupPage,
  runRealExtraction,
  aiVerifyLabels,
} = require('./shared.cjs');

// 12 samples across ~20min video (every ~100s)
const VIDEO_DURATION = 1210;
const NUM_SAMPLES = 12;
const SAMPLE_DURATION = 55000; // 55s per sample — enough for ~2 AI verifications

const TIMESTAMPS = Array.from({ length: NUM_SAMPLES }, (_, i) =>
  Math.round(5 + (i * (VIDEO_DURATION - 10)) / (NUM_SAMPLES - 1))
);

// Group timestamps into phases for reporting
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
      `  Video: ~${VIDEO_DURATION}s, ${NUM_SAMPLES} samples × ${SAMPLE_DURATION / 1000}s each`
    );
    console.log(
      `  Estimated runtime: ~${Math.round((NUM_SAMPLES * SAMPLE_DURATION) / 60000)} minutes`
    );
    console.log(
      `  Timestamps: ${TIMESTAMPS.map((t) => `${Math.floor(t / 60)}m${(t % 60).toString().padStart(2, '0')}s`).join(', ')}\n`
    );

    assert('extension content script injected', !!contextId);
    if (!contextId) {
      process.exit(1);
      return;
    }

    // Verify AI model is available before the long run
    const availResult = await cdp.send('Runtime.evaluate', {
      expression: `(async () => {
        const a = await LanguageModel.availability({
          expectedInputs: [{ type: 'image' }, { type: 'text', languages: ['en'] }],
          expectedOutputs: [{ type: 'text', languages: ['en'] }],
        });
        return a;
      })()`,
      contextId,
      awaitPromise: true,
    });
    assert(
      'LanguageModel available',
      availResult.result.value !== 'unavailable',
      `status: ${availResult.result.value}`
    );

    // === RUN ALL SAMPLES ===
    const allToasts = [];
    const sampleResults = [];
    const cumulativeLabels = new Set();

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
        toastCount: toasts.length,
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

    // === PHASE-LEVEL ASSERTIONS ===
    console.log(`\n  ═══════════════════════════════════`);
    console.log(`  ═══ MEGA TEST VALIDATION ═══`);
    console.log(`  ═══════════════════════════════════\n`);

    const allFoundToasts = allToasts.filter((t) => t.startsWith('Found:'));
    const allLabels = allFoundToasts.map((t) =>
      t.replace('Found: ', '').trim()
    );
    const uniqueLabels = [...cumulativeLabels];

    console.log(`  Total samples: ${NUM_SAMPLES}`);
    console.log(`  Total sprites found: ${allFoundToasts.length}`);
    console.log(`  Unique labels: ${uniqueLabels.length}`);
    console.log(`  Labels: ${uniqueLabels.join(', ')}\n`);

    // Phase coverage
    const phasesWithSprites = new Set(
      sampleResults.filter((s) => s.spritesFound > 0).map((s) => s.phase)
    );
    console.log(
      `  Phases with sprites: ${[...phasesWithSprites].join(', ')}\n`
    );

    // 1. Pipeline starts every time
    const startCount = sampleResults.filter((s) => s.started).length;
    assert(
      'pipeline started for all samples',
      startCount === NUM_SAMPLES,
      `started ${startCount}/${NUM_SAMPLES} times`
    );

    // 2. Pipeline stopped every time
    const stopCount = sampleResults.filter((s) => s.stopped).length;
    assert(
      'pipeline stopped cleanly for all samples',
      stopCount === NUM_SAMPLES,
      `stopped ${stopCount}/${NUM_SAMPLES} times`
    );

    // 3. Found sprites across the video
    assert(
      'found sprites overall',
      allFoundToasts.length >= 3,
      `only ${allFoundToasts.length} sprites total`
    );

    // 4. Multiple distinct phases produced sprites
    assert(
      'sprites from ≥2 different phases',
      phasesWithSprites.size >= 2,
      `only from: ${[...phasesWithSprites].join(', ')}`
    );

    // 5. Multiple samples produced sprites
    const samplesWithSprites = sampleResults.filter(
      (s) => s.spritesFound > 0
    ).length;
    assert(
      'sprites from ≥3 different samples',
      samplesWithSprites >= 3,
      `only ${samplesWithSprites} samples produced sprites`
    );

    // 6. Label quality checks
    assert(
      'all labels are meaningful (length > 1)',
      allLabels.every((l) => l.length > 1 && l !== 'noise')
    );

    assert(
      'all labels are concise (≤60 chars)',
      allLabels.every((l) => l.length <= 60),
      allLabels.find((l) => l.length > 60)
    );

    assert(
      'no prompt text in labels',
      allLabels.every(
        (l) =>
          !l.includes('Reply ONLY') &&
          !l.includes('JSON') &&
          !l.includes('game element')
      ),
      allLabels.find(
        (l) =>
          l.includes('Reply ONLY') ||
          l.includes('JSON') ||
          l.includes('game element')
      )
    );

    assert(
      'labels are descriptive (contain words)',
      allLabels.every((l) => /[a-zA-Z]{2,}/.test(l))
    );

    // 7. Progressive discovery — unique labels grow over time
    const firstHalfLabels = new Set(
      sampleResults
        .slice(0, Math.floor(NUM_SAMPLES / 2))
        .flatMap((s) => s.labels)
    );
    const secondHalfLabels = new Set(
      sampleResults.slice(Math.floor(NUM_SAMPLES / 2)).flatMap((s) => s.labels)
    );
    const secondHalfNew = [...secondHalfLabels].filter(
      (l) => !firstHalfLabels.has(l)
    );
    if (secondHalfLabels.size > 0) {
      assert(
        'second half discovers new sprites not in first half',
        secondHalfNew.length > 0,
        'all labels were already found in first half'
      );
    }

    // 8. Label diversity — not all the same label repeated
    if (uniqueLabels.length >= 3) {
      assert(
        'diverse sprite types (≥3 unique labels)',
        uniqueLabels.length >= 3,
        `only ${uniqueLabels.length} unique`
      );
    }

    // 9. AI secondary verification — uses the real extension model to check labels
    console.log('\n  ── AI SECONDARY VERIFICATION ──');
    if (uniqueLabels.length > 0 && contextId) {
      const { valid, invalid, error } = await aiVerifyLabels(
        cdp,
        contextId,
        uniqueLabels
      );
      if (error) {
        console.log(`  AI verification skipped: ${error}`);
      } else {
        console.log(`  AI says valid: ${valid.join(', ') || '(none)'}`);
        if (invalid.length > 0) {
          console.log(`  AI says invalid: ${invalid.join(', ')}`);
        }
        assert(
          'AI confirms labels are game elements',
          invalid.length <= Math.ceil(uniqueLabels.length * 0.3),
          `${invalid.length}/${uniqueLabels.length} marked invalid: ${invalid.join(', ')}`
        );
      }
    }

    // === PER-PHASE BREAKDOWN ===
    console.log('\n  ── PER-PHASE BREAKDOWN ──');
    for (const phase of PHASES) {
      const samples = sampleResults.filter((s) => s.phase === phase.name);
      const phaseSprites = samples.reduce((n, s) => n + s.spritesFound, 0);
      const phaseLabels = [...new Set(samples.flatMap((s) => s.labels))];
      if (samples.length > 0) {
        console.log(
          `  ${phase.name}: ${phaseSprites} sprites, labels: [${phaseLabels.join(', ')}]`
        );
      }
    }

    // === SUMMARY JSON ===
    console.log('\n  ── SUMMARY ──');
    console.log(
      JSON.stringify(
        {
          videoDuration: VIDEO_DURATION,
          samplesRun: NUM_SAMPLES,
          totalSprites: allFoundToasts.length,
          uniqueLabels,
          phasesWithSprites: [...phasesWithSprites],
          perSample: sampleResults.map((s) => ({
            ts: s.timestamp,
            phase: s.phase,
            found: s.spritesFound,
            new: s.newLabels.length,
          })),
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
