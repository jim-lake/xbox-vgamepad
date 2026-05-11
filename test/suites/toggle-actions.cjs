// Tests: toggleGamepad (per-index), toggleAllGamepads, toggleExtension
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
    getConnectionStatus,
    getEventCounts,
    waitForStatus,
    sendConfigToPage,
    setStorageSync,
    getStorageSync,
    getPadButtonStates,
    waitForPadButton,
  } = helpers;

  async function setup(gamepadConfig) {
    await releaseAll(page);
    await setStorageSync(browser, { ACTIVE_GP_CONF: 'default', ENABLED: true });
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'default',
      gamepadConfig,
    });
    await new Promise((r) => setTimeout(r, 500));
  }

  // ─── toggleGamepad (per-index) ────────────────────────────────────────────

  console.log('  [toggleGamepad - per-index]');

  const toggleGamepadConfig = {
    mouseConfig: { mouseControls: [] },
    keyboardConfig: {
      // F7 toggles pad 0 only
      F7: [{ type: 'action', gamepadIndex: 0, action: 'toggleGamepad' }],
      Space: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
    },
  };

  await setup(toggleGamepadConfig);

  await assert('toggleGamepad disconnects pad at gamepadIndex', async () => {
    await waitForStatus(page, 'connected', 5000);

    await page.keyboard.press('F7');
    await waitForStatus(page, 'disconnected', 3000);

    expect(await getConnectionStatus(page)).toBe('disconnected');
  });

  await assert('toggleGamepad reconnects pad at gamepadIndex', async () => {
    await page.keyboard.press('F7');
    await waitForStatus(page, 'connected', 5000);

    expect(await getConnectionStatus(page)).toBe('connected');
  });

  await assert('toggleGamepad fires connect/disconnect events', async () => {
    const before = await getEventCounts(page);

    await page.keyboard.press('F7');
    await waitForStatus(page, 'disconnected', 3000);
    await page.keyboard.press('F7');
    await waitForStatus(page, 'connected', 5000);

    const after = await getEventCounts(page);
    expect(after.disconnectCount).toBe(before.disconnectCount + 1);
    expect(after.connectCount).toBe(before.connectCount + 1);
  });

  await assert('inputs work after toggleGamepad reconnect', async () => {
    await page.keyboard.press('F7');
    await waitForStatus(page, 'disconnected', 3000);
    await page.keyboard.press('F7');
    await waitForStatus(page, 'connected', 5000);
    await new Promise((r) => setTimeout(r, 200));

    await page.keyboard.down('Space');
    await waitForPadButton(page, 0, 0, true);
    await page.keyboard.up('Space');
    await waitForPadButton(page, 0, 0, false);
  });

  // ─── toggleAllGamepads ────────────────────────────────────────────────────

  console.log('  [toggleAllGamepads]');

  const toggleAllConfig = {
    mouseConfig: { mouseControls: [] },
    keyboardConfig: {
      // F6 toggles all gamepads
      F6: [{ type: 'action', gamepadIndex: 0, action: 'toggleAllGamepads' }],
      Space: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
    },
  };

  await setup(toggleAllConfig);

  await assert('toggleAllGamepads disconnects all pads', async () => {
    await waitForStatus(page, 'connected', 5000);
    const before = await getEventCounts(page);

    await page.keyboard.press('F6');
    await waitForStatus(page, 'disconnected', 3000);

    const after = await getEventCounts(page);
    expect(after.disconnectCount).toBe(before.disconnectCount + 1);
  });

  await assert('toggleAllGamepads reconnects all pads', async () => {
    const before = await getEventCounts(page);

    await page.keyboard.press('F6');
    await waitForStatus(page, 'connected', 5000);

    const after = await getEventCounts(page);
    expect(after.connectCount).toBe(before.connectCount + 1);
  });

  await assert('inputs work after toggleAllGamepads reconnect', async () => {
    await page.keyboard.press('F6');
    await waitForStatus(page, 'disconnected', 3000);
    await page.keyboard.press('F6');
    await waitForStatus(page, 'connected', 5000);
    await new Promise((r) => setTimeout(r, 200));

    await page.keyboard.down('Space');
    await waitForPadButton(page, 0, 0, true);
    await page.keyboard.up('Space');
    await waitForPadButton(page, 0, 0, false);
  });

  // ─── toggleExtension ─────────────────────────────────────────────────────

  console.log('  [toggleExtension]');

  const toggleExtConfig = {
    mouseConfig: { mouseControls: [] },
    keyboardConfig: {
      // F5 toggles the extension (syncs ENABLED to storage)
      F5: [{ type: 'action', gamepadIndex: 0, action: 'toggleExtension' }],
    },
  };

  await setup(toggleExtConfig);

  await assert('toggleExtension sets ENABLED false in storage', async () => {
    await waitForStatus(page, 'connected', 5000);

    await page.keyboard.press('F5');
    await waitForStatus(page, 'disconnected', 5000);
    await new Promise((r) => setTimeout(r, 500));

    const data = await getStorageSync(browser, ['ENABLED']);
    expect(data.ENABLED).toBeFalse();
  });

  await assert(
    'toggleExtension sets ENABLED true in storage on re-enable',
    async () => {
      await page.keyboard.press('F5');
      await waitForStatus(page, 'connected', 5000);
      await new Promise((r) => setTimeout(r, 500));

      const data = await getStorageSync(browser, ['ENABLED']);
      expect(data.ENABLED).toBeTrue();
    }
  );

  await assert(
    'toggleExtension does not affect per-pad toggle state',
    async () => {
      // Disable via toggleExtension, then re-enable — pad should reconnect
      await page.keyboard.press('F5');
      await waitForStatus(page, 'disconnected', 5000);
      await new Promise((r) => setTimeout(r, 300));

      await page.keyboard.press('F5');
      await waitForStatus(page, 'connected', 5000);
      await new Promise((r) => setTimeout(r, 300));

      expect(await getConnectionStatus(page)).toBe('connected');
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
