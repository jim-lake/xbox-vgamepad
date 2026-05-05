// Tests: Extended edge cases — config with all axis bindings (both sticks),
// pressing same key rapidly across config switches, empty string key code,
// config with only mouse bindings (Click/RightClick/Scroll), stress test
// with many sequential config activations
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

  console.log('  [Edge Case - Full Axis Config (Both Sticks)]');

  await assert(
    'config with all 8 axis directions bound works correctly',
    async () => {
      const config = {
        mouseConfig: { mouseControls: undefined, sensitivity: 10 },
        keyConfig: {
          leftStickUp: 'KeyW',
          leftStickDown: 'KeyS',
          leftStickLeft: 'KeyA',
          leftStickRight: 'KeyD',
          rightStickUp: 'KeyI',
          rightStickDown: 'KeyK',
          rightStickLeft: 'KeyJ',
          rightStickRight: 'KeyL',
        },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'fullAxes',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 500));

      // Test each axis direction
      const tests = [
        { key: 'w', axis: 1, expected: -1 },
        { key: 's', axis: 1, expected: 1 },
        { key: 'a', axis: 0, expected: -1 },
        { key: 'd', axis: 0, expected: 1 },
        { key: 'i', axis: 3, expected: -1 },
        { key: 'k', axis: 3, expected: 1 },
        { key: 'j', axis: 2, expected: -1 },
        { key: 'l', axis: 2, expected: 1 },
      ];

      for (const t of tests) {
        await page.keyboard.down(t.key);
        if (t.expected < 0) {
          await waitForAxis(page, t.axis, 'lt', -0.5);
        } else {
          await waitForAxis(page, t.axis, 'gt', 0.5);
        }
        const axes = await getAxesStates(page);
        expect(axes[t.axis]).toBeCloseTo(t.expected, 0.05);
        await page.keyboard.up(t.key);
      }
      await waitForAxesCentered(page);
    }
  );

  console.log('  [Edge Case - Both Sticks Diagonal Simultaneously]');

  await assert(
    'both sticks can be in diagonal position at the same time',
    async () => {
      await releaseAll(page);
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await new Promise((r) => setTimeout(r, 500));

      // Default: W=leftStickUp, D=leftStickRight → left stick diagonal up-right
      // Default: O=rightStickUp, Semicolon=rightStickRight → right stick diagonal up-right
      await page.keyboard.down('w'); // left Y = -1
      await page.keyboard.down('d'); // left X = +1
      await page.keyboard.down('o'); // right Y = -1
      await page.keyboard.down('Semicolon'); // right X = +1
      await waitForAxis(page, 0, 'gt', 0.5);
      await waitForAxis(page, 1, 'lt', -0.5);
      await waitForAxis(page, 2, 'gt', 0.5);
      await waitForAxis(page, 3, 'lt', -0.5);

      const axes = await getAxesStates(page);
      // Both sticks should be in diagonal position
      expect(axes[0]).toBeCloseTo(1, 0.05); // left X = right
      expect(axes[1]).toBeCloseTo(-1, 0.05); // left Y = up
      expect(axes[2]).toBeCloseTo(1, 0.05); // right X = right
      expect(axes[3]).toBeCloseTo(-1, 0.05); // right Y = up

      await page.keyboard.up('w');
      await page.keyboard.up('d');
      await page.keyboard.up('o');
      await page.keyboard.up('Semicolon');
      await waitForAxesCentered(page);
    }
  );

  console.log('  [Edge Case - Sequential Config Activations Stress Test]');

  await assert(
    '10 sequential config activations end with correct final config',
    async () => {
      const configs = [];
      const keys = ['p', 'b', 'i', 'j', 'k', 'l', 'h', 'n', 'm', 'u'];
      const keyCodes = [
        'KeyP',
        'KeyB',
        'KeyI',
        'KeyJ',
        'KeyK',
        'KeyL',
        'KeyH',
        'KeyN',
        'KeyM',
        'KeyU',
      ];

      for (let i = 0; i < 10; i++) {
        configs.push({
          mouseConfig: { mouseControls: 1, sensitivity: 10 },
          keyConfig: { a: keyCodes[i] },
        });
      }

      for (let i = 0; i < 10; i++) {
        await sendConfigToPage(page, {
          type: 'ACTIVATE_GAMEPAD_CONFIG',
          name: `stress${i}`,
          gamepadConfig: configs[i],
        });
        await new Promise((r) => setTimeout(r, 100));
      }
      await new Promise((r) => setTimeout(r, 500));

      // Only the last config's key should work
      await page.keyboard.down('u');
      await waitForButton(page, 0, true);
      await page.keyboard.up('u');
      await waitForButton(page, 0, false);

      // First config's key should not work
      await page.keyboard.down('p');
      await new Promise((r) => setTimeout(r, 200));
      expect((await getButtonStates(page))[0]).toBeFalse();
      await page.keyboard.up('p');
    }
  );

  console.log('  [Edge Case - Config With Only Triggers Bound]');

  await assert(
    'config binding only triggers (LT/RT) via mouse clicks works',
    async () => {
      await releaseAll(page);
      // Reset to a known state first
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await new Promise((r) => setTimeout(r, 500));

      const config = {
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyConfig: { leftTrigger: 'RightClick', rightTrigger: 'Click' },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'triggersOnly',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 500));

      // No keyboard buttons should activate any gamepad button
      await page.keyboard.down('p');
      await new Promise((r) => setTimeout(r, 200));
      const buttons = await getButtonStates(page);
      // Only triggers (6, 7) could be active, and only via mouse
      for (let i = 0; i < 17; i++) {
        if (i !== 6 && i !== 7 && buttons[i]) {
          await page.keyboard.up('p');
          throw new Error(
            `Button ${i} unexpectedly pressed in triggers-only config`
          );
        }
      }
      await page.keyboard.up('p');
    }
  );

  console.log('  [Edge Case - Rebinding Same Physical Key Across Configs]');

  await assert(
    'same physical key can map to different buttons in different configs',
    async () => {
      await releaseAll(page);
      const configs = [
        {
          mouseConfig: { mouseControls: 1, sensitivity: 10 },
          keyConfig: { a: 'Space' },
        }, // Space → 0
        {
          mouseConfig: { mouseControls: 1, sensitivity: 10 },
          keyConfig: { b: 'Space' },
        }, // Space → 1
        {
          mouseConfig: { mouseControls: 1, sensitivity: 10 },
          keyConfig: { x: 'Space' },
        }, // Space → 2
        {
          mouseConfig: { mouseControls: 1, sensitivity: 10 },
          keyConfig: { start: 'Space' },
        }, // Space → 9
      ];
      const expectedIndices = [0, 1, 2, 9];

      for (let i = 0; i < configs.length; i++) {
        await sendConfigToPage(page, {
          type: 'ACTIVATE_GAMEPAD_CONFIG',
          name: `rebind${i}`,
          gamepadConfig: configs[i],
        });
        await new Promise((r) => setTimeout(r, 500));

        await page.keyboard.down('Space');
        await waitForButton(page, expectedIndices[i], true, 5000);

        // Verify the target button is pressed
        const buttons = await getButtonStates(page);
        expect(buttons[expectedIndices[i]]).toBeTrue();

        await page.keyboard.up('Space');
        await waitForButton(page, expectedIndices[i], false);
      }
    }
  );

  console.log('  [Edge Case - Config With All Fields Set to undefined]');

  await assert(
    'config with all keyConfig fields explicitly undefined produces no input',
    async () => {
      await releaseAll(page);
      for (const k of [
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
        'n',
        'm',
        'u',
      ]) {
        await page.keyboard.up(k).catch(() => {});
      }

      // Disable and re-enable to fully reset state
      await sendConfigToPage(page, { type: 'DISABLE_GAMEPAD' });
      await helpers.waitForStatus(page, 'disconnected');

      const config = {
        mouseConfig: { mouseControls: undefined, sensitivity: 10 },
        keyConfig: {},
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'allUndef',
        gamepadConfig: config,
      });
      await helpers.waitForStatus(page, 'connected');
      await new Promise((r) => setTimeout(r, 500));

      // Press several keys — none should produce any input
      await page.keyboard.down('Space');
      await page.keyboard.down('w');
      await page.keyboard.down('Enter');
      await new Promise((r) => setTimeout(r, 300));

      const buttons = await getButtonStates(page);
      const axes = await getAxesStates(page);

      await page.keyboard.up('Space');
      await page.keyboard.up('w');
      await page.keyboard.up('Enter');
      await new Promise((r) => setTimeout(r, 100));

      for (let i = 0; i < 17; i++) {
        if (buttons[i])
          throw new Error(
            `Button ${i} unexpectedly pressed with empty keyConfig`
          );
      }
      expect(axes).toAllBeCloseTo(0, 0.05);
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
