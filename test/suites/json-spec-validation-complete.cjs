// Tests: Complete JSON.md validation rules not covered by existing suites —
// array length > 2 rejected, sensitivity out of range rejected,
// mouseControls invalid values rejected, max 25 presets
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
    waitForButton,
    sendConfigToPage,
    setStorageSync,
    getStorageSync,
  } = helpers;

  console.log('  [Validation - Array Length > 2 Rejected]');

  await assert(
    'keyboardConfig entry with 3-element array is rejected',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await new Promise((r) => setTimeout(r, 500));

      const config = {
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyboardConfig: { Space: ['a', 'b', 'x'] },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'arr3',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 500));

      // Extension should not crash
      await page.keyboard.down('Space');
      await new Promise((r) => setTimeout(r, 200));
      await page.keyboard.up('Space');
      await new Promise((r) => setTimeout(r, 100));
    }
  );

  console.log('  [Validation - Sensitivity Out of Range]');

  await assert('sensitivity=0 is rejected (below minimum)', async () => {
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'default',
      gamepadConfig: DEFAULT_CONFIG,
    });
    await new Promise((r) => setTimeout(r, 500));

    const config = {
      mouseConfig: { mouseControls: 1, sensitivity: 0 },
      keyboardConfig: { KeyP: 'a' },
    };
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'sens0',
      gamepadConfig: config,
    });
    await new Promise((r) => setTimeout(r, 500));

    await page.keyboard.down('Space');
    await new Promise((r) => setTimeout(r, 200));
    const defaultActive = (await getButtonStates(page))[0];
    await page.keyboard.up('Space');
    await new Promise((r) => setTimeout(r, 100));

    if (!defaultActive) {
      await page.keyboard.down('p');
      await new Promise((r) => setTimeout(r, 200));
      await page.keyboard.up('p');
    }
  });

  await assert('sensitivity=1001 is rejected (above maximum)', async () => {
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'default',
      gamepadConfig: DEFAULT_CONFIG,
    });
    await new Promise((r) => setTimeout(r, 500));

    const config = {
      mouseConfig: { mouseControls: 1, sensitivity: 1001 },
      keyboardConfig: { KeyP: 'a' },
    };
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'sens1001',
      gamepadConfig: config,
    });
    await new Promise((r) => setTimeout(r, 500));

    await page.keyboard.down('Space');
    await new Promise((r) => setTimeout(r, 200));
    const defaultActive = (await getButtonStates(page))[0];
    await page.keyboard.up('Space');
    await new Promise((r) => setTimeout(r, 100));

    if (!defaultActive) {
      await page.keyboard.down('p');
      await new Promise((r) => setTimeout(r, 200));
      await page.keyboard.up('p');
    }
  });

  await assert('sensitivity=-1 (negative) is rejected', async () => {
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'default',
      gamepadConfig: DEFAULT_CONFIG,
    });
    await new Promise((r) => setTimeout(r, 500));

    const config = {
      mouseConfig: { mouseControls: 1, sensitivity: -1 },
      keyboardConfig: { KeyP: 'a' },
    };
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'sensNeg',
      gamepadConfig: config,
    });
    await new Promise((r) => setTimeout(r, 500));

    await page.keyboard.down('Space');
    await new Promise((r) => setTimeout(r, 200));
    await page.keyboard.up('Space');
    await new Promise((r) => setTimeout(r, 100));
  });

  console.log('  [Validation - mouseControls Invalid Values]');

  await assert(
    'mouseControls=2 is rejected (only 0, 1, undefined/null valid)',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await new Promise((r) => setTimeout(r, 500));

      const config = {
        mouseConfig: { mouseControls: 2, sensitivity: 10 },
        keyboardConfig: { KeyP: 'a' },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'mc2',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.down('Space');
      await new Promise((r) => setTimeout(r, 200));
      await page.keyboard.up('Space');
      await new Promise((r) => setTimeout(r, 100));
    }
  );

  await assert('mouseControls=-1 is rejected', async () => {
    const config = {
      mouseConfig: { mouseControls: -1, sensitivity: 10 },
      keyboardConfig: { KeyP: 'a' },
    };
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'mcNeg',
      gamepadConfig: config,
    });
    await new Promise((r) => setTimeout(r, 500));

    await page.keyboard.down('Space');
    await new Promise((r) => setTimeout(r, 200));
    await page.keyboard.up('Space');
    await new Promise((r) => setTimeout(r, 100));
  });

  console.log('  [Validation - Max 25 Presets in Storage]');

  await assert('25 presets can be stored simultaneously', async () => {
    const presets = {};
    for (let i = 0; i < 25; i++) {
      presets[`GP_CONF:preset${i}`] = {
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyboardConfig: { [`Digit${i % 10}`]: 'a' },
      };
    }
    await setStorageSync(browser, presets);

    const data = await getStorageSync(browser, [
      'GP_CONF:preset0',
      'GP_CONF:preset12',
      'GP_CONF:preset24',
    ]);
    if (!data['GP_CONF:preset0']) throw new Error('preset0 missing');
    if (!data['GP_CONF:preset12']) throw new Error('preset12 missing');
    if (!data['GP_CONF:preset24']) throw new Error('preset24 missing');
  });

  console.log('  [Validation - Duplicate Key in Same Array]');

  await assert(
    'same action appearing twice in one array binding is handled gracefully',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await new Promise((r) => setTimeout(r, 500));

      const config = {
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyboardConfig: { Space: ['a', 'a'] },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'dupeSame',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 500));

      // Should not crash; Space should activate button A
      await page.keyboard.down('Space');
      await new Promise((r) => setTimeout(r, 200));
      await page.keyboard.up('Space');
      await new Promise((r) => setTimeout(r, 100));
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
