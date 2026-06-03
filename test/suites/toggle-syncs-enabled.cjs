// Tests: toggleExtension keybinding toggles per-tab state (not global storage)
module.exports = async function ({
  page,
  browser,
  assert,
  expect,
  helpers,
  releaseAll,
  DEFAULT_CONFIG,
}) {
  const { waitForStatus, sendConfigToPage, getStorageSync, setStorageSync } =
    helpers;

  // Config with F8 bound to toggleExtension
  const toggleExtConfig = {
    ...DEFAULT_CONFIG,
    keyboardConfig: {
      ...DEFAULT_CONFIG.keyboardConfig,
      F8: [{ type: 'action', gamepadIndex: 0, action: 'toggleExtension' }],
    },
  };

  // Ensure we start clean with default config and enabled
  await releaseAll(page);
  await setStorageSync(browser, { ACTIVE_GP_CONF: 'default', ENABLED: true });
  await sendConfigToPage(page, {
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: 'default',
    gamepadConfig: toggleExtConfig,
  });
  await new Promise((r) => setTimeout(r, 500));

  console.log('  [Toggle Syncs Enabled State]');

  await assert(
    'F8 (toggleExtension) disconnects gamepad without writing ENABLED to storage',
    async () => {
      await releaseAll(page);
      await waitForStatus(page, 'connected', 5000);

      await page.keyboard.press('F8');
      await waitForStatus(page, 'disconnected', 5000);
      await new Promise((r) => setTimeout(r, 500));

      // Per-tab toggle should NOT write to global storage
      const data = await getStorageSync(browser, ['ENABLED']);
      expect(data.ENABLED).toBeTrue();
    }
  );

  await assert(
    'F8 (toggleExtension) reconnects gamepad without writing ENABLED to storage',
    async () => {
      await page.keyboard.press('F8');
      await waitForStatus(page, 'connected', 5000);
      await new Promise((r) => setTimeout(r, 500));

      const data = await getStorageSync(browser, ['ENABLED']);
      expect(data.ENABLED).toBeTrue();
    }
  );

  await assert(
    'Multiple toggles correctly cycle connect/disconnect',
    async () => {
      await releaseAll(page);

      // Toggle off
      await page.keyboard.press('F8');
      await waitForStatus(page, 'disconnected', 5000);

      // Toggle on
      await page.keyboard.press('F8');
      await waitForStatus(page, 'connected', 5000);

      // Toggle off again
      await page.keyboard.press('F8');
      await waitForStatus(page, 'disconnected', 5000);

      // Restore
      await page.keyboard.press('F8');
      await waitForStatus(page, 'connected', 5000);
    }
  );

  // Restore default config for subsequent suites
  await releaseAll(page);
  await setStorageSync(browser, { ENABLED: true });
  await sendConfigToPage(page, {
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: 'default',
    gamepadConfig: DEFAULT_CONFIG,
  });
  await new Promise((r) => setTimeout(r, 300));
};
