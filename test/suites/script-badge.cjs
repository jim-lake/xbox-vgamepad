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
                  buttons: [
                    { type: 'action', gamepadIndex: 0, action: 'a' },
                  ],
                },
                { type: 'delay', durationMs: 50 },
                {
                  type: 'up',
                  buttons: [
                    { type: 'action', gamepadIndex: 0, action: 'a' },
                  ],
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
                  buttons: [
                    { type: 'action', gamepadIndex: 0, action: 'b' },
                  ],
                },
                { type: 'delay', durationMs: 50 },
                {
                  type: 'up',
                  buttons: [
                    { type: 'action', gamepadIndex: 0, action: 'b' },
                  ],
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

  await assert(
    'starting one script sends count=1 to background',
    async () => {
      await page.keyboard.down('t');
      await page.keyboard.up('t');
      const counts = await waitForCount(1);
      const last = counts[counts.length - 1];
      expect(last).toBe(1);
    }
  );

  await assert(
    'toggling script off sends count=0 to background',
    async () => {
      await clearRecordedCounts();
      await page.keyboard.down('t');
      await page.keyboard.up('t');
      const counts = await waitForCount(0);
      const last = counts[counts.length - 1];
      expect(last).toBe(0);
    }
  );

  await assert(
    'starting two scripts sends count=2 to background',
    async () => {
      await clearRecordedCounts();
      await page.keyboard.down('t');
      await page.keyboard.up('t');
      await waitForCount(1);
      await page.keyboard.down('y');
      await page.keyboard.up('y');
      const counts = await waitForCount(2);
      const last = counts[counts.length - 1];
      expect(last).toBe(2);
    }
  );

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

  await assert(
    'stopping all scripts sends count=0 to background',
    async () => {
      await clearRecordedCounts();
      await page.keyboard.down('y');
      await page.keyboard.up('y');
      const counts = await waitForCount(0);
      const last = counts[counts.length - 1];
      expect(last).toBe(0);
    }
  );

  await assert(
    'config change cancels scripts and sends count=0',
    async () => {
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
    }
  );

  // Cleanup
  await releaseAll(page);
};
