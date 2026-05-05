// Tests: End-to-end behavioral scenarios that exercise the full pipeline
// without depending on implementation details — realistic gameplay patterns,
// rapid input sequences, config hot-swapping during input, multi-input combos
module.exports = async function ({
  page,
  browser,
  assert,
  expect,
  helpers,
  releaseAll,
  DEFAULT_CONFIG,
}) {
  const {
    getButtonStates,
    getAxesStates,
    getButtonValues,
    getGamepadIdentity,
    getConnectionStatus,
    getEventCounts,
    waitForButton,
    waitForAxis,
    waitForAxesCentered,
    waitForStatus,
    setStorageSync,
    sendConfigToPage,
  } = helpers;

  // Ensure we start clean with default config
  await releaseAll(page);
  await sendConfigToPage(page, {
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: 'default',
    gamepadConfig: DEFAULT_CONFIG,
  });
  await new Promise((r) => setTimeout(r, 500));

  console.log('  [E2E Scenario - FPS Movement Pattern]');

  await assert(
    'WASD movement + button presses simultaneously',
    async () => {
      await releaseAll(page);
      await new Promise((r) => setTimeout(r, 200));

      // Move forward-right (W+D) while pressing A button (Space) and right shoulder (Q)
      await page.keyboard.down('w');
      await page.keyboard.down('d');
      await page.keyboard.down('Space');
      await page.keyboard.down('q');

      await waitForAxis(page, 1, 'lt', -0.5);
      await waitForAxis(page, 0, 'gt', 0.5);
      await waitForButton(page, 0, true);
      await waitForButton(page, 5, true);

      const axes = await getAxesStates(page);
      expect(axes[0]).toBe(1);
      expect(axes[1]).toBe(-1);

      // Release in realistic order
      await page.keyboard.up('q');
      await waitForButton(page, 5, false);
      expect((await getButtonStates(page))[0]).toBeTrue();

      await page.keyboard.up('Space');
      await waitForButton(page, 0, false);

      // Still moving
      expect((await getAxesStates(page))[0]).toBe(1);
      expect((await getAxesStates(page))[1]).toBe(-1);

      await page.keyboard.up('w');
      await page.keyboard.up('d');
      await waitForAxesCentered(page);
    }
  );

  console.log('  [E2E Scenario - Fighting Game Combo]');

  await assert(
    'rapid sequential button presses (combo input)',
    async () => {
      await releaseAll(page);
      await new Promise((r) => setTimeout(r, 200));

      // down, down-right, right, A
      await page.keyboard.down('ArrowDown');
      await waitForButton(page, 13, true);
      await page.keyboard.up('ArrowDown');
      await waitForButton(page, 13, false);

      await page.keyboard.down('ArrowDown');
      await page.keyboard.down('ArrowRight');
      await waitForButton(page, 13, true);
      await waitForButton(page, 15, true);
      await page.keyboard.up('ArrowDown');
      await waitForButton(page, 13, false);
      expect((await getButtonStates(page))[15]).toBeTrue();
      await page.keyboard.up('ArrowRight');
      await waitForButton(page, 15, false);

      await page.keyboard.down('ArrowRight');
      await waitForButton(page, 15, true);
      await page.keyboard.up('ArrowRight');
      await waitForButton(page, 15, false);

      await page.keyboard.down('Space');
      await waitForButton(page, 0, true);
      await page.keyboard.up('Space');
      await waitForButton(page, 0, false);
    }
  );

  console.log('  [E2E Scenario - Strafing With Direction Changes]');

  await assert(
    'rapid left-right strafing produces correct axis transitions',
    async () => {
      await releaseAll(page);
      await new Promise((r) => setTimeout(r, 200));

      for (let i = 0; i < 5; i++) {
        await page.keyboard.down('a');
        await waitForAxis(page, 0, 'lt', -0.5);
        expect((await getAxesStates(page))[0]).toBe(-1);
        await page.keyboard.up('a');
        await waitForAxis(page, 0, 'eq', 0);

        await page.keyboard.down('d');
        await waitForAxis(page, 0, 'gt', 0.5);
        expect((await getAxesStates(page))[0]).toBe(1);
        await page.keyboard.up('d');
        await waitForAxis(page, 0, 'eq', 0);
      }
      await waitForAxesCentered(page);
    }
  );

  console.log('  [E2E Scenario - Menu Navigation]');

  await assert(
    'D-pad navigation with select/start works',
    async () => {
      await releaseAll(page);
      await new Promise((r) => setTimeout(r, 200));

      await page.keyboard.down('ArrowDown');
      await waitForButton(page, 13, true);
      await page.keyboard.up('ArrowDown');
      await waitForButton(page, 13, false);

      await page.keyboard.down('ArrowDown');
      await waitForButton(page, 13, true);
      await page.keyboard.up('ArrowDown');
      await waitForButton(page, 13, false);

      await page.keyboard.down('ArrowRight');
      await waitForButton(page, 15, true);
      await page.keyboard.up('ArrowRight');
      await waitForButton(page, 15, false);

      await page.keyboard.down('Space');
      await waitForButton(page, 0, true);
      await page.keyboard.up('Space');
      await waitForButton(page, 0, false);

      await page.keyboard.down('Enter');
      await waitForButton(page, 9, true);
      await page.keyboard.up('Enter');
      await waitForButton(page, 9, false);

      await page.keyboard.down('Control');
      await waitForButton(page, 1, true);
      await page.keyboard.up('Control');
      await waitForButton(page, 1, false);
    }
  );

  console.log('  [E2E Scenario - Config Hot-Swap During Gameplay]');

  await assert(
    'switching preset clears old state and applies new bindings',
    async () => {
      await releaseAll(page);
      await new Promise((r) => setTimeout(r, 200));

      // Verify default works
      await page.keyboard.down('Space');
      await waitForButton(page, 0, true);
      await page.keyboard.up('Space');
      await waitForButton(page, 0, false);

      // Switch to a completely different config
      const newConfig = {
        mouseConfig: { mouseControls: 0, sensitivity: 20 },
        keyConfig: {
          a: 'KeyJ',
          b: 'KeyK',
          leftStickUp: 'KeyI',
          leftStickDown: 'KeyM',
        },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'hotswap',
        gamepadConfig: newConfig,
      });
      await new Promise((r) => setTimeout(r, 500));

      // Old keys should not work
      await page.keyboard.down('Space');
      await new Promise((r) => setTimeout(r, 200));
      expect((await getButtonStates(page))[0]).toBeFalse();
      await page.keyboard.up('Space');

      // New keys should work
      await page.keyboard.down('j');
      await waitForButton(page, 0, true);
      await page.keyboard.up('j');
      await waitForButton(page, 0, false);

      await page.keyboard.down('i');
      await waitForAxis(page, 1, 'lt', -0.5);
      await page.keyboard.up('i');
      await waitForAxesCentered(page);
    }
  );

  console.log('  [E2E Scenario - Shoulder Buttons + Triggers Combo]');

  await assert(
    'all shoulder/trigger buttons can be held simultaneously',
    async () => {
      await releaseAll(page);
      await new Promise((r) => setTimeout(r, 200));

      const config = {
        mouseConfig: { mouseControls: undefined, sensitivity: 10 },
        keyConfig: {
          leftShoulder: 'KeyQ',
          rightShoulder: 'KeyE',
          leftTrigger: 'KeyZ',
          rightTrigger: 'KeyC',
        },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'shoulders',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.down('q');
      await page.keyboard.down('e');
      await page.keyboard.down('z');
      await page.keyboard.down('c');

      await waitForButton(page, 4, true);
      await waitForButton(page, 5, true);
      await waitForButton(page, 6, true);
      await waitForButton(page, 7, true);

      const buttons = await getButtonStates(page);
      expect(buttons[4]).toBeTrue();
      expect(buttons[5]).toBeTrue();
      expect(buttons[6]).toBeTrue();
      expect(buttons[7]).toBeTrue();

      await page.keyboard.up('q');
      await waitForButton(page, 4, false);
      expect((await getButtonStates(page))[5]).toBeTrue();

      await page.keyboard.up('e');
      await page.keyboard.up('z');
      await page.keyboard.up('c');
      await waitForButton(page, 5, false);
      await waitForButton(page, 6, false);
      await waitForButton(page, 7, false);
    }
  );

  console.log('  [E2E Scenario - Full Controller State Snapshot]');

  await assert(
    'complete gamepad state is consistent at any point in time',
    async () => {
      await releaseAll(page);
      await new Promise((r) => setTimeout(r, 200));

      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.down('Space');
      await page.keyboard.down('r');
      await page.keyboard.down('w');
      await page.keyboard.down('Semicolon');

      await waitForButton(page, 0, true);
      await waitForButton(page, 2, true);
      await waitForAxis(page, 1, 'lt', -0.5);
      await waitForAxis(page, 2, 'gt', 0.5);

      const snapshot = await page.evaluate(() => {
        const gp = navigator.getGamepads()[0];
        if (!gp) return null;
        return {
          id: gp.id,
          connected: gp.connected,
          buttons: gp.buttons.map(b => ({ pressed: b.pressed, value: b.value })),
          axes: [...gp.axes],
        };
      });

      expect(snapshot.id).toBe('Xbox 360 Controller (XInput STANDARD GAMEPAD)');
      expect(snapshot.connected).toBeTrue();
      expect(snapshot.buttons[0].pressed).toBeTrue();
      expect(snapshot.buttons[0].value).toBe(1);
      expect(snapshot.buttons[2].pressed).toBeTrue();
      expect(snapshot.buttons[2].value).toBe(1);
      expect(snapshot.buttons[1].pressed).toBeFalse();
      expect(snapshot.buttons[1].value).toBe(0);
      expect(snapshot.axes[1]).toBe(-1);
      expect(snapshot.axes[2]).toBe(1);
      expect(snapshot.axes[0]).toBeCloseTo(0, 0.05);
      expect(snapshot.axes[3]).toBeCloseTo(0, 0.05);

      await page.keyboard.up('Space');
      await page.keyboard.up('r');
      await page.keyboard.up('w');
      await page.keyboard.up('Semicolon');
      await waitForButton(page, 0, false);
      await waitForButton(page, 2, false);
      await waitForAxesCentered(page);
    }
  );

  console.log('  [E2E Scenario - Disable/Enable Preserves No Phantom State]');

  await assert(
    'multiple disable/enable cycles never produce phantom input',
    async () => {
      await releaseAll(page);
      await new Promise((r) => setTimeout(r, 300));

      for (let i = 0; i < 3; i++) {
        await sendConfigToPage(page, { type: 'DISABLE_GAMEPAD' });
        await waitForStatus(page, 'disconnected');
        await sendConfigToPage(page, {
          type: 'ACTIVATE_GAMEPAD_CONFIG',
          name: 'default',
          gamepadConfig: DEFAULT_CONFIG,
        });
        await waitForStatus(page, 'connected');
        await new Promise((r) => setTimeout(r, 300));

        const buttons = await getButtonStates(page);
        const axes = await getAxesStates(page);
        expect(buttons).toAllBeFalse();
        expect(axes).toAllBeCloseTo(0, 0.01);
      }
    }
  );

  console.log('  [E2E Scenario - Rapid Button Mashing]');

  await assert(
    '20 rapid press/release cycles on same button all register',
    async () => {
      let pressCount = 0;
      for (let i = 0; i < 20; i++) {
        await page.keyboard.down('Space');
        await waitForButton(page, 0, true);
        pressCount++;
        await page.keyboard.up('Space');
        await waitForButton(page, 0, false);
      }
      expect(pressCount).toBe(20);
    }
  );

  await assert(
    'rapid alternating between two buttons',
    async () => {
      for (let i = 0; i < 10; i++) {
        await page.keyboard.down('Space');
        await waitForButton(page, 0, true);
        await page.keyboard.up('Space');
        await waitForButton(page, 0, false);

        await page.keyboard.down('r');
        await waitForButton(page, 2, true);
        await page.keyboard.up('r');
        await waitForButton(page, 2, false);
      }
    }
  );

  console.log('  [E2E Scenario - Storage-Driven Config Activation]');

  await assert(
    'full round-trip: write to storage → activate → verify input → switch → verify',
    async () => {
      await releaseAll(page);
      await new Promise((r) => setTimeout(r, 200));

      const preset1 = {
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyConfig: { a: 'KeyU', b: 'KeyI', leftStickUp: 'KeyW' },
      };
      const preset2 = {
        mouseConfig: { mouseControls: 0, sensitivity: 5 },
        keyConfig: { a: 'KeyJ', x: 'KeyK', leftStickLeft: 'KeyA' },
      };

      await setStorageSync(browser, {
        'GP_CONF:e2e1': preset1,
        'GP_CONF:e2e2': preset2,
        ACTIVE_GP_CONF: 'e2e1',
        ENABLED: true,
      });

      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'e2e1',
        gamepadConfig: preset1,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.down('u');
      await waitForButton(page, 0, true);
      await page.keyboard.up('u');
      await waitForButton(page, 0, false);

      await page.keyboard.down('w');
      await waitForAxis(page, 1, 'lt', -0.5);
      await page.keyboard.up('w');
      await waitForAxesCentered(page);

      // Switch to preset2
      await setStorageSync(browser, { ACTIVE_GP_CONF: 'e2e2' });
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'e2e2',
        gamepadConfig: preset2,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.down('u');
      await new Promise((r) => setTimeout(r, 200));
      expect((await getButtonStates(page))[0]).toBeFalse();
      await page.keyboard.up('u');

      await page.keyboard.down('j');
      await waitForButton(page, 0, true);
      await page.keyboard.up('j');
      await waitForButton(page, 0, false);

      await page.keyboard.down('a');
      await waitForAxis(page, 0, 'lt', -0.5);
      await page.keyboard.up('a');
      await waitForAxesCentered(page);
    }
  );

  // Restore default
  await releaseAll(page);
  await sendConfigToPage(page, {
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: 'default',
    gamepadConfig: DEFAULT_CONFIG,
  });
  await new Promise((r) => setTimeout(r, 500));
};
