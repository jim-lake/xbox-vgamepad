// Tests: Script count badge — verifies SCRIPT_COUNT messages reach the
// background service worker with correct counts. Badge text cannot be read
// back in headless Chrome, so we verify via the service worker directly.
module.exports = async function ({
  page,
  browser,
  assert,
  expect,
  helpers,
  releaseAll,
}) {
  const { sendConfigToPage, getServiceWorker } = helpers;

  await releaseAll(page);

  // Install a listener in the service worker that records SCRIPT_COUNT messages
  async function setupRecorder() {
    const swTarget = await getServiceWorker(browser);
    const worker = await swTarget.worker();
    await worker.evaluate(() => {
      globalThis.__scriptCounts = [];
      chrome.runtime.onMessage.addListener((msg) => {
        if (msg.type === 'SCRIPT_COUNT') {
          globalThis.__scriptCounts.push(msg.count);
        }
      });
    });
  }

  async function getRecordedCounts() {
    const swTarget = await getServiceWorker(browser);
    const worker = await swTarget.worker();
    return worker.evaluate(() => globalThis.__scriptCounts);
  }

  async function clearRecordedCounts() {
    const swTarget = await getServiceWorker(browser);
    const worker = await swTarget.worker();
    await worker.evaluate(() => {
      globalThis.__scriptCounts = [];
    });
  }

  async function waitForCount(expected, timeout = 3000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const counts = await getRecordedCounts();
      if (counts.length > 0 && counts[counts.length - 1] === expected) {
        return counts;
      }
      await new Promise((r) => setTimeout(r, 50));
    }
    return getRecordedCounts();
  }

  // Config with two toggle scripts on different keys
  const twoScriptConfig = {
    mouseConfig: { mouseControls: [] },
    keyboardConfig: {
      KeyT: [
        {
          type: 'script',
          activationType: 'toggle',
          actions: [
            {
              type: 'loop',
              count: 'infinite',
              actions: [
                {
                  type: 'down',
                  buttons: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
                },
                { type: 'delay', durationMs: 50 },
                {
                  type: 'up',
                  buttons: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
                },
                { type: 'delay', durationMs: 50 },
              ],
            },
          ],
        },
      ],
      KeyY: [
        {
          type: 'script',
          activationType: 'toggle',
          actions: [
            {
              type: 'loop',
              count: 'infinite',
              actions: [
                {
                  type: 'down',
                  buttons: [{ type: 'action', gamepadIndex: 0, action: 'b' }],
                },
                { type: 'delay', durationMs: 50 },
                {
                  type: 'up',
                  buttons: [{ type: 'action', gamepadIndex: 0, action: 'b' }],
                },
                { type: 'delay', durationMs: 50 },
              ],
            },
          ],
        },
      ],
    },
  };

  console.log('  [Script Badge]');

  await setupRecorder();

  await sendConfigToPage(page, {
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: 'badge-test',
    gamepadConfig: twoScriptConfig,
  });
  await new Promise((r) => setTimeout(r, 300));

  // The cancelAll during activate sends count=0
  await clearRecordedCounts();

  await assert('starting one script sends count=1 to background', async () => {
    await page.keyboard.down('t');
    await page.keyboard.up('t');
    const counts = await waitForCount(1);
    const last = counts[counts.length - 1];
    expect(last).toBe(1);
  });

  await assert('toggling script off sends count=0 to background', async () => {
    await clearRecordedCounts();
    await page.keyboard.down('t');
    await page.keyboard.up('t');
    const counts = await waitForCount(0);
    const last = counts[counts.length - 1];
    expect(last).toBe(0);
  });

  await assert('starting two scripts sends count=2 to background', async () => {
    await clearRecordedCounts();
    await page.keyboard.down('t');
    await page.keyboard.up('t');
    await waitForCount(1);
    await page.keyboard.down('y');
    await page.keyboard.up('y');
    const counts = await waitForCount(2);
    const last = counts[counts.length - 1];
    expect(last).toBe(2);
  });

  await assert(
    'stopping one of two scripts sends count=1 to background',
    async () => {
      await clearRecordedCounts();
      await page.keyboard.down('t');
      await page.keyboard.up('t');
      const counts = await waitForCount(1);
      const last = counts[counts.length - 1];
      expect(last).toBe(1);
    }
  );

  await assert('stopping all scripts sends count=0 to background', async () => {
    await clearRecordedCounts();
    await page.keyboard.down('y');
    await page.keyboard.up('y');
    const counts = await waitForCount(0);
    const last = counts[counts.length - 1];
    expect(last).toBe(0);
  });

  await assert('config change cancels scripts and sends count=0', async () => {
    // Start a script
    await page.keyboard.down('t');
    await page.keyboard.up('t');
    await waitForCount(1);
    await clearRecordedCounts();

    // Switch config — should cancel all scripts
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'badge-test-2',
      gamepadConfig: twoScriptConfig,
    });
    const counts = await waitForCount(0);
    const last = counts[counts.length - 1];
    expect(last).toBe(0);
  });

  // --- Finite script completion decrements badge ---

  // Config with a finite on_down script (press X, delay, release X)
  const finiteOnDownConfig = {
    mouseConfig: { mouseControls: [] },
    keyboardConfig: {
      KeyT: [
        {
          type: 'script',
          activationType: 'on_down',
          actions: [
            {
              type: 'down',
              buttons: [{ type: 'action', gamepadIndex: 0, action: 'x' }],
            },
            { type: 'delay', durationMs: 80 },
            {
              type: 'up',
              buttons: [{ type: 'action', gamepadIndex: 0, action: 'x' }],
            },
          ],
        },
      ],
    },
  };

  console.log('  [Script Badge - finite script completion]');

  await assert(
    'on_down finite script: badge decrements to 0 after script completes',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'badge-finite-test',
        gamepadConfig: finiteOnDownConfig,
      });
      await new Promise((r) => setTimeout(r, 300));
      await clearRecordedCounts();

      await page.keyboard.down('t');
      await page.keyboard.up('t');
      // Should go to 1 when started, then back to 0 when done
      const counts = await waitForCount(0, 3000);
      expect(counts.includes(1)).toBeTrue();
      const last = counts[counts.length - 1];
      expect(last).toBe(0);
    }
  );

  // Config with a finite on_up script
  const finiteOnUpConfig = {
    mouseConfig: { mouseControls: [] },
    keyboardConfig: {
      KeyT: [
        {
          type: 'script',
          activationType: 'on_up',
          actions: [
            {
              type: 'down',
              buttons: [{ type: 'action', gamepadIndex: 0, action: 'x' }],
            },
            { type: 'delay', durationMs: 80 },
            {
              type: 'up',
              buttons: [{ type: 'action', gamepadIndex: 0, action: 'x' }],
            },
          ],
        },
      ],
    },
  };

  await assert(
    'on_up finite script: badge decrements to 0 after script completes',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'badge-finite-up-test',
        gamepadConfig: finiteOnUpConfig,
      });
      await new Promise((r) => setTimeout(r, 300));
      await clearRecordedCounts();

      await page.keyboard.down('t');
      await page.keyboard.up('t');
      // on_up fires on key release — should go to 1 then back to 0
      const counts = await waitForCount(0, 3000);
      expect(counts.includes(1)).toBeTrue();
      const last = counts[counts.length - 1];
      expect(last).toBe(0);
    }
  );

  // Config with a finite toggle script
  const finiteToggleConfig = {
    mouseConfig: { mouseControls: [] },
    keyboardConfig: {
      KeyT: [
        {
          type: 'script',
          activationType: 'toggle',
          actions: [
            {
              type: 'down',
              buttons: [{ type: 'action', gamepadIndex: 0, action: 'x' }],
            },
            { type: 'delay', durationMs: 80 },
            {
              type: 'up',
              buttons: [{ type: 'action', gamepadIndex: 0, action: 'x' }],
            },
          ],
        },
      ],
    },
  };

  await assert(
    'toggle finite script: badge decrements to 0 after script completes',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'badge-finite-toggle-test',
        gamepadConfig: finiteToggleConfig,
      });
      await new Promise((r) => setTimeout(r, 300));
      await clearRecordedCounts();

      await page.keyboard.down('t');
      await page.keyboard.up('t');
      // Should go to 1 then back to 0 when done
      const counts = await waitForCount(0, 3000);
      expect(counts.includes(1)).toBeTrue();
      const last = counts[counts.length - 1];
      expect(last).toBe(0);
    }
  );

  await assert(
    'toggle finite script: can re-fire after natural completion',
    async () => {
      // Script already completed above — pressing again should start fresh
      await clearRecordedCounts();
      await page.keyboard.down('t');
      await page.keyboard.up('t');
      // Should go to 1 (restarted) then back to 0 (completed again)
      const counts = await waitForCount(0, 3000);
      expect(counts.includes(1)).toBeTrue();
      const last = counts[counts.length - 1];
      expect(last).toBe(0);
    }
  );

  // Config with a finite held script (longer delay so we can test key-up after completion)
  const finiteHeldConfig = {
    mouseConfig: { mouseControls: [] },
    keyboardConfig: {
      KeyT: [
        {
          type: 'script',
          activationType: 'held',
          actions: [
            {
              type: 'down',
              buttons: [{ type: 'action', gamepadIndex: 0, action: 'x' }],
            },
            { type: 'delay', durationMs: 80 },
            {
              type: 'up',
              buttons: [{ type: 'action', gamepadIndex: 0, action: 'x' }],
            },
          ],
        },
      ],
    },
  };

  await assert(
    'held finite script: badge decrements to 0 when script finishes while key held',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'badge-finite-held-test',
        gamepadConfig: finiteHeldConfig,
      });
      await new Promise((r) => setTimeout(r, 300));
      await clearRecordedCounts();

      // Hold key down — script starts and finishes while key is still held
      await page.keyboard.down('t');
      const counts = await waitForCount(0, 3000);
      expect(counts.includes(1)).toBeTrue();
      const last = counts[counts.length - 1];
      expect(last).toBe(0);

      // Release key after script already finished — should not error or change count
      await clearRecordedCounts();
      await page.keyboard.up('t');
      await new Promise((r) => setTimeout(r, 100));
      const afterRelease = await getRecordedCounts();
      // Count stays at 0 (the notifyCount from key-up is harmless)
      const finalCount =
        afterRelease.length > 0 ? afterRelease[afterRelease.length - 1] : 0;
      expect(finalCount).toBe(0);
    }
  );

  // Cleanup
  await releaseAll(page);
};
