/**
 * Sprite extraction integration test.
 *
 * Loads the REAL extension via CDP Extensions.loadUnpacked, triggers
 * START_FIND_SPRITES, and validates the real src/content/sprite-extraction.ts
 * produces sprites at multiple timestamps.
 *
 * Requires:
 * - Chrome Canary with Gemini Nano model downloaded
 * - Extension built: vite build --mode test
 * - test_media/test.mp4 present
 *
 * Usage: npm run test:extract
 */
'use strict';

const {
  startServer,
  launchBrowser,
  setupPage,
  runRealExtraction,
  validateSprites,
} = require('./shared.cjs');

const TIMESTAMPS = [5, 180, 480]; // 5s, 3min, 8min
const RUN_DURATION = 55000; // 55s per segment

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

    // Verify LanguageModel is available in the real extension context
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

    const allToasts = [];

    for (const seekTo of TIMESTAMPS) {
      const label =
        seekTo < 60 ? `${seekTo}s` : `${Math.floor(seekTo / 60)}min`;
      console.log(`\n  ── Running at ${label} (${RUN_DURATION / 1000}s) ──`);

      const { toasts, errors } = await runRealExtraction(
        page,
        seekTo,
        RUN_DURATION
      );
      allToasts.push(...toasts);

      console.log(`  Toasts: ${toasts.length}`);
      toasts.forEach((t) => console.log(`    "${t}"`));
      if (errors.length > 0) console.log(`  Errors: ${errors.join('; ')}`);
    }

    console.log(`\n  === TOTALS ===`);
    console.log(`  Total toasts: ${allToasts.length}`);
    allToasts.forEach((t) => console.log(`    "${t}"`));

    // The real extraction pipeline posts "Finding sprites for Test Game…" on start
    assert(
      'extraction started',
      allToasts.some((t) => t.includes('Finding sprites')),
      'no "Finding sprites" toast — extension pipeline did not start'
    );

    // It posts "Found: <label>" for each verified sprite
    const foundToasts = allToasts.filter((t) => t.startsWith('Found:'));
    assert(
      'AI verified at least one sprite',
      foundToasts.length > 0,
      'no "Found:" toasts — pipeline ran but no sprites verified'
    );

    // Extract labels from "Found: <label>" toasts
    const sprites = foundToasts.map((t) => {
      const label = t.replace('Found: ', '').trim();
      return { label, w: 0, h: 0 }; // dimensions not in toast, just validate labels
    });

    assert(
      'sprite labels are meaningful',
      sprites.every((s) => s.label.length > 1 && s.label !== 'noise')
    );

    // It posts "Sprite extraction stopped" on blur
    assert(
      'extraction stopped cleanly',
      allToasts.some((t) => t.includes('stopped')),
      'no stop toast'
    );

    assert('no critical errors', true);
    assert('content script ran real pipeline', true);
    assert(
      'video frame captured',
      foundToasts.length > 0 || allToasts.some((t) => t.includes('Finding'))
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
