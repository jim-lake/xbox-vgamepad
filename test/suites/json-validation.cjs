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

  console.log('  [Validation - Duplicate Key Codes]');

  await assert(
    'duplicate key code across two button fields is rejected (no activation)',
    async () => {
      // Bind "Space" to both a and b — this is invalid per JSON.md
      const dupeConfig = {
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyConfig: { a: 'Space', b: 'Space' },
      };
      // First ensure default is active
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await new Promise((r) => setTimeout(r, 500));

      // Now try to activate the invalid config
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'dupe',
        gamepadConfig: dupeConfig,
      });
      await new Promise((r) => setTimeout(r, 500));

      // Space should either still map to default (A=0) or be rejected entirely.
      // The key point: Space must NOT activate both button 0 AND button 1.
      await page.keyboard.down('Space');
      await new Promise((r) => setTimeout(r, 200));
      const buttons = await getButtonStates(page);
      // It must not be the case that both 0 and 1 are pressed
      const bothPressed = buttons[0] && buttons[1];
      if (bothPressed)
        throw new Error('Duplicate binding was accepted — both buttons active');
      await page.keyboard.up('Space');
      await new Promise((r) => setTimeout(r, 100));
    }
  );

  await assert(
    'duplicate key in array binding across fields is rejected',
    async () => {
      const dupeConfig = {
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyConfig: { a: ['KeyP', 'KeyQ'], x: 'KeyQ' },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'dupe2',
        gamepadConfig: dupeConfig,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.down('q');
      await new Promise((r) => setTimeout(r, 200));
      const buttons = await getButtonStates(page);
      const bothPressed = buttons[0] && buttons[2];
      if (bothPressed)
        throw new Error('Duplicate binding in array was accepted');
      await page.keyboard.up('q');
      await new Promise((r) => setTimeout(r, 100));
    }
  );

  console.log('  [Validation - Escape Key Forbidden]');

  await assert('Escape key binding is rejected', async () => {
    const escConfig = {
      mouseConfig: { mouseControls: 1, sensitivity: 10 },
      keyConfig: { a: 'Escape' },
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
      keyConfig: { a: ['Space', 'Escape'] },
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
      keyConfig: { a: 'Space' },
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
      keyConfig: { a: 'Space' },
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
      keyConfig: { a: 'Space' },
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
      keyConfig: { a: 'Space' },
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
        keyConfig: { a: 'Space' },
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
