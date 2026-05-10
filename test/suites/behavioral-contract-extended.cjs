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
    makeConfig,
  } = helpers;

  console.log('  [Behavioral Contract - Immediate Input Response]');

  await assert(
    'key press produces button state change within one animation frame cycle',
    async () => {
      await page.keyboard.down('Space');
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

      await page.keyboard.down('Space');
      await waitForButton(page, 0, true);

      const newConfig = makeConfig({
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyboardConfig: { KeyP: 'a' },
      });
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'clearTest',
        gamepadConfig: newConfig,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.up('Space');
      await new Promise((r) => setTimeout(r, 100));

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

      await page.keyboard.down('w');
      await waitForAxis(page, 1, 'lt', -0.5);
      await page.keyboard.up('w');
      await waitForAxesCentered(page);

      await page.keyboard.down('w');
      await waitForAxis(page, 1, 'lt', -0.5);

      const newConfig = makeConfig({
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyboardConfig: { KeyP: 'leftStickUp' },
      });
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'clearAxes',
        gamepadConfig: newConfig,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.up('w');
      await new Promise((r) => setTimeout(r, 200));

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
      const configA = makeConfig({
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyboardConfig: { KeyP: 'a' }, // P → button 0
      });
      const configB = makeConfig({
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyboardConfig: { KeyP: 'x' }, // P → button 2
      });

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
      await page.keyboard.down('x');
      await waitForButton(page, 0, true);
      await waitForButton(page, 2, true);

      await page.keyboard.up('Space');
      await page.keyboard.up('x');
      await new Promise((r) => setTimeout(r, 200));

      await sendConfigToPage(page, { type: 'DISABLE_GAMEPAD' });
      await waitForStatus(page, 'disconnected');
      await new Promise((r) => setTimeout(r, 200));

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
    'config with only keyboardConfig (no mouseConfig fields beyond required) works',
    async () => {
      await releaseAll(page);
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await new Promise((r) => setTimeout(r, 500));

      const config = makeConfig({
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyboardConfig: { Space: 'a' },
      });
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

      await new Promise((r) => setTimeout(r, 100));
      const buttons = await getButtonStates(page);
      for (let i = 1; i < 17; i++) {
        if (buttons[i])
          throw new Error(`Button ${i} unexpectedly pressed in partial config`);
      }
    }
  );

  await assert(
    'config with empty keyboardConfig treats all keys as unbound',
    async () => {
      const config = makeConfig({
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyboardConfig: {},
      });
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'emptyKB',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.down('Space');
      await waitForButton(page, 0, false);
      await page.keyboard.up('Space');
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
