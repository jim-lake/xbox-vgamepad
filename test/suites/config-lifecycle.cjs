// Tests: End-to-end config lifecycle — config stored in chrome.storage.sync,
// background delivers it on game start, config changes propagate,
// full round-trip from storage → background → content script → injected → gamepad
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
    getConnectionStatus,
    waitForButton,
    waitForAxis,
    waitForAxesCentered,
    waitForStatus,
    setStorageSync,
    getStorageSync,
    sendConfigToPage,
  } = helpers;

  console.log('  [Config Lifecycle - Storage → Activation → Input]');

  await assert(
    'config written to storage can be activated and produces correct input',
    async () => {
      const config = {
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyboardConfig: {
          KeyP: 'a',
          KeyB: 'b',
          KeyI: 'x',
          KeyW: 'leftStickUp',
          KeyD: 'leftStickRight',
        },
      };
      await setStorageSync(browser, {
        'GP_CONF:lifecycle': config,
        ACTIVE_GP_CONF: 'lifecycle',
        ENABLED: true,
      });

      // Verify storage round-trip
      const stored = await getStorageSync(browser, ['GP_CONF:lifecycle']);
      expect(stored['GP_CONF:lifecycle'].keyboardConfig.KeyP).toBe('a');

      // Activate
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'lifecycle',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 500));

      // Verify buttons
      await page.keyboard.down('p');
      await waitForButton(page, 0, true);
      await page.keyboard.up('p');
      await waitForButton(page, 0, false);

      await page.keyboard.down('b');
      await waitForButton(page, 1, true);
      await page.keyboard.up('b');
      await waitForButton(page, 1, false);

      // Verify axes
      await page.keyboard.down('w');
      await waitForAxis(page, 1, 'lt', -0.5);
      await page.keyboard.up('w');
      await waitForAxesCentered(page);
    }
  );

  console.log('  [Config Lifecycle - Disable → Storage Update → Re-enable]');

  await assert(
    'disable, update storage, re-enable with new config works',
    async () => {
      await sendConfigToPage(page, { type: 'DISABLE_GAMEPAD' });
      await waitForStatus(page, 'disconnected');

      const newConfig = {
        mouseConfig: { mouseControls: 0, sensitivity: 20 },
        keyboardConfig: { KeyJ: 'a', KeyH: 'start' },
      };
      await setStorageSync(browser, {
        'GP_CONF:updated': newConfig,
        ACTIVE_GP_CONF: 'updated',
        ENABLED: true,
      });

      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'updated',
        gamepadConfig: newConfig,
      });
      await waitForStatus(page, 'connected');

      await page.keyboard.down('j');
      await waitForButton(page, 0, true);
      await page.keyboard.up('j');
      await waitForButton(page, 0, false);

      await page.keyboard.down('h');
      await waitForButton(page, 9, true);
      await page.keyboard.up('h');
      await waitForButton(page, 9, false);

      // Old binding should not work
      await page.keyboard.down('p');
      await new Promise((r) => setTimeout(r, 200));
      expect((await getButtonStates(page))[0]).toBeFalse();
      await page.keyboard.up('p');
    }
  );

  console.log('  [Config Lifecycle - Multiple Preset Switching]');

  await assert(
    'switching between 3 stored presets activates correct bindings each time',
    async () => {
      const presets = {
        'GP_CONF:fps': {
          mouseConfig: { mouseControls: 1, sensitivity: 15 },
          keyboardConfig: { Space: 'a', KeyB: 'b', Click: 'rightTrigger' },
        },
        'GP_CONF:racing': {
          mouseConfig: { mouseControls: 0, sensitivity: 5 },
          keyboardConfig: {
            KeyW: 'rightTrigger',
            KeyS: 'leftTrigger',
            KeyP: 'a',
          },
        },
        'GP_CONF:fighting': {
          mouseConfig: { mouseControls: undefined, sensitivity: 10 },
          keyboardConfig: {
            KeyJ: 'a',
            KeyK: 'b',
            KeyU: 'x',
            KeyI: 'y',
            KeyA: 'leftStickLeft',
            KeyD: 'leftStickRight',
          },
        },
      };
      await setStorageSync(browser, presets);

      // Activate FPS preset
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'fps',
        gamepadConfig: presets['GP_CONF:fps'],
      });
      await new Promise((r) => setTimeout(r, 500));
      await page.keyboard.down('Space');
      await waitForButton(page, 0, true);
      await page.keyboard.up('Space');
      await waitForButton(page, 0, false);

      // Switch to racing
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'racing',
        gamepadConfig: presets['GP_CONF:racing'],
      });
      await new Promise((r) => setTimeout(r, 500));
      await page.keyboard.down('p');
      await waitForButton(page, 0, true);
      await page.keyboard.up('p');
      await waitForButton(page, 0, false);
      await page.keyboard.down('Space');
      await new Promise((r) => setTimeout(r, 200));
      expect((await getButtonStates(page))[0]).toBeFalse();
      await page.keyboard.up('Space');

      // Switch to fighting
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'fighting',
        gamepadConfig: presets['GP_CONF:fighting'],
      });
      await new Promise((r) => setTimeout(r, 500));
      await page.keyboard.down('j');
      await waitForButton(page, 0, true);
      await page.keyboard.up('j');
      await waitForButton(page, 0, false);
      await page.keyboard.down('k');
      await waitForButton(page, 1, true);
      await page.keyboard.up('k');
      await waitForButton(page, 1, false);
      await page.keyboard.down('a');
      await waitForAxis(page, 0, 'lt', -0.5);
      await page.keyboard.up('a');
      await waitForAxesCentered(page);
    }
  );

  console.log(
    '  [Config Lifecycle - Storage Persistence Across Disable/Enable]'
  );

  await assert(
    'config persists in storage across disable/enable cycles',
    async () => {
      const config = {
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyboardConfig: { KeyM: 'a' },
      };
      await setStorageSync(browser, {
        'GP_CONF:persist': config,
        ACTIVE_GP_CONF: 'persist',
        ENABLED: true,
      });

      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'persist',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 500));
      await page.keyboard.down('m');
      await waitForButton(page, 0, true);
      await page.keyboard.up('m');
      await waitForButton(page, 0, false);

      await sendConfigToPage(page, { type: 'DISABLE_GAMEPAD' });
      await waitForStatus(page, 'disconnected');

      const stored = await getStorageSync(browser, ['GP_CONF:persist']);
      if (!stored['GP_CONF:persist'])
        throw new Error('Config lost from storage after disable');

      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'persist',
        gamepadConfig: config,
      });
      await waitForStatus(page, 'connected');
      await page.keyboard.down('m');
      await waitForButton(page, 0, true);
      await page.keyboard.up('m');
      await waitForButton(page, 0, false);
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
