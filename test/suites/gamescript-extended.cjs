// Tests: GameScript extended coverage — on_up restart, held restart, toggle
// multi-cycle, multiple scripts per key, axis actions in scripts, nested loops,
// cancel-mid-delay releases buttons, config-change cancels scripts, multi-pad
// scripts, and various edge/race conditions.
module.exports = async function ({
  page,
  assert,
  expect,
  helpers,
  releaseAll,
}) {
  const {
    getButtonStates,
    getAxesStates,
    waitForButton,
    waitForAxis,
    waitForAxesCentered,
    sendConfigToPage,
    getPadButtonStates,
    waitForPadButton,
  } = helpers;

  await releaseAll(page);

  function scriptConfig(keyCode, script) {
    return {
      mouseConfig: { mouseControls: [] },
      keyboardConfig: { [keyCode]: [script] },
    };
  }

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

  // ── on_up restart ─────────────────────────────────────────────────────────

  console.log('  [GameScript Extended - on_up restart]');

  await assert('on_up: second key-up cancels and restarts script', async () => {
    // Long tap so we can interrupt it
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'gs-ext',
      gamepadConfig: scriptConfig('KeyT', tapScript('a', 500, 'on_up')),
    });
    await new Promise((r) => setTimeout(r, 200));

    // First key-up: script starts, button pressed
    await page.keyboard.down('t');
    await page.keyboard.up('t');
    await waitForButton(page, 0, true);

    // Second key-up quickly: cancels first (releases button), restarts
    await page.keyboard.down('t');
    await page.keyboard.up('t');
    // Button should still be pressed (restarted)
    await waitForButton(page, 0, true);

    // Let script complete
    await waitForButton(page, 0, false);
  });

  // ── held restart ──────────────────────────────────────────────────────────

  console.log('  [GameScript Extended - held restart]');

  await assert(
    'held: second key-down cancels and restarts script',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'gs-ext',
        gamepadConfig: scriptConfig('KeyT', turboScript('b', 40, 'held')),
      });
      await new Promise((r) => setTimeout(r, 200));

      // First key-down: turbo starts
      await page.keyboard.down('t');
      await waitForButton(page, 1, true);
      await page.keyboard.up('t');
      await waitForButton(page, 1, false);

      // Second key-down: restarts turbo
      await page.keyboard.down('t');
      await waitForButton(page, 1, true);
      await page.keyboard.up('t');
      await waitForButton(page, 1, false);
    }
  );

  // ── toggle multi-cycle ────────────────────────────────────────────────────

  console.log('  [GameScript Extended - toggle multi-cycle]');

  await assert(
    'toggle: can start/stop multiple times in sequence',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'gs-ext',
        gamepadConfig: scriptConfig('KeyT', turboScript('x', 40, 'toggle')),
      });
      await new Promise((r) => setTimeout(r, 200));

      for (let cycle = 0; cycle < 3; cycle++) {
        // Start
        await page.keyboard.down('t');
        await page.keyboard.up('t');
        await waitForButton(page, 2, true);

        // Stop
        await page.keyboard.down('t');
        await page.keyboard.up('t');
        await waitForButton(page, 2, false);

        await new Promise((r) => setTimeout(r, 80));
        expect((await getButtonStates(page))[2]).toBeFalse();
      }
    }
  );

  // ── toggle: key-up does nothing ───────────────────────────────────────────

  console.log('  [GameScript Extended - toggle key-up no-op]');

  await assert('toggle: key-up does not affect running script', async () => {
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'gs-ext',
      gamepadConfig: scriptConfig('KeyT', turboScript('a', 40, 'toggle')),
    });
    await new Promise((r) => setTimeout(r, 200));

    // Start toggle
    await page.keyboard.down('t');
    await page.keyboard.up('t');
    await waitForButton(page, 0, true);

    // key-up already happened; script should still be running
    await new Promise((r) => setTimeout(r, 100));
    // Button should still cycle (turbo still running)
    await waitForButton(page, 0, false);
    await waitForButton(page, 0, true);

    // Stop
    await page.keyboard.down('t');
    await page.keyboard.up('t');
    await waitForButton(page, 0, false);
  });

  // ── multiple scripts on same key ──────────────────────────────────────────

  console.log('  [GameScript Extended - multiple scripts per key]');

  await assert('two scripts on same key both fire simultaneously', async () => {
    const config = {
      mouseConfig: { mouseControls: [] },
      keyboardConfig: {
        KeyT: [tapScript('a', 80, 'on_down'), tapScript('b', 80, 'on_down')],
      },
    };
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'gs-ext',
      gamepadConfig: config,
    });
    await new Promise((r) => setTimeout(r, 200));

    await page.keyboard.down('t');
    await waitForButton(page, 0, true);
    await waitForButton(page, 1, true);
    await page.keyboard.up('t');

    await waitForButton(page, 0, false);
    await waitForButton(page, 1, false);
  });

  // ── axis actions in scripts ───────────────────────────────────────────────

  console.log('  [GameScript Extended - axis actions in scripts]');

  await assert('script can press and release axis directions', async () => {
    const script = {
      type: 'script',
      activationType: 'on_down',
      actions: [
        {
          type: 'down',
          buttons: [{ type: 'action', gamepadIndex: 0, action: 'leftStickUp' }],
        },
        { type: 'delay', durationMs: 80 },
        {
          type: 'up',
          buttons: [{ type: 'action', gamepadIndex: 0, action: 'leftStickUp' }],
        },
      ],
    };
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'gs-ext',
      gamepadConfig: scriptConfig('KeyT', script),
    });
    await new Promise((r) => setTimeout(r, 200));

    await page.keyboard.down('t');
    await waitForAxis(page, 1, 'lt', -0.5);
    await page.keyboard.up('t');
    await waitForAxesCentered(page);
  });

  await assert(
    'script axis "up" does not release axis held by keyboard',
    async () => {
      const config = {
        mouseConfig: { mouseControls: [] },
        keyboardConfig: {
          KeyW: [{ type: 'action', gamepadIndex: 0, action: 'leftStickUp' }],
          KeyT: [tapScript('leftStickUp', 80, 'on_down')],
        },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'gs-ext',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 200));

      // Hold KeyW (direct axis press)
      await page.keyboard.down('w');
      await waitForAxis(page, 1, 'lt', -0.5);

      // Trigger script — it will press then release leftStickUp after 80ms
      await page.keyboard.down('t');
      await page.keyboard.up('t');

      // After script's "up" fires, KeyW is still held — axis must stay deflected
      await new Promise((r) => setTimeout(r, 150));
      const axes = await getAxesStates(page);
      expect(axes[1]).toBeCloseTo(-1, 0.05);

      await page.keyboard.up('w');
      await waitForAxesCentered(page);
    }
  );

  // ── nested loops ──────────────────────────────────────────────────────────

  console.log('  [GameScript Extended - nested loops]');

  await assert(
    'nested finite loop executes correct total iterations',
    async () => {
      // Outer loop 2x, inner loop 2x → 4 total presses of button A
      const script = {
        type: 'script',
        activationType: 'on_down',
        actions: [
          {
            type: 'loop',
            count: 2,
            actions: [
              {
                type: 'loop',
                count: 2,
                actions: [
                  {
                    type: 'down',
                    buttons: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
                  },
                  { type: 'delay', durationMs: 25 },
                  {
                    type: 'up',
                    buttons: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
                  },
                  { type: 'delay', durationMs: 25 },
                ],
              },
            ],
          },
        ],
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'gs-ext',
        gamepadConfig: scriptConfig('KeyT', script),
      });
      await new Promise((r) => setTimeout(r, 200));

      await page.keyboard.down('t');
      await page.keyboard.up('t');

      // 4 press/release cycles
      for (let i = 0; i < 4; i++) {
        await waitForButton(page, 0, true);
        await waitForButton(page, 0, false);
      }

      // Script done — button stays released
      await new Promise((r) => setTimeout(r, 100));
      expect((await getButtonStates(page))[0]).toBeFalse();
    }
  );

  // ── cancel mid-delay releases held buttons ────────────────────────────────

  console.log('  [GameScript Extended - cancel mid-delay]');

  // Config that keeps pad 0 active (so getGamepads()[0] stays valid) but has no scripts
  const noScriptConfig = {
    mouseConfig: { mouseControls: [] },
    keyboardConfig: {
      KeyU: [{ type: 'action', gamepadIndex: 0, action: 'b' }],
    },
  };

  await assert(
    'cancelling script mid-delay releases all held buttons',
    async () => {
      // Script: press A, long delay (500ms), release A
      const script = {
        type: 'script',
        activationType: 'on_down',
        actions: [
          {
            type: 'down',
            buttons: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
          },
          { type: 'delay', durationMs: 500 },
          {
            type: 'up',
            buttons: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
          },
        ],
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'gs-ext',
        gamepadConfig: scriptConfig('KeyT', script),
      });
      await new Promise((r) => setTimeout(r, 200));

      await page.keyboard.down('t');
      await waitForButton(page, 0, true);
      await page.keyboard.up('t');

      // Switch to a config with no script (but pad 0 still active) — cancels script, releases A
      await new Promise((r) => setTimeout(r, 50));
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'gs-ext2',
        gamepadConfig: noScriptConfig,
      });
      // Config change should have cancelled the script and released button A
      await waitForButton(page, 0, false);
    }
  );

  await assert(
    'on_down cancel-restart releases button before restarting',
    async () => {
      // Script: press A, long delay
      const script = {
        type: 'script',
        activationType: 'on_down',
        actions: [
          {
            type: 'down',
            buttons: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
          },
          { type: 'delay', durationMs: 500 },
          {
            type: 'up',
            buttons: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
          },
        ],
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'gs-ext',
        gamepadConfig: scriptConfig('KeyT', script),
      });
      await new Promise((r) => setTimeout(r, 200));

      // First press: button A goes down
      await page.keyboard.down('t');
      await waitForButton(page, 0, true);
      await page.keyboard.up('t');

      // Second press: cancels (releases A) then restarts (presses A again)
      await new Promise((r) => setTimeout(r, 30));
      await page.keyboard.down('t');
      // Button should still be pressed (restarted)
      await waitForButton(page, 0, true);
      await page.keyboard.up('t');

      // Cancel via config change (pad 0 stays active so polling continues)
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'gs-ext2',
        gamepadConfig: noScriptConfig,
      });
      await waitForButton(page, 0, false);
    }
  );

  // ── multi-pad script ──────────────────────────────────────────────────────

  console.log('  [GameScript Extended - multi-pad script]');

  await assert(
    'script can press buttons on multiple gamepad indices',
    async () => {
      const script = {
        type: 'script',
        activationType: 'on_down',
        actions: [
          {
            type: 'down',
            buttons: [
              { type: 'action', gamepadIndex: 0, action: 'a' },
              { type: 'action', gamepadIndex: 1, action: 'b' },
            ],
          },
          { type: 'delay', durationMs: 80 },
          {
            type: 'up',
            buttons: [
              { type: 'action', gamepadIndex: 0, action: 'a' },
              { type: 'action', gamepadIndex: 1, action: 'b' },
            ],
          },
        ],
      };
      const config = {
        mouseConfig: { mouseControls: [] },
        keyboardConfig: { KeyT: [script] },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'gs-ext',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 200));

      await page.keyboard.down('t');
      await waitForPadButton(page, 0, 0, true);
      await waitForPadButton(page, 1, 1, true);
      await page.keyboard.up('t');

      await waitForPadButton(page, 0, 0, false);
      await waitForPadButton(page, 1, 1, false);
    }
  );

  // ── held: finite loop completes before key-up ─────────────────────────────

  console.log('  [GameScript Extended - held finite loop]');

  await assert(
    'held: finite loop completes and button releases before key-up',
    async () => {
      const script = {
        type: 'script',
        activationType: 'held',
        actions: [
          {
            type: 'loop',
            count: 2,
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
        name: 'gs-ext',
        gamepadConfig: scriptConfig('KeyT', script),
      });
      await new Promise((r) => setTimeout(r, 200));

      await page.keyboard.down('t');
      // 2 cycles complete
      await waitForButton(page, 0, true);
      await waitForButton(page, 0, false);
      await waitForButton(page, 0, true);
      await waitForButton(page, 0, false);

      // Script done, key still held — button stays released
      await new Promise((r) => setTimeout(r, 80));
      expect((await getButtonStates(page))[0]).toBeFalse();

      await page.keyboard.up('t');
    }
  );

  // ── script with only delays ───────────────────────────────────────────────

  console.log('  [GameScript Extended - delay-only script]');

  await assert('script with only delays completes without error', async () => {
    const script = {
      type: 'script',
      activationType: 'on_down',
      actions: [
        { type: 'delay', durationMs: 50 },
        { type: 'delay', durationMs: 50 },
      ],
    };
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'gs-ext',
      gamepadConfig: scriptConfig('KeyT', script),
    });
    await new Promise((r) => setTimeout(r, 200));

    await page.keyboard.down('t');
    await page.keyboard.up('t');
    await new Promise((r) => setTimeout(r, 200));
    // No buttons should be pressed
    const states = await getButtonStates(page);
    expect(states.every((v) => v === false)).toBeTrue();
  });

  // ── script + direct action on same key ───────────────────────────────────

  console.log('  [GameScript Extended - script + action same key]');

  await assert(
    'script and direct action on same key both activate',
    async () => {
      const config = {
        mouseConfig: { mouseControls: [] },
        keyboardConfig: {
          KeyT: [
            { type: 'action', gamepadIndex: 0, action: 'b' },
            tapScript('a', 80, 'on_down'),
          ],
        },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'gs-ext',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 200));

      await page.keyboard.down('t');
      // Direct action: button B pressed immediately
      await waitForButton(page, 1, true);
      // Script: button A pressed immediately
      await waitForButton(page, 0, true);

      await page.keyboard.up('t');
      // Direct action releases B
      await waitForButton(page, 1, false);
      // Script releases A after delay
      await waitForButton(page, 0, false);
    }
  );

  // ── rapid on_down: no button leak ─────────────────────────────────────────

  console.log('  [GameScript Extended - rapid on_down no leak]');

  await assert('rapid on_down presses do not leave button stuck', async () => {
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'gs-ext',
      gamepadConfig: scriptConfig('KeyT', tapScript('a', 60, 'on_down')),
    });
    await new Promise((r) => setTimeout(r, 200));

    // Rapid fire: press/up 5 times quickly
    for (let i = 0; i < 5; i++) {
      await page.keyboard.down('t');
      await page.keyboard.up('t');
      await new Promise((r) => setTimeout(r, 10));
    }

    // After all scripts complete, button must be released
    await waitForButton(page, 0, false, 5000);
    await new Promise((r) => setTimeout(r, 150));
    expect((await getButtonStates(page))[0]).toBeFalse();
  });

  // ── on_up: key held long, script fires on release ─────────────────────────

  console.log('  [GameScript Extended - on_up long hold]');

  await assert('on_up: script fires after long key hold', async () => {
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'gs-ext',
      gamepadConfig: scriptConfig('KeyT', tapScript('y', 80, 'on_up')),
    });
    await new Promise((r) => setTimeout(r, 200));

    await page.keyboard.down('t');
    // Hold for 300ms — button should NOT be pressed during hold
    await new Promise((r) => setTimeout(r, 300));
    expect((await getButtonStates(page))[3]).toBeFalse();

    await page.keyboard.up('t');
    // Now script fires
    await waitForButton(page, 3, true);
    await waitForButton(page, 3, false);
  });

  // ── config change cancels all running scripts ─────────────────────────────

  console.log('  [GameScript Extended - config change cancels scripts]');

  await assert(
    'activating new config cancels all running scripts',
    async () => {
      // Start a long-running turbo
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'gs-ext',
        gamepadConfig: scriptConfig('KeyT', turboScript('a', 50, 'toggle')),
      });
      await new Promise((r) => setTimeout(r, 200));

      await page.keyboard.down('t');
      await page.keyboard.up('t');
      await waitForButton(page, 0, true);

      // Activate a config with no scripts but pad 0 still active — should cancel the turbo
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'gs-ext2',
        gamepadConfig: noScriptConfig,
      });

      // Button A should be released
      await waitForButton(page, 0, false);
      await new Promise((r) => setTimeout(r, 150));
      expect((await getButtonStates(page))[0]).toBeFalse();
    }
  );

  // ── loop count=0 ─────────────────────────────────────────────────────────

  console.log('  [GameScript Extended - loop count 0]');

  await assert('loop with count 0 executes zero times', async () => {
    const script = {
      type: 'script',
      activationType: 'on_down',
      actions: [
        {
          type: 'loop',
          count: 0,
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
          ],
        },
      ],
    };
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'gs-ext',
      gamepadConfig: scriptConfig('KeyT', script),
    });
    await new Promise((r) => setTimeout(r, 200));

    await page.keyboard.down('t');
    await page.keyboard.up('t');
    await new Promise((r) => setTimeout(r, 150));
    expect((await getButtonStates(page))[0]).toBeFalse();
  });

  // ── additive: two scripts press same button ───────────────────────────────

  console.log('  [GameScript Extended - two scripts same button additive]');

  await assert(
    'two scripts pressing same button: button held until both release',
    async () => {
      // KeyT: script 1 presses A for 200ms; KeyU: script 2 presses A for 200ms
      const config = {
        mouseConfig: { mouseControls: [] },
        keyboardConfig: {
          KeyT: [tapScript('a', 200, 'on_down')],
          KeyU: [tapScript('a', 200, 'on_down')],
        },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'gs-ext',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 200));

      // Start both scripts with a 100ms offset
      await page.keyboard.down('t');
      await waitForButton(page, 0, true);
      await page.keyboard.up('t');

      await new Promise((r) => setTimeout(r, 100));
      await page.keyboard.down('u');
      await page.keyboard.up('u');

      // Script 1 finishes at ~200ms, script 2 finishes at ~300ms
      // Button should still be pressed at ~250ms (script 2 still running)
      await new Promise((r) => setTimeout(r, 150));
      expect((await getButtonStates(page))[0]).toBeTrue();

      // After script 2 finishes, button releases
      await waitForButton(page, 0, false, 5000);
    }
  );

  // Restore clean state
  await releaseAll(page);
  await sendConfigToPage(page, {
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: 'default',
    gamepadConfig: { mouseConfig: { mouseControls: [] }, keyboardConfig: {} },
  });
  await new Promise((r) => setTimeout(r, 200));
};
