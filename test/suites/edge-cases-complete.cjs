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
        keyboardConfig: { KeyP: 'b' },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'emptyArr',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.down('p');
      await waitForButton(page, 1, true);
      await page.keyboard.up('p');
      await waitForButton(page, 1, false);

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
        keyboardConfig: { Click: 'rightTrigger', RightClick: 'leftTrigger' },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'mouseOnly',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.mouse.move(200, 200);
      await page.mouse.down();
      await waitForButton(page, 7, true);
      await page.mouse.up();
      await waitForButton(page, 7, false);

      await page.mouse.down({ button: 'right' });
      await waitForButton(page, 6, true);
      await page.mouse.up({ button: 'right' });
      await waitForButton(page, 6, false);

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
        keyboardConfig: { KeyP: 'a' },
      };
      const configB = {
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyboardConfig: { KeyB: 'a' },
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
          KeyU: 'dpadUp',
          KeyJ: 'dpadDown',
          KeyH: 'dpadLeft',
          KeyN: 'dpadRight',
          KeyM: 'home',
          KeyD: 'leftStickRight',
          KeyS: 'leftStickDown',
          KeyL: 'rightStickRight',
          KeyK: 'rightStickDown',
        },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'allAtOnce',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 500));

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

      await page.keyboard.down('d'); // left X = +1
      await page.keyboard.down('s'); // left Y = +1
      await page.keyboard.down('l'); // right X = +1
      await page.keyboard.down('k'); // right Y = +1

      await new Promise((r) => setTimeout(r, 300));

      const buttons = await getButtonStates(page);
      for (let i = 0; i < 17; i++) {
        if (!buttons[i])
          throw new Error(`Button ${i} not pressed in all-at-once test`);
      }

      const axes = await getAxesStates(page);
      expect(axes[0]).toBe(1);
      expect(axes[1]).toBe(1);
      expect(axes[2]).toBe(1);
      expect(axes[3]).toBe(1);

      for (const k of buttonKeys) await page.keyboard.up(k);
      await page.keyboard.up('d');
      await page.keyboard.up('s');
      await page.keyboard.up('l');
      await page.keyboard.up('k');
      await new Promise((r) => setTimeout(r, 300));

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
        keyboardConfig: {
          Space: 'a',
          KeyP: 'b',
          KeyB: 'b',
          KeyI: 'x',
          ArrowUp: 'dpadUp',
          KeyW: 'dpadUp',
          KeyT: 'leftStickUp',
          KeyG: 'leftStickDown',
          KeyY: 'leftStickDown',
        },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'mixed',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.down('Space');
      await waitForButton(page, 0, true);
      await page.keyboard.up('Space');
      await waitForButton(page, 0, false);

      await page.keyboard.down('p');
      await waitForButton(page, 1, true);
      await page.keyboard.up('p');
      await waitForButton(page, 1, false);

      await page.keyboard.down('b');
      await waitForButton(page, 1, true);
      await page.keyboard.up('b');
      await waitForButton(page, 1, false);

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

      await page.keyboard.down('Space');
      await page.keyboard.down('w');
      await waitForButton(page, 0, true);
      await waitForAxis(page, 1, 'lt', -0.5);

      await page.keyboard.up('Space');
      await page.keyboard.up('w');
      await waitForButton(page, 0, false);
      await waitForAxesCentered(page);

      const newConfig = {
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyboardConfig: { KeyP: 'a', KeyI: 'leftStickUp' },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'switchClean',
        gamepadConfig: newConfig,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.down('Space');
      await new Promise((r) => setTimeout(r, 200));
      expect((await getButtonStates(page))[0]).toBeFalse();
      await page.keyboard.up('Space');

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

      await page.keyboard.up('w');
      await page.keyboard.up('d');
      await new Promise((r) => setTimeout(r, 200));

      await sendConfigToPage(page, { type: 'DISABLE_GAMEPAD' });
      await waitForStatus(page, 'disconnected');

      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await waitForStatus(page, 'connected');
      await new Promise((r) => setTimeout(r, 300));

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
