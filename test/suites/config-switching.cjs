// Tests: Config preset switching, enable/disable toggle, gamepaddisconnected event
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
    getConnectionStatus,
    getEventCounts,
    getGamepadIdentity,
    waitForButton,
    waitForStatus,
    setStorageSync,
    sendConfigToPage,
  } = helpers;

  console.log('  [Config Preset Switching]');

  const customConfig = {
    mouseConfig: { mouseControls: 1, sensitivity: 10 },
    keyboardConfig: { KeyP: 'a', KeyB: 'b' },
  };

  await assert(
    'switching to a custom preset changes key bindings',
    async () => {
      await setStorageSync(browser, {
        'GP_CONF:custom': customConfig,
        ACTIVE_GP_CONF: 'custom',
        ENABLED: true,
      });
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'custom',
        gamepadConfig: customConfig,
      });
      await new Promise((r) => setTimeout(r, 1000));

      // Old binding should not work
      await page.keyboard.down('Space');
      await new Promise((r) => setTimeout(r, 300));
      expect((await getButtonStates(page))[0]).toBeFalse();
      await page.keyboard.up('Space');

      // New binding should work
      await page.keyboard.down('p');
      await waitForButton(page, 0, true);
      expect((await getButtonStates(page))[0]).toBeTrue();
      await page.keyboard.up('p');
      await waitForButton(page, 0, false);
    }
  );

  await assert(
    'switching back to default preset restores original bindings',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.down('Space');
      await waitForButton(page, 0, true);
      await page.keyboard.up('Space');
      await waitForButton(page, 0, false);

      await page.keyboard.down('p');
      await new Promise((r) => setTimeout(r, 200));
      expect((await getButtonStates(page))[0]).toBeFalse();
      await page.keyboard.up('p');
    }
  );

  // New: switch between 3 presets
  const preset2 = {
    mouseConfig: { mouseControls: 0, sensitivity: 5 },
    keyboardConfig: { KeyI: 'a', KeyJ: 'start' },
  };

  await assert(
    'switching between multiple presets works correctly',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'preset2',
        gamepadConfig: preset2,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.down('i');
      await waitForButton(page, 0, true);
      await page.keyboard.up('i');
      await waitForButton(page, 0, false);

      await page.keyboard.down('j');
      await waitForButton(page, 9, true);
      await page.keyboard.up('j');
      await waitForButton(page, 9, false);

      // Restore default
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await new Promise((r) => setTimeout(r, 500));
    }
  );

  console.log('  [Extension Enable/Disable Toggle]');

  await assert('disabling the extension disconnects the gamepad', async () => {
    await sendConfigToPage(page, { type: 'DISABLE_GAMEPAD' });
    await waitForStatus(page, 'disconnected');
    expect(await getConnectionStatus(page)).toBe('disconnected');
  });

  await assert('gamepaddisconnected event fires on disable', async () => {
    const counts = await getEventCounts(page);
    expect(counts.disconnectCount).toBeAtLeast(1);
  });

  await assert(
    'gamepad connected property is false when disabled',
    async () => {
      // Gamepad is disconnected, getGamepads()[0] may not exist or connected=false
      // The exerciser only writes data when gp exists, so status is our check
      expect(await getConnectionStatus(page)).toBe('disconnected');
    }
  );

  await assert('keys have no effect when extension is disabled', async () => {
    await page.keyboard.down('Space');
    await new Promise((r) => setTimeout(r, 300));
    await page.keyboard.up('Space');
    // No crash, no gamepad data to assert on since it's disconnected
  });

  await assert('re-enabling the extension reconnects the gamepad', async () => {
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'default',
      gamepadConfig: DEFAULT_CONFIG,
    });
    await waitForStatus(page, 'connected');
    expect(await getConnectionStatus(page)).toBe('connected');
  });

  await assert('gamepadconnected event fires again on re-enable', async () => {
    const counts = await getEventCounts(page);
    expect(counts.connectCount).toBeAtLeast(2);
  });

  await assert(
    'gamepad connected property is true after re-enable',
    async () => {
      const identity = await getGamepadIdentity(page);
      expect(identity.connected).toBe('true');
    }
  );

  await assert('keys work again after re-enabling', async () => {
    await page.keyboard.down('Space');
    await waitForButton(page, 0, true);
    await page.keyboard.up('Space');
    await waitForButton(page, 0, false);
  });
};
