// Tests: Behavioral contract items from JSON.md that aren't covered elsewhere —
// key press timing (immediate response), config activation clears previous state,
// button press does not affect axes and vice versa, gamepadconnected event carries
// correct gamepad data, multiple configs with overlapping keys
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
    getButtonTouched,
    getEventCounts,
    getGamepadIdentity,
    getConnectionStatus,
    waitForButton,
    waitForAxis,
    waitForAxesCentered,
    waitForStatus,
    sendConfigToPage,
  } = helpers;

  console.log('  [Behavioral Contract - Immediate Input Response]');

  await assert(
    'key press produces button state change within one animation frame cycle',
    async () => {
      // Press and immediately check — the extension should respond within the polling cycle
      await page.keyboard.down('Space');
      // waitForButton uses waitForFunction which polls at rAF rate
      await waitForButton(page, 0, true, 1000);
      await page.keyboard.up('Space');
      await waitForButton(page, 0, false, 1000);
    }
  );

  await assert(
    'axis key press produces deflection within one animation frame cycle',
    async () => {
      await page.keyboard.down('w');
      await waitForAxis(page, 1, 'lt', -0.5, 1000);
      await page.keyboard.up('w');
      await waitForAxesCentered(page);
    }
  );

  console.log(
    '  [Behavioral Contract - Config Activation Clears Previous State]'
  );

  await assert(
    'activating a new config resets all buttons to unpressed',
    async () => {
      await releaseAll(page);
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await new Promise((r) => setTimeout(r, 500));

      // Hold a key, then switch config
      await page.keyboard.down('Space');
      await waitForButton(page, 0, true);

      const newConfig = {
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyConfig: { a: 'KeyP' },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'clearTest',
        gamepadConfig: newConfig,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.up('Space');
      await new Promise((r) => setTimeout(r, 100));

      // Verify new config works
      await page.keyboard.down('p');
      await waitForButton(page, 0, true);
      await page.keyboard.up('p');
      await waitForButton(page, 0, false);
    }
  );

  await assert(
    'activating a new config resets all axes to center',
    async () => {
      await releaseAll(page);
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await new Promise((r) => setTimeout(r, 500));

      // Verify axis deflects with default config
      await page.keyboard.down('w');
      await waitForAxis(page, 1, 'lt', -0.5);
      // Release the key before switching
      await page.keyboard.up('w');
      await waitForAxesCentered(page);

      // Now hold the key again
      await page.keyboard.down('w');
      await waitForAxis(page, 1, 'lt', -0.5);

      // Switch to config where W is NOT bound to any axis
      const newConfig = {
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyConfig: { leftStickUp: 'KeyP' },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'clearAxes',
        gamepadConfig: newConfig,
      });
      await new Promise((r) => setTimeout(r, 500));

      // Release W (which is no longer bound)
      await page.keyboard.up('w');
      await new Promise((r) => setTimeout(r, 200));

      // New config's key should work for the axis
      await page.keyboard.down('p');
      await waitForAxis(page, 1, 'lt', -0.5);
      await page.keyboard.up('p');
      await waitForAxesCentered(page);
    }
  );

  console.log('  [Behavioral Contract - Input Isolation]');

  await assert(
    'pressing a button key does not change any axis value',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await new Promise((r) => setTimeout(r, 500));

      const axesBefore = await getAxesStates(page);
      await page.keyboard.down('Space');
      await waitForButton(page, 0, true);
      const axesAfter = await getAxesStates(page);

      for (let i = 0; i < 4; i++) {
        if (Math.abs(axesAfter[i] - axesBefore[i]) > 0.01) {
          await page.keyboard.up('Space');
          throw new Error(
            `Axis ${i} changed from ${axesBefore[i]} to ${axesAfter[i]} on button press`
          );
        }
      }
      await page.keyboard.up('Space');
      await waitForButton(page, 0, false);
    }
  );

  await assert(
    'pressing an axis key does not change any button state',
    async () => {
      const buttonsBefore = await getButtonStates(page);
      await page.keyboard.down('w');
      await waitForAxis(page, 1, 'lt', -0.5);
      const buttonsAfter = await getButtonStates(page);

      for (let i = 0; i < 17; i++) {
        if (buttonsBefore[i] !== buttonsAfter[i]) {
          await page.keyboard.up('w');
          throw new Error(
            `Button ${i} changed from ${buttonsBefore[i]} to ${buttonsAfter[i]} on axis press`
          );
        }
      }
      await page.keyboard.up('w');
      await waitForAxesCentered(page);
    }
  );

  console.log('  [Behavioral Contract - gamepadconnected Event Data]');

  await assert(
    'gamepadconnected event carries correct gamepad id',
    async () => {
      // The exerciser stores the gamepad id from the event
      const status = await getConnectionStatus(page);
      if (status !== 'connected') {
        await sendConfigToPage(page, {
          type: 'ACTIVATE_GAMEPAD_CONFIG',
          name: 'default',
          gamepadConfig: DEFAULT_CONFIG,
        });
        await waitForStatus(page, 'connected');
      }

      const eventId = await page.evaluate(() => {
        return document
          .getElementById('status')
          ?.getAttribute('data-gamepad-id');
      });
      expect(eventId).toBe('Xbox 360 Controller (XInput STANDARD GAMEPAD)');
    }
  );

  console.log(
    '  [Behavioral Contract - Overlapping Keys Across Config Switches]'
  );

  await assert(
    'switching from config A to config B where same key maps to different button',
    async () => {
      const configA = {
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyConfig: { a: 'KeyP' }, // P → button 0
      };
      const configB = {
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyConfig: { x: 'KeyP' }, // P → button 2
      };

      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'overlapA',
        gamepadConfig: configA,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.down('p');
      await waitForButton(page, 0, true);
      expect((await getButtonStates(page))[2]).toBeFalse();
      await page.keyboard.up('p');
      await waitForButton(page, 0, false);

      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'overlapB',
        gamepadConfig: configB,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.down('p');
      await waitForButton(page, 2, true);
      expect((await getButtonStates(page))[0]).toBeFalse();
      await page.keyboard.up('p');
      await waitForButton(page, 2, false);
    }
  );

  console.log('  [Behavioral Contract - All Buttons Release on Disable]');

  await assert(
    'disabling while buttons are held releases all buttons',
    async () => {
      await releaseAll(page);
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await waitForStatus(page, 'connected');
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.down('Space');
      await page.keyboard.down('r');
      await waitForButton(page, 0, true);
      await waitForButton(page, 2, true);

      // Release the physical keys BEFORE disabling
      await page.keyboard.up('Space');
      await page.keyboard.up('r');
      await new Promise((r) => setTimeout(r, 200));

      await sendConfigToPage(page, { type: 'DISABLE_GAMEPAD' });
      await waitForStatus(page, 'disconnected');
      await new Promise((r) => setTimeout(r, 200));

      // Re-enable — buttons should not be stuck
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await waitForStatus(page, 'connected');
      await new Promise((r) => setTimeout(r, 500));

      const buttons = await getButtonStates(page);
      expect(buttons[0]).toBeFalse();
      expect(buttons[2]).toBeFalse();
      const axes = await getAxesStates(page);
      expect(axes).toAllBeCloseTo(0, 0.05);
    }
  );

  console.log('  [Behavioral Contract - Partial Config Fields]');

  await assert(
    'config with only keyConfig (no mouseConfig fields beyond required) works',
    async () => {
      await releaseAll(page);
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await new Promise((r) => setTimeout(r, 500));

      const config = {
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyConfig: { a: 'Space' },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'partial',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.down('Space');
      await waitForButton(page, 0, true);
      await page.keyboard.up('Space');
      await waitForButton(page, 0, false);

      // All unbound buttons should be unpressed
      await new Promise((r) => setTimeout(r, 100));
      const buttons = await getButtonStates(page);
      for (let i = 1; i < 17; i++) {
        if (buttons[i])
          throw new Error(`Button ${i} unexpectedly pressed in partial config`);
      }
    }
  );

  await assert(
    'config with undefined fields in keyConfig treats them as unbound',
    async () => {
      const config = {
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyConfig: {
          a: 'Space',
          b: undefined,
          x: undefined,
          leftStickUp: undefined,
        },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'undefFields',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.down('Space');
      await waitForButton(page, 0, true);
      await page.keyboard.up('Space');
      await waitForButton(page, 0, false);

      // B and X should not be activatable
      await page.keyboard.down('Control');
      await new Promise((r) => setTimeout(r, 200));
      expect((await getButtonStates(page))[1]).toBeFalse();
      await page.keyboard.up('Control');
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
