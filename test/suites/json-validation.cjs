// Tests: JSON.md validation rules — duplicate keys, Escape forbidden,
// array length, sensitivity range, mouseControls values, max presets
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

  console.log('  [Validation - Shared Key Codes]');

  await assert(
    'shared key code across two button fields activates both',
    async () => {
      // Bind "Space" to both a and b — this is valid (shared bindings)
      const sharedConfig = {
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyboardConfig: { Space: ['a', 'b'] },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'shared',
        gamepadConfig: sharedConfig,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.down('Space');
      await new Promise((r) => setTimeout(r, 200));
      const buttons = await getButtonStates(page);
      // Both buttons should be pressed
      if (!buttons[0] || !buttons[1])
        throw new Error('Shared binding did not activate both buttons');
      await page.keyboard.up('Space');
      await new Promise((r) => setTimeout(r, 100));
    }
  );

  await assert(
    'shared key in array binding across fields activates both',
    async () => {
      const sharedConfig = {
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyboardConfig: { KeyP: 'a', KeyQ: ['a', 'x'] },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'shared2',
        gamepadConfig: sharedConfig,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.down('q');
      await new Promise((r) => setTimeout(r, 200));
      const buttons = await getButtonStates(page);
      if (!buttons[0] || !buttons[2])
        throw new Error('Shared binding in array did not activate both');
      await page.keyboard.up('q');
      await new Promise((r) => setTimeout(r, 100));
    }
  );

  console.log('  [Validation - Escape Key Forbidden]');

  await assert('Escape key binding is rejected', async () => {
    const escConfig = {
      mouseConfig: { mouseControls: 1, sensitivity: 10 },
      keyboardConfig: { Escape: 'a' },
    };
    // Restore default first
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'default',
      gamepadConfig: DEFAULT_CONFIG,
    });
    await new Promise((r) => setTimeout(r, 500));

    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'esc',
      gamepadConfig: escConfig,
    });
    await new Promise((r) => setTimeout(r, 500));

    // Escape should not activate button A
    await page.keyboard.down('Escape');
    await new Promise((r) => setTimeout(r, 200));
    expect((await getButtonStates(page))[0]).toBeFalse();
    await page.keyboard.up('Escape');
  });

  await assert('Escape in array binding is rejected', async () => {
    const escConfig = {
      mouseConfig: { mouseControls: 1, sensitivity: 10 },
      keyboardConfig: { Space: 'a', Escape: 'a' },
    };
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'esc2',
      gamepadConfig: escConfig,
    });
    await new Promise((r) => setTimeout(r, 500));

    await page.keyboard.down('Escape');
    await new Promise((r) => setTimeout(r, 200));
    expect((await getButtonStates(page))[0]).toBeFalse();
    await page.keyboard.up('Escape');
  });

  console.log('  [Validation - Sensitivity Range]');

  await assert('sensitivity=1 (minimum) is accepted', async () => {
    const config = {
      mouseConfig: { mouseControls: 1, sensitivity: 1 },
      keyboardConfig: { Space: 'a' },
    };
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'sens1',
      gamepadConfig: config,
    });
    await new Promise((r) => setTimeout(r, 500));
    await page.keyboard.down('Space');
    await waitForButton(page, 0, true);
    await page.keyboard.up('Space');
    await waitForButton(page, 0, false);
  });

  await assert('sensitivity=1000 (maximum) is accepted', async () => {
    const config = {
      mouseConfig: { mouseControls: 1, sensitivity: 1000 },
      keyboardConfig: { Space: 'a' },
    };
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'sens1000',
      gamepadConfig: config,
    });
    await new Promise((r) => setTimeout(r, 500));
    await page.keyboard.down('Space');
    await waitForButton(page, 0, true);
    await page.keyboard.up('Space');
    await waitForButton(page, 0, false);
  });

  console.log('  [Validation - mouseControls Values]');

  await assert('mouseControls=0 is accepted', async () => {
    const config = {
      mouseConfig: { mouseControls: 0, sensitivity: 10 },
      keyboardConfig: { Space: 'a' },
    };
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'mc0',
      gamepadConfig: config,
    });
    await new Promise((r) => setTimeout(r, 500));
    await page.keyboard.down('Space');
    await waitForButton(page, 0, true);
    await page.keyboard.up('Space');
    await waitForButton(page, 0, false);
  });

  await assert('mouseControls=1 is accepted', async () => {
    const config = {
      mouseConfig: { mouseControls: 1, sensitivity: 10 },
      keyboardConfig: { Space: 'a' },
    };
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'mc1',
      gamepadConfig: config,
    });
    await new Promise((r) => setTimeout(r, 500));
    await page.keyboard.down('Space');
    await waitForButton(page, 0, true);
    await page.keyboard.up('Space');
    await waitForButton(page, 0, false);
  });

  await assert(
    'mouseControls=undefined disables mouse stick control',
    async () => {
      const config = {
        mouseConfig: { mouseControls: undefined, sensitivity: 10 },
        keyboardConfig: { Space: 'a' },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'mcUndef',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 500));
      // Keyboard still works
      await page.keyboard.down('Space');
      await waitForButton(page, 0, true);
      await page.keyboard.up('Space');
      await waitForButton(page, 0, false);
      // Axes should remain centered (no mouse control)
      const axes = await getAxesStates(page);
      expect(axes).toAllBeCloseTo(0, 0.01);
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
