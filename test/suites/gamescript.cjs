// Tests: GameScript execution — on_down, on_up, toggle, held, loop, turbo,
// additive button model across scripts and keyboard presses.
module.exports = async function ({
  page,
  assert,
  expect,
  helpers,
  releaseAll,
}) {
  const { getButtonStates, waitForButton, sendConfigToPage } = helpers;

  await releaseAll(page);

  // Helper: build a minimal config with a script on a key
  function scriptConfig(keyCode, script) {
    return {
      mouseConfig: { mouseControls: [] },
      keyboardConfig: { [keyCode]: [script] },
    };
  }

  // Helper: build a turbo script (press/delay/release loop)
  function turboScript(action, durationMs, activationType) {
    return {
      type: 'script',
      activationType,
      actions: [
        {
          type: 'loop',
          count: 'infinite',
          actions: [
            {
              type: 'down',
              buttons: [{ type: 'action', gamepadIndex: 0, action }],
            },
            { type: 'delay', durationMs },
            {
              type: 'up',
              buttons: [{ type: 'action', gamepadIndex: 0, action }],
            },
            { type: 'delay', durationMs },
          ],
        },
      ],
    };
  }

  // Helper: single press-delay-release script
  function tapScript(action, durationMs, activationType) {
    return {
      type: 'script',
      activationType,
      actions: [
        {
          type: 'down',
          buttons: [{ type: 'action', gamepadIndex: 0, action }],
        },
        { type: 'delay', durationMs },
        { type: 'up', buttons: [{ type: 'action', gamepadIndex: 0, action }] },
      ],
    };
  }

  console.log('  [GameScript - on_down tap]');

  await assert(
    'on_down: script fires on key down, button pressed then released',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'script-test',
        gamepadConfig: scriptConfig('KeyT', tapScript('a', 80, 'on_down')),
      });
      await new Promise((r) => setTimeout(r, 200));

      await page.keyboard.down('t');
      await waitForButton(page, 0, true);
      await page.keyboard.up('t');
      // Script should auto-release after delay
      await waitForButton(page, 0, false);
    }
  );

  console.log('  [GameScript - on_down restart]');

  await assert(
    'on_down: pressing key again cancels and restarts script',
    async () => {
      // Long tap so we can interrupt it
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'script-test',
        gamepadConfig: scriptConfig('KeyT', tapScript('a', 500, 'on_down')),
      });
      await new Promise((r) => setTimeout(r, 200));

      await page.keyboard.down('t');
      await waitForButton(page, 0, true);
      await page.keyboard.up('t');

      // Press again quickly — should cancel first script (releasing button) then restart
      await new Promise((r) => setTimeout(r, 30));
      await page.keyboard.down('t');
      // Button should still be pressed (restarted)
      await waitForButton(page, 0, true);
      await page.keyboard.up('t');
      // Script completes and releases
      await waitForButton(page, 0, false);
    }
  );

  console.log('  [GameScript - on_up]');

  await assert('on_up: script fires on key release', async () => {
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'script-test',
      gamepadConfig: scriptConfig('KeyT', tapScript('b', 80, 'on_up')),
    });
    await new Promise((r) => setTimeout(r, 200));

    await page.keyboard.down('t');
    // Button should NOT be pressed yet
    await new Promise((r) => setTimeout(r, 50));
    expect((await getButtonStates(page))[1]).toBeFalse();

    await page.keyboard.up('t');
    // Now script fires
    await waitForButton(page, 1, true);
    await waitForButton(page, 1, false);
  });

  console.log('  [GameScript - toggle]');

  await assert(
    'toggle: first key down starts, second key down cancels',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'script-test',
        gamepadConfig: scriptConfig('KeyT', turboScript('x', 50, 'toggle')),
      });
      await new Promise((r) => setTimeout(r, 200));

      // First press: start turbo
      await page.keyboard.down('t');
      await page.keyboard.up('t');
      await waitForButton(page, 2, true); // x button index = 2

      // Second press: cancel turbo
      await page.keyboard.down('t');
      await page.keyboard.up('t');
      await waitForButton(page, 2, false);

      // Confirm button stays released
      await new Promise((r) => setTimeout(r, 150));
      expect((await getButtonStates(page))[2]).toBeFalse();
    }
  );

  console.log('  [GameScript - held]');

  await assert(
    'held: script runs while key held, cancels on key up',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'script-test',
        gamepadConfig: scriptConfig('KeyT', turboScript('y', 40, 'held')),
      });
      await new Promise((r) => setTimeout(r, 200));

      await page.keyboard.down('t');
      await waitForButton(page, 3, true); // y button index = 3

      // Release key — script should cancel and button should release
      await page.keyboard.up('t');
      await waitForButton(page, 3, false);
    }
  );

  console.log('  [GameScript - turbo repeated presses]');

  await assert(
    'turbo (toggle): button toggles on/off repeatedly while active',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'script-test',
        gamepadConfig: scriptConfig('KeyT', turboScript('a', 60, 'toggle')),
      });
      await new Promise((r) => setTimeout(r, 200));

      // Start turbo
      await page.keyboard.down('t');
      await page.keyboard.up('t');

      // Wait for at least 2 full cycles (press + release)
      await waitForButton(page, 0, true);
      await waitForButton(page, 0, false);
      await waitForButton(page, 0, true);
      await waitForButton(page, 0, false);

      // Stop turbo
      await page.keyboard.down('t');
      await page.keyboard.up('t');
      await new Promise((r) => setTimeout(r, 150));
      expect((await getButtonStates(page))[0]).toBeFalse();
    }
  );

  console.log('  [GameScript - additive with keyboard]');

  await assert(
    'script "up" does not release button held by keyboard',
    async () => {
      // Key T runs a tap script on button A; Key A also presses button A directly
      const config = {
        mouseConfig: { mouseControls: [] },
        keyboardConfig: {
          KeyA: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
          KeyT: [tapScript('a', 80, 'on_down')],
        },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'script-test',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 200));

      // Hold KeyA (direct press) and also trigger script
      await page.keyboard.down('a');
      await waitForButton(page, 0, true);

      await page.keyboard.down('t');
      await page.keyboard.up('t');

      // Script's "up" fires after 80ms — but KeyA is still held, so button stays pressed
      await new Promise((r) => setTimeout(r, 150));
      expect((await getButtonStates(page))[0]).toBeTrue();

      // Release KeyA — now button should release
      await page.keyboard.up('a');
      await waitForButton(page, 0, false);
    }
  );

  console.log('  [GameScript - loop count]');

  await assert('loop with finite count executes exactly N times', async () => {
    // Script: loop 3 times, each iteration presses+releases button A with 30ms delay
    const script = {
      type: 'script',
      activationType: 'on_down',
      actions: [
        {
          type: 'loop',
          count: 3,
          actions: [
            {
              type: 'down',
              buttons: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
            },
            { type: 'delay', durationMs: 30 },
            {
              type: 'up',
              buttons: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
            },
            { type: 'delay', durationMs: 30 },
          ],
        },
      ],
    };
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'script-test',
      gamepadConfig: scriptConfig('KeyT', script),
    });
    await new Promise((r) => setTimeout(r, 200));

    await page.keyboard.down('t');
    await page.keyboard.up('t');

    // Wait for 3 cycles to complete (3 * 60ms = 180ms) plus buffer
    await waitForButton(page, 0, true);
    await waitForButton(page, 0, false);
    await waitForButton(page, 0, true);
    await waitForButton(page, 0, false);
    await waitForButton(page, 0, true);
    await waitForButton(page, 0, false);

    // After 3 loops, script ends — button stays released
    await new Promise((r) => setTimeout(r, 150));
    expect((await getButtonStates(page))[0]).toBeFalse();
  });
};
