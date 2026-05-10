// Tests: Popup auto-save behavior — config saved to storage immediately,
// but only sent to content script (activating on page) on popup close.
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
    waitForButton,
    setStorageSync,
    getStorageSync,
    sendConfigToPage,
    makeConfig,
  } = helpers;

  console.log('  [Popup Auto-Save Behavior]');

  const baseConfig = makeConfig({
    mouseConfig: { mouseControls: 1, sensitivity: 10 },
    keyboardConfig: { KeyP: 'a' },
  });
  await setStorageSync(browser, {
    'GP_CONF:popuptest': baseConfig,
    ACTIVE_GP_CONF: 'popuptest',
    ENABLED: true,
  });
  await sendConfigToPage(page, {
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: 'popuptest',
    gamepadConfig: baseConfig,
  });
  await new Promise((r) => setTimeout(r, 300));

  await assert(
    'storage update alone does not change active page bindings',
    async () => {
      const editedConfig = makeConfig({
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyboardConfig: { KeyJ: 'a' },
      });
      await setStorageSync(browser, { 'GP_CONF:popuptest': editedConfig });

      const stored = await getStorageSync(browser, ['GP_CONF:popuptest']);
      expect(stored['GP_CONF:popuptest'].keyboardConfig.KeyJ?.[0]?.action).toBe(
        'a'
      );

      // Page still uses the OLD binding (KeyP)
      await page.keyboard.down('p');
      await new Promise((r) => setTimeout(r, 100));
      const states = await getButtonStates(page);
      expect(states[0]).toBeTrue();
      await page.keyboard.up('p');
      await new Promise((r) => setTimeout(r, 100));

      // New binding (KeyJ) should NOT work yet
      await page.keyboard.down('j');
      await new Promise((r) => setTimeout(r, 100));
      const states2 = await getButtonStates(page);
      expect(states2[0]).toBeFalse();
      await page.keyboard.up('j');
      await new Promise((r) => setTimeout(r, 100));
    }
  );

  await assert(
    'sending config to page activates new bindings (simulates popup close)',
    async () => {
      const editedConfig = makeConfig({
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyboardConfig: { KeyJ: 'a' },
      });
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'popuptest',
        gamepadConfig: editedConfig,
      });
      await new Promise((r) => setTimeout(r, 300));

      await page.keyboard.down('j');
      await new Promise((r) => setTimeout(r, 100));
      const states = await getButtonStates(page);
      expect(states[0]).toBeTrue();
      await page.keyboard.up('j');
      await new Promise((r) => setTimeout(r, 100));

      await page.keyboard.down('p');
      await new Promise((r) => setTimeout(r, 100));
      const states2 = await getButtonStates(page);
      expect(states2[0]).toBeFalse();
      await page.keyboard.up('p');
      await new Promise((r) => setTimeout(r, 100));
    }
  );

  await assert(
    'undo reverts storage to original config without affecting page',
    async () => {
      await setStorageSync(browser, { 'GP_CONF:popuptest': baseConfig });

      const stored = await getStorageSync(browser, ['GP_CONF:popuptest']);
      expect(stored['GP_CONF:popuptest'].keyboardConfig.KeyP?.[0]?.action).toBe(
        'a'
      );

      // Page still has the last-activated config (KeyJ)
      await page.keyboard.down('j');
      await new Promise((r) => setTimeout(r, 100));
      const states = await getButtonStates(page);
      expect(states[0]).toBeTrue();
      await page.keyboard.up('j');
      await new Promise((r) => setTimeout(r, 100));
    }
  );

  await assert(
    'undo followed by popup close activates reverted config',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'popuptest',
        gamepadConfig: baseConfig,
      });
      await new Promise((r) => setTimeout(r, 300));

      await page.keyboard.down('p');
      await new Promise((r) => setTimeout(r, 100));
      const states = await getButtonStates(page);
      expect(states[0]).toBeTrue();
      await page.keyboard.up('p');
      await new Promise((r) => setTimeout(r, 100));

      await page.keyboard.down('j');
      await new Promise((r) => setTimeout(r, 100));
      const states2 = await getButtonStates(page);
      expect(states2[0]).toBeFalse();
      await page.keyboard.up('j');
      await new Promise((r) => setTimeout(r, 100));
    }
  );

  // Restore default config
  await sendConfigToPage(page, {
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: 'default',
    gamepadConfig: DEFAULT_CONFIG,
  });
  await new Promise((r) => setTimeout(r, 300));
  await releaseAll(page);
};
