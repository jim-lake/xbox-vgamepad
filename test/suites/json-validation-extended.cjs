// Tests: Extended JSON.md validation — mouseControls=null, duplicate between
// button and axis fields, Escape in axis bindings
module.exports = async function ({
  page,
  browser,
  assert,
  expect,
  helpers,
  releaseAll,
  DEFAULT_CONFIG,
}) {
  const { getButtonStates, getAxesStates, waitForButton, sendConfigToPage } =
    helpers;

  console.log('  [Validation - mouseControls=null Disables Mouse]');

  await assert(
    'mouseControls=null is treated same as undefined (disabled)',
    async () => {
      const config = {
        mouseConfig: { mouseControls: null, sensitivity: 10 },
        keyboardConfig: { Space: 'a' },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'mcNull',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.down('Space');
      await waitForButton(page, 0, true);
      await page.keyboard.up('Space');
      await waitForButton(page, 0, false);

      const axes = await getAxesStates(page);
      expect(axes).toAllBeCloseTo(0, 0.01);
    }
  );

  console.log('  [Validation - Shared Key Between Button and Axis]');

  await assert(
    'shared key across button and axis field activates both',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await new Promise((r) => setTimeout(r, 500));

      const config = {
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyboardConfig: { KeyW: ['a', 'leftStickUp'] },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'sharedBA',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.down('w');
      await new Promise((r) => setTimeout(r, 200));
      const buttons = await getButtonStates(page);
      const axes = await getAxesStates(page);
      const bothActive = buttons[0] && Math.abs(axes[1]) > 0.5;
      await page.keyboard.up('w');
      await new Promise((r) => setTimeout(r, 100));
      if (!bothActive)
        throw new Error(
          'Shared key across button and axis did not activate both'
        );
    }
  );

  console.log('  [Validation - Escape in Axis Binding]');

  await assert('Escape key in axis binding is rejected', async () => {
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'default',
      gamepadConfig: DEFAULT_CONFIG,
    });
    await new Promise((r) => setTimeout(r, 500));

    const config = {
      mouseConfig: { mouseControls: 1, sensitivity: 10 },
      keyboardConfig: { Escape: 'leftStickUp' },
    };
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'escAxis',
      gamepadConfig: config,
    });
    await new Promise((r) => setTimeout(r, 500));

    await page.keyboard.down('Escape');
    await new Promise((r) => setTimeout(r, 200));
    const axes = await getAxesStates(page);
    expect(axes[1]).toBeCloseTo(0, 0.05);
    await page.keyboard.up('Escape');
  });

  // Restore default
  await sendConfigToPage(page, {
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: 'default',
    gamepadConfig: DEFAULT_CONFIG,
  });
  await new Promise((r) => setTimeout(r, 500));
};
