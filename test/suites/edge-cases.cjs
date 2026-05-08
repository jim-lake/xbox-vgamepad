// Tests: Edge cases — many simultaneous keys, all 17 buttons at once,
// config with only axis bindings, config with only button bindings,
// key repeat events (holding key), very long key hold, alternates on axes
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
    waitForButton,
    waitForAxis,
    waitForAxesCentered,
    sendConfigToPage,
  } = helpers;

  console.log('  [Edge Case - All 17 Buttons Pressed Simultaneously]');

  await assert('all 17 buttons can be pressed at the same time', async () => {
    const config = {
      mouseConfig: { mouseControls: undefined, sensitivity: 10 },
      keyboardConfig: {
        Digit1: 'a',
        Digit2: 'b',
        Digit3: 'x',
        Digit4: 'y',
        Digit5: 'leftShoulder',
        Digit6: 'rightShoulder',
        Digit7: 'leftTrigger',
        Digit8: 'rightTrigger',
        Digit9: 'select',
        Digit0: 'start',
        KeyP: 'leftStickPressed',
        KeyB: 'rightStickPressed',
        KeyI: 'dpadUp',
        KeyJ: 'dpadDown',
        KeyK: 'dpadLeft',
        KeyL: 'dpadRight',
        KeyH: 'home',
      },
    };
    const keys = [
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '0',
      'p',
      'b',
      'i',
      'j',
      'k',
      'l',
      'h',
    ];

    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'all17',
      gamepadConfig: config,
    });
    await new Promise((r) => setTimeout(r, 500));

    for (const k of keys) await page.keyboard.down(k);
    await new Promise((r) => setTimeout(r, 300));

    const buttons = await getButtonStates(page);
    for (let i = 0; i < 17; i++) {
      if (!buttons[i])
        throw new Error(`Button ${i} not pressed when all 17 held`);
    }

    for (const k of keys) await page.keyboard.up(k);
    await new Promise((r) => setTimeout(r, 300));

    const after = await getButtonStates(page);
    for (let i = 0; i < 17; i++) {
      if (after[i]) throw new Error(`Button ${i} still pressed after release`);
    }
  });

  console.log('  [Edge Case - Axes-Only Config]');

  await assert(
    'config with only axis bindings works (no button bindings)',
    async () => {
      const config = {
        mouseConfig: { mouseControls: undefined, sensitivity: 10 },
        keyboardConfig: {
          KeyW: 'leftStickUp',
          KeyS: 'leftStickDown',
          KeyA: 'leftStickLeft',
          KeyD: 'leftStickRight',
        },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'axesOnly',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.down('w');
      await waitForAxis(page, 1, 'lt', -0.5);
      await page.keyboard.up('w');
      await waitForAxesCentered(page);

      await page.keyboard.down('Space');
      await new Promise((r) => setTimeout(r, 200));
      expect(await getButtonStates(page)).toAllBeFalse();
      await page.keyboard.up('Space');
    }
  );

  console.log('  [Edge Case - Buttons-Only Config]');

  await assert(
    'config with only button bindings works (no axis bindings)',
    async () => {
      const config = {
        mouseConfig: { mouseControls: undefined, sensitivity: 10 },
        keyboardConfig: { Space: 'a', KeyB: 'b', KeyX: 'x' },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'buttonsOnly',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.down('Space');
      await waitForButton(page, 0, true);
      await page.keyboard.up('Space');
      await waitForButton(page, 0, false);

      await page.keyboard.down('w');
      await new Promise((r) => setTimeout(r, 200));
      expect(await getAxesStates(page)).toAllBeCloseTo(0, 0.01);
      await page.keyboard.up('w');
    }
  );

  console.log('  [Edge Case - Key Repeat / Long Hold]');

  await assert(
    'holding a key for extended time keeps button pressed',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.down('Space');
      await waitForButton(page, 0, true);

      await new Promise((r) => setTimeout(r, 1000));
      expect((await getButtonStates(page))[0]).toBeTrue();

      await page.keyboard.up('Space');
      await waitForButton(page, 0, false);
    }
  );

  await assert(
    'holding an axis key for extended time keeps axis deflected',
    async () => {
      await page.keyboard.down('w');
      await waitForAxis(page, 1, 'lt', -0.5);

      await new Promise((r) => setTimeout(r, 1000));
      const axes = await getAxesStates(page);
      expect(axes[1]).toBeCloseTo(-1, 0.05);

      await page.keyboard.up('w');
      await waitForAxesCentered(page);
    }
  );

  console.log('  [Edge Case - Alternate Bindings on Axes]');

  await assert(
    'axis with two alternate bindings works for both keys',
    async () => {
      const config = {
        mouseConfig: { mouseControls: undefined, sensitivity: 10 },
        keyboardConfig: {
          KeyW: 'leftStickUp',
          KeyI: 'leftStickUp',
          KeyS: 'leftStickDown',
          KeyK: 'leftStickDown',
        },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'axisAlts',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.down('w');
      await waitForAxis(page, 1, 'lt', -0.5);
      await page.keyboard.up('w');
      await waitForAxesCentered(page);

      await page.keyboard.down('i');
      await waitForAxis(page, 1, 'lt', -0.5);
      await page.keyboard.up('i');
      await waitForAxesCentered(page);
    }
  );

  await assert(
    'releasing one axis alternate releases the axis (no per-key tracking)',
    async () => {
      await page.keyboard.down('w');
      await waitForAxis(page, 1, 'lt', -0.5);
      await page.keyboard.down('i');
      await new Promise((r) => setTimeout(r, 100));

      await page.keyboard.up('w');
      await new Promise((r) => setTimeout(r, 100));

      await page.keyboard.up('i');
      await waitForAxesCentered(page);
    }
  );

  console.log('  [Edge Case - Mixed Buttons and Axes Simultaneously]');

  await assert(
    'pressing buttons and axes from different sticks simultaneously',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.down('Space'); // A
      await page.keyboard.down('w'); // left stick up
      await page.keyboard.down('k'); // right stick left
      await page.keyboard.down('ArrowDown'); // dpad down

      await waitForButton(page, 0, true);
      await waitForButton(page, 13, true);
      await waitForAxis(page, 1, 'lt', -0.5);
      await waitForAxis(page, 2, 'lt', -0.5);

      const buttons = await getButtonStates(page);
      expect(buttons[0]).toBeTrue();
      expect(buttons[13]).toBeTrue();
      const axes = await getAxesStates(page);
      expect(axes[1]).toBeCloseTo(-1, 0.05);
      expect(axes[2]).toBeCloseTo(-1, 0.05);
      expect(axes[0]).toBeCloseTo(0, 0.05);
      expect(axes[3]).toBeCloseTo(0, 0.05);

      await page.keyboard.up('Space');
      await page.keyboard.up('w');
      await page.keyboard.up('k');
      await page.keyboard.up('ArrowDown');
      await waitForButton(page, 0, false);
      await waitForButton(page, 13, false);
      await waitForAxesCentered(page);
    }
  );

  // Restore default
  await sendConfigToPage(page, {
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: 'default',
    gamepadConfig: DEFAULT_CONFIG,
  });
  await new Promise((r) => setTimeout(r, 500));
};
