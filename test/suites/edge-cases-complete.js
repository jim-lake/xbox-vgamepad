// Tests: Advanced edge cases for complete coverage —
// empty array binding, config with only mouse bindings (no keyboard),
// rapid alternating between two configs, all axes + all buttons simultaneously,
// config with mixed string and array bindings, key held across config switch
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
    waitForStatus,
    sendConfigToPage,
  } = helpers;

  console.log('  [Edge Case - Empty Array Binding]');

  await assert(
    'config with empty array binding [] treats field as unbound',
    async () => {
      const config = {
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyConfig: { a: [], b: 'KeyP' },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'emptyArr',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 500));

      // b should work
      await page.keyboard.down('p');
      await waitForButton(page, 1, true);
      await page.keyboard.up('p');
      await waitForButton(page, 1, false);

      // Space should not activate A since a: [] is unbound
      await page.keyboard.down('Space');
      await new Promise((r) => setTimeout(r, 200));
      expect((await getButtonStates(page))[0]).toBeFalse();
      await page.keyboard.up('Space');
    }
  );

  console.log('  [Edge Case - Config With Only Mouse Click Bindings]');

  await assert(
    'config with only Click and RightClick bindings works',
    async () => {
      const config = {
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyConfig: { rightTrigger: 'Click', leftTrigger: 'RightClick' },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'mouseOnly',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 500));

      // Left click → RT (index 7)
      await page.mouse.move(200, 200);
      await page.mouse.down();
      await waitForButton(page, 7, true);
      await page.mouse.up();
      await waitForButton(page, 7, false);

      // Right click → LT (index 6)
      await page.mouse.down({ button: 'right' });
      await waitForButton(page, 6, true);
      await page.mouse.up({ button: 'right' });
      await waitForButton(page, 6, false);

      // No keyboard keys should do anything
      await page.keyboard.down('Space');
      await new Promise((r) => setTimeout(r, 200));
      expect(await getButtonStates(page)).toAllBeFalse();
      await page.keyboard.up('Space');
    }
  );

  console.log('  [Edge Case - Rapid Alternating Between Two Configs]');

  await assert(
    'rapidly alternating between two configs 20 times ends correctly',
    async () => {
      const configA = {
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyConfig: { a: 'KeyP' },
      };
      const configB = {
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyConfig: { a: 'KeyB' },
      };

      for (let i = 0; i < 20; i++) {
        const cfg = i % 2 === 0 ? configA : configB;
        const name = i % 2 === 0 ? 'rapidA' : 'rapidB';
        await sendConfigToPage(page, {
          type: 'ACTIVATE_GAMEPAD_CONFIG',
          name,
          gamepadConfig: cfg,
        });
        await new Promise((r) => setTimeout(r, 50));
      }
      await new Promise((r) => setTimeout(r, 500));

      // Last was configB (i=19, odd)
      await page.keyboard.down('b');
      await waitForButton(page, 0, true);
      await page.keyboard.up('b');
      await waitForButton(page, 0, false);

      // configA's key should not work
      await page.keyboard.down('p');
      await new Promise((r) => setTimeout(r, 200));
      expect((await getButtonStates(page))[0]).toBeFalse();
      await page.keyboard.up('p');
    }
  );

  console.log('  [Edge Case - All Buttons + All Axes Simultaneously]');

  await assert(
    'all 17 buttons + all 4 axes active at the same time',
    async () => {
      // Need a config where all 17 buttons + 8 axis directions use unique keys
      const config = {
        mouseConfig: { mouseControls: undefined, sensitivity: 10 },
        keyConfig: {
          a: 'Digit1',
          b: 'Digit2',
          x: 'Digit3',
          y: 'Digit4',
          leftShoulder: 'Digit5',
          rightShoulder: 'Digit6',
          leftTrigger: 'Digit7',
          rightTrigger: 'Digit8',
          select: 'Digit9',
          start: 'Digit0',
          leftStickPressed: 'KeyP',
          rightStickPressed: 'KeyB',
          dpadUp: 'KeyU',
          dpadDown: 'KeyJ',
          dpadLeft: 'KeyH',
          dpadRight: 'KeyN',
          home: 'KeyM',
          leftStickRight: 'KeyD',
          leftStickDown: 'KeyS',
          rightStickRight: 'KeyL',
          rightStickDown: 'KeyK',
        },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'allAtOnce',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 500));

      // Press all 17 button keys
      const buttonKeys = [
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
        'u',
        'j',
        'h',
        'n',
        'm',
      ];
      for (const k of buttonKeys) await page.keyboard.down(k);

      // Press axis keys (right and down for each stick)
      await page.keyboard.down('d'); // left X = +1
      await page.keyboard.down('s'); // left Y = +1
      await page.keyboard.down('l'); // right X = +1
      await page.keyboard.down('k'); // right Y = +1

      await new Promise((r) => setTimeout(r, 300));

      // Verify all 17 buttons pressed
      const buttons = await getButtonStates(page);
      for (let i = 0; i < 17; i++) {
        if (!buttons[i])
          throw new Error(`Button ${i} not pressed in all-at-once test`);
      }

      // Verify axes
      const axes = await getAxesStates(page);
      expect(axes[0]).toBe(1); // left X right
      expect(axes[1]).toBe(1); // left Y down
      expect(axes[2]).toBe(1); // right X right
      expect(axes[3]).toBe(1); // right Y down

      // Release everything
      for (const k of buttonKeys) await page.keyboard.up(k);
      await page.keyboard.up('d');
      await page.keyboard.up('s');
      await page.keyboard.up('l');
      await page.keyboard.up('k');
      await new Promise((r) => setTimeout(r, 300));

      // Verify clean state
      const afterButtons = await getButtonStates(page);
      for (let i = 0; i < 17; i++) {
        if (afterButtons[i]) throw new Error(`Button ${i} stuck after release`);
      }
      await waitForAxesCentered(page);
    }
  );

  console.log('  [Edge Case - Mixed String and Array Bindings]');

  await assert(
    'config mixing single strings and arrays works correctly',
    async () => {
      const config = {
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyConfig: {
          a: 'Space',
          b: ['KeyP', 'KeyB'],
          x: 'KeyI',
          dpadUp: ['ArrowUp', 'KeyW'],
          leftStickUp: 'KeyT',
          leftStickDown: ['KeyG', 'KeyY'],
        },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'mixed',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 500));

      // Single string binding
      await page.keyboard.down('Space');
      await waitForButton(page, 0, true);
      await page.keyboard.up('Space');
      await waitForButton(page, 0, false);

      // Array binding - first key
      await page.keyboard.down('p');
      await waitForButton(page, 1, true);
      await page.keyboard.up('p');
      await waitForButton(page, 1, false);

      // Array binding - second key
      await page.keyboard.down('b');
      await waitForButton(page, 1, true);
      await page.keyboard.up('b');
      await waitForButton(page, 1, false);

      // Array axis binding
      await page.keyboard.down('g');
      await waitForAxis(page, 1, 'gt', 0.5);
      await page.keyboard.up('g');
      await waitForAxesCentered(page);

      await page.keyboard.down('y');
      await waitForAxis(page, 1, 'gt', 0.5);
      await page.keyboard.up('y');
      await waitForAxesCentered(page);
    }
  );

  console.log('  [Edge Case - Key Held Across Config Switch Clears Properly]');

  await assert(
    'holding key, switching config where key is rebound, new binding takes effect',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await new Promise((r) => setTimeout(r, 500));

      // Hold Space (A button) and W (left stick up)
      await page.keyboard.down('Space');
      await page.keyboard.down('w');
      await waitForButton(page, 0, true);
      await waitForAxis(page, 1, 'lt', -0.5);

      // Release keys first
      await page.keyboard.up('Space');
      await page.keyboard.up('w');
      await waitForButton(page, 0, false);
      await waitForAxesCentered(page);

      // Switch to config where Space and W are unbound
      const newConfig = {
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyConfig: { a: 'KeyP', leftStickUp: 'KeyI' },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'switchClean',
        gamepadConfig: newConfig,
      });
      await new Promise((r) => setTimeout(r, 500));

      // Old keys should not work
      await page.keyboard.down('Space');
      await new Promise((r) => setTimeout(r, 200));
      expect((await getButtonStates(page))[0]).toBeFalse();
      await page.keyboard.up('Space');

      // New config should work
      await page.keyboard.down('p');
      await waitForButton(page, 0, true);
      await page.keyboard.up('p');
      await waitForButton(page, 0, false);
    }
  );

  console.log('  [Edge Case - Disable While Axes Deflected]');

  await assert(
    'disabling while axes are deflected does not leave stuck axes on re-enable',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.down('w');
      await page.keyboard.down('d');
      await waitForAxis(page, 1, 'lt', -0.5);
      await waitForAxis(page, 0, 'gt', 0.5);

      // Release keys before disabling
      await page.keyboard.up('w');
      await page.keyboard.up('d');
      await new Promise((r) => setTimeout(r, 200));

      await sendConfigToPage(page, { type: 'DISABLE_GAMEPAD' });
      await waitForStatus(page, 'disconnected');

      // Re-enable
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await waitForStatus(page, 'connected');
      await new Promise((r) => setTimeout(r, 300));

      // Axes should be centered
      const axes = await getAxesStates(page);
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
