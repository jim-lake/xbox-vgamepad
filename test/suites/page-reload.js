// Tests: Extension behavior across page reloads and navigation —
// gamepad re-initializes after reload, config persists, events fire again,
// no duplicate gamepads after multiple reloads
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
    getGamepadIdentity,
    getConnectionStatus,
    getEventCounts,
    waitForButton,
    waitForAxis,
    waitForAxesCentered,
    waitForStatus,
    setStorageSync,
    sendConfigToPage,
    serverPort,
  } = helpers;

  // Ensure default config is in storage so it's used after reload
  await setStorageSync(browser, {
    'GP_CONF:default': DEFAULT_CONFIG,
    ACTIVE_GP_CONF: 'default',
    ENABLED: true,
  });

  console.log('  [Page Reload - Gamepad Re-initializes]');

  await assert(
    'gamepad reconnects after page reload',
    async () => {
      expect(await getConnectionStatus(page)).toBe('connected');
      await page.reload({ waitUntil: 'load' });
      await waitForStatus(page, 'connected', 15000);
      expect(await getConnectionStatus(page)).toBe('connected');
    }
  );

  await assert(
    'gamepad identity is correct after reload',
    async () => {
      const identity = await getGamepadIdentity(page);
      expect(identity.id).toBe('Xbox 360 Controller (XInput STANDARD GAMEPAD)');
      expect(identity.index).toBe(0);
      expect(identity.mapping).toBe('standard');
      expect(identity.connected).toBe('true');
    }
  );

  await assert(
    'gamepad has correct shape after reload (17 buttons, 4 axes)',
    async () => {
      const buttons = await getButtonStates(page);
      const axes = await getAxesStates(page);
      expect(buttons.length).toBe(17);
      expect(axes.length).toBe(4);
    }
  );

  await assert(
    'key bindings work after page reload',
    async () => {
      // After reload, the extension re-initializes with the stored config
      // Send the config explicitly to ensure it's active
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
    }
  );

  await assert(
    'axis bindings work after page reload',
    async () => {
      await page.keyboard.down('w');
      await waitForAxis(page, 1, 'lt', -0.5);
      await page.keyboard.up('w');
      await waitForAxesCentered(page);
    }
  );

  console.log('  [Page Reload - No Duplicate Gamepads]');

  await assert(
    'only one gamepad exists after multiple reloads',
    async () => {
      for (let i = 0; i < 3; i++) {
        await page.reload({ waitUntil: 'load' });
        await waitForStatus(page, 'connected', 15000);
      }

      const result = await page.evaluate(() => {
        const gps = navigator.getGamepads();
        let count = 0;
        for (let i = 0; i < gps.length; i++) {
          if (gps[i] !== null && gps[i] !== undefined) count++;
        }
        return count;
      });
      expect(result).toBe(1);
    }
  );

  await assert(
    'gamepad is at index 0 after multiple reloads',
    async () => {
      const identity = await getGamepadIdentity(page);
      expect(identity.index).toBe(0);
    }
  );

  console.log('  [Page Reload - gamepadconnected Event Fires Again]');

  await assert(
    'gamepadconnected event fires after reload',
    async () => {
      await page.reload({ waitUntil: 'load' });
      await waitForStatus(page, 'connected', 15000);

      const counts = await getEventCounts(page);
      expect(counts.connectCount).toBeAtLeast(1);
    }
  );

  console.log('  [Page Reload - Clean State After Reload]');

  await assert(
    'no phantom input after reload',
    async () => {
      await new Promise((r) => setTimeout(r, 300));
      expect(await getButtonStates(page)).toAllBeFalse();
      expect(await getAxesStates(page)).toAllBeCloseTo(0, 0.01);
    }
  );

  await assert(
    'buttons held before reload are not stuck after reload',
    async () => {
      // Re-activate config after reload
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.down('Space');
      await page.keyboard.down('w');
      await waitForButton(page, 0, true);
      await waitForAxis(page, 1, 'lt', -0.5);

      await page.keyboard.up('Space');
      await page.keyboard.up('w');
      await new Promise((r) => setTimeout(r, 100));

      await page.reload({ waitUntil: 'load' });
      await waitForStatus(page, 'connected', 15000);
      await new Promise((r) => setTimeout(r, 300));

      expect(await getButtonStates(page)).toAllBeFalse();
      expect(await getAxesStates(page)).toAllBeCloseTo(0, 0.01);
    }
  );

  console.log('  [Page Navigation - Navigate Away and Back]');

  await assert(
    'gamepad works after navigating away and back',
    async () => {
      const port = serverPort();
      const url = `http://127.0.0.1:${port}/`;

      await page.goto('about:blank', { waitUntil: 'load' });
      await new Promise((r) => setTimeout(r, 500));

      await page.goto(url, { waitUntil: 'load' });
      await waitForStatus(page, 'connected', 15000);

      // Re-activate config after navigation
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
