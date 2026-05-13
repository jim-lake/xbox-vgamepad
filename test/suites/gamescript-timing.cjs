// Tests: GameScript timing accuracy under main-world busy-loop interference.
//
// A periodic busy loop in the page blocks the JS thread, causing setTimeout
// callbacks to fire late. The naive script runner accumulates this latency
// (drift). The improved runner uses absolute timestamps so each delay
// compensates for prior overruns, keeping long-term timing accurate.
//
// Old behavior (naive setTimeout): each ~20ms busy-loop overrun accumulates.
// With a 20ms busy loop every 100ms over 1000ms, cumulative drift ≈ ~200ms.
// The last press would be ~200ms behind schedule while the first is only ~20ms
// behind — drift grows linearly with iteration count.
//
// New behavior (absolute-timestamp scheduling): any overrun on one step is
// subtracted from the next delay. Long-term drift is bounded to roughly one
// busy-loop hit (~20ms), regardless of how many iterations run.
module.exports = async function ({
  page,
  assert,
  expect,
  helpers,
  releaseAll,
}) {
  const { sendConfigToPage } = helpers;

  await releaseAll(page);

  // Script: N iterations of press(A) / 100ms delay / release(A) / 100ms delay.
  // Total expected duration: N * 200ms.
  function timedTurboConfig(count) {
    return {
      mouseConfig: { mouseControls: [] },
      keyboardConfig: {
        KeyT: [
          {
            type: 'script',
            activationType: 'on_down',
            actions: [
              {
                type: 'loop',
                count,
                actions: [
                  {
                    type: 'down',
                    buttons: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
                  },
                  { type: 'delay', durationMs: 100 },
                  {
                    type: 'up',
                    buttons: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
                  },
                  { type: 'delay', durationMs: 100 },
                ],
              },
            ],
          },
        ],
      },
    };
  }

  // Run the timed script and return wall-clock offsets (ms since script start)
  // at which each button-A press rising edge was observed.
  async function measurePressTimes(iterations) {
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'timing-test',
      gamepadConfig: timedTurboConfig(iterations),
    });
    await new Promise((r) => setTimeout(r, 200));

    await page.evaluate(() => {
      window.__pressTimestamps = [];
      window.__lastPressed = false;
    });

    const pollHandle = await page.evaluateHandle(() => {
      const id = setInterval(() => {
        const el = document.getElementById('buttons');
        const data = el?.getAttribute('data-buttons');
        const pressed = data ? data.split(',')[0] === '1' : false;
        if (pressed && !window.__lastPressed) {
          window.__pressTimestamps.push(Date.now());
        }
        window.__lastPressed = pressed;
      }, 5);
      return id;
    });

    const startTime = await page.evaluate(() => {
      window.__scriptStart = Date.now();
      return window.__scriptStart;
    });

    await page.keyboard.down('t');
    await page.keyboard.up('t');

    await new Promise((r) => setTimeout(r, iterations * 200 + 500));

    await page.evaluate((id) => clearInterval(id), pollHandle);

    const timestamps = await page.evaluate(() => window.__pressTimestamps);
    return timestamps.map((t) => t - startTime);
  }

  // Install a periodic busy loop: runs every 100ms for ~20ms.
  await page.evaluate(() => {
    window.__busyLoopInterval = setInterval(() => {
      const end = Date.now() + 20;

      while (Date.now() < end) {}
    }, 100);
  });

  console.log('  [GameScript Timing - busy-loop drift]');

  await assert(
    'busy-loop delays individual actions but long-term timing does not drift',
    async () => {
      const iterations = 5;
      const offsets = await measurePressTimes(iterations);

      expect(offsets.length).toBe(iterations);

      // With absolute-timestamp scheduling, any overrun on one step is
      // subtracted from the next delay. The last press (ideal: 1000ms) should
      // be close to its scheduled time even though individual steps may be
      // delayed by the busy loop.
      //
      // Drift on the last press should be bounded to roughly one busy-loop hit
      // (~20ms), not the accumulated ~200ms of the naive approach.
      const drift5 = offsets[4] - 1000;
      expect(drift5).toBeLessThan(60);

      // Also verify that drift does NOT grow linearly: the difference between
      // last and first press drift should be small (< 30ms), not ~180ms.
      const drift1 = offsets[0] - 200;
      expect(drift5 - drift1).toBeLessThan(30);
    }
  );

  await page.evaluate(() => {
    clearInterval(window.__busyLoopInterval);
  });

  await releaseAll(page);
  await sendConfigToPage(page, {
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: 'default',
    gamepadConfig: { mouseConfig: { mouseControls: [] }, keyboardConfig: {} },
  });
  await new Promise((r) => setTimeout(r, 200));
};
