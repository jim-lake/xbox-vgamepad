// Tests: Per-tab isolation — gamepad state, active profile, and enable/disable
// are independent across tabs. Actions in one tab must not affect another tab.
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
    waitForStatus,
    waitForButton: waitForButtonBg,
    getButtonStates,
    setStorageSync,
    sendConfigToPage,
    makeConfig,
    serverPort,
    waitForReady,
  } = helpers;
  // Use background-tab-safe button check for all per-tab tests
  const waitForButton = helpers.waitForButtonBg;

  // Helper: open a second tab pointing to the same test exerciser page
  async function openSecondTab() {
    const page2 = await browser.newPage();
    await page2.goto(`http://127.0.0.1:${serverPort()}/`, {
      waitUntil: 'load',
    });
    await page2.waitForFunction(
      () =>
        document.getElementById('status')?.getAttribute('data-ready') ===
        'true',
      { timeout: 10000 }
    );
    return page2;
  }

  // Ensure both tabs start with a connected gamepad
  await setStorageSync(browser, {
    'GP_CONF:default': DEFAULT_CONFIG,
    ACTIVE_GP_CONF: 'default',
    ENABLED: true,
  });
  await sendConfigToPage(page, {
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: 'default',
    gamepadConfig: DEFAULT_CONFIG,
  });
  await waitForStatus(page, 'connected', 5000);

  console.log('  [Per-Tab Isolation - Disable/Enable]');

  await assert(
    'disabling gamepad in tab1 does not disconnect tab2',
    async () => {
      const page2 = await openSecondTab();
      try {
        // Ensure tab2 has a connected gamepad
        await sendConfigToPage(page2, {
          type: 'ACTIVATE_GAMEPAD_CONFIG',
          name: 'default',
          gamepadConfig: DEFAULT_CONFIG,
        });
        await waitForStatus(page2, 'connected', 5000);

        // Disable in tab1
        await sendConfigToPage(page, { type: 'DISABLE_GAMEPAD' });
        await waitForStatus(page, 'disconnected', 5000);

        // Tab2 should still be connected
        await new Promise((r) => setTimeout(r, 500));
        const status2 = await getConnectionStatus(page2);
        expect(status2).toBe('connected');
      } finally {
        await page2.close();
      }
    }
  );

  await assert(
    'disabling gamepad in tab2 does not disconnect tab1',
    async () => {
      // Re-enable tab1
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await waitForStatus(page, 'connected', 5000);

      const page2 = await openSecondTab();
      try {
        await sendConfigToPage(page2, {
          type: 'ACTIVATE_GAMEPAD_CONFIG',
          name: 'default',
          gamepadConfig: DEFAULT_CONFIG,
        });
        await waitForStatus(page2, 'connected', 5000);

        // Disable tab2
        await sendConfigToPage(page2, { type: 'DISABLE_GAMEPAD' });
        await waitForStatus(page2, 'disconnected', 5000);

        // Tab1 should remain connected
        await new Promise((r) => setTimeout(r, 500));
        const status1 = await getConnectionStatus(page);
        expect(status1).toBe('connected');
      } finally {
        await page2.close();
      }
    }
  );

  await assert(
    'toggling extension off via storage in one tab does not affect other tab',
    async () => {
      // Both tabs start connected
      const page2 = await openSecondTab();
      try {
        await sendConfigToPage(page2, {
          type: 'ACTIVATE_GAMEPAD_CONFIG',
          name: 'default',
          gamepadConfig: DEFAULT_CONFIG,
        });
        await waitForStatus(page2, 'connected', 5000);

        // Simulate popup toggling extension off for tab1 only
        // The popup sends DISABLE_GAMEPAD to the active tab
        await sendConfigToPage(page, { type: 'DISABLE_GAMEPAD' });
        await waitForStatus(page, 'disconnected', 5000);

        // Tab2 should remain unaffected
        await new Promise((r) => setTimeout(r, 500));
        expect(await getConnectionStatus(page2)).toBe('connected');

        // Keys should still work in tab2
        await page2.keyboard.down('Space');
        await waitForButton(page2, 0, true, 3000);
        await page2.keyboard.up('Space');
        await waitForButton(page2, 0, false, 3000);
      } finally {
        await page2.close();
      }
    }
  );

  console.log('  [Per-Tab Isolation - Active Profile]');

  const customConfig = makeConfig({
    mouseConfig: { mouseControls: 1, sensitivity: 10 },
    keyboardConfig: { KeyP: 'a', KeyB: 'b' },
  });

  await assert(
    'switching profile in tab1 does not change bindings in tab2',
    async () => {
      // Re-enable tab1 with default
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await waitForStatus(page, 'connected', 5000);

      const page2 = await openSecondTab();
      try {
        await sendConfigToPage(page2, {
          type: 'ACTIVATE_GAMEPAD_CONFIG',
          name: 'default',
          gamepadConfig: DEFAULT_CONFIG,
        });
        await waitForStatus(page2, 'connected', 5000);

        // Switch tab1 to custom config (different keybindings)
        await setStorageSync(browser, { 'GP_CONF:custom': customConfig });
        await sendConfigToPage(page, {
          type: 'ACTIVATE_GAMEPAD_CONFIG',
          name: 'custom',
          gamepadConfig: customConfig,
        });
        await new Promise((r) => setTimeout(r, 500));

        // Tab2 should still use default bindings (Space = button A)
        await page2.keyboard.down('Space');
        await waitForButton(page2, 0, true, 3000);
        await page2.keyboard.up('Space');
        await waitForButton(page2, 0, false, 3000);

        // Tab2: 'p' should NOT map to button A (that's the custom config)
        await page2.keyboard.down('p');
        await new Promise((r) => setTimeout(r, 300));
        expect((await getButtonStates(page2))[0]).toBeFalse();
        await page2.keyboard.up('p');
      } finally {
        await page2.close();
      }
    }
  );

  await assert(
    'switching profile in tab2 does not change bindings in tab1',
    async () => {
      const page2 = await openSecondTab();
      try {
        // Tab1 is on custom (KeyP = a)
        // Switch tab2 to a different custom config
        const preset2 = makeConfig({
          mouseConfig: { mouseControls: null },
          keyboardConfig: { KeyI: 'a', KeyJ: 'start' },
        });
        await setStorageSync(browser, { 'GP_CONF:preset2': preset2 });
        await sendConfigToPage(page2, {
          type: 'ACTIVATE_GAMEPAD_CONFIG',
          name: 'preset2',
          gamepadConfig: preset2,
        });
        await waitForStatus(page2, 'connected', 5000);
        await new Promise((r) => setTimeout(r, 500));

        // Tab1 should still respond to KeyP (custom config)
        await page.keyboard.down('p');
        await waitForButton(page, 0, true, 3000);
        await page.keyboard.up('p');
        await waitForButton(page, 0, false, 3000);

        // Tab1 should NOT respond to KeyI (that's preset2 in tab2)
        await page.keyboard.down('i');
        await new Promise((r) => setTimeout(r, 300));
        expect((await getButtonStates(page))[0]).toBeFalse();
        await page.keyboard.up('i');
      } finally {
        await page2.close();
      }
    }
  );

  await assert(
    'ACTIVE_GP_CONF storage change from tab1 does not reconfigure tab2',
    async () => {
      // Restore tab1 to default
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await waitForStatus(page, 'connected', 5000);

      const page2 = await openSecondTab();
      try {
        await sendConfigToPage(page2, {
          type: 'ACTIVATE_GAMEPAD_CONFIG',
          name: 'default',
          gamepadConfig: DEFAULT_CONFIG,
        });
        await waitForStatus(page2, 'connected', 5000);

        // Write ACTIVE_GP_CONF change to storage (as if tab1's popup did it)
        await setStorageSync(browser, {
          ACTIVE_GP_CONF: 'custom',
          'GP_CONF:custom': customConfig,
        });
        await new Promise((r) => setTimeout(r, 1000));

        // Tab2 should still use default bindings (Space = button A)
        await page2.keyboard.down('Space');
        await waitForButton(page2, 0, true, 3000);
        await page2.keyboard.up('Space');
        await waitForButton(page2, 0, false, 3000);
      } finally {
        await page2.close();
      }
    }
  );

  console.log('  [Per-Tab Isolation - Keyboard Input]');

  await assert(
    'key press in tab1 does not produce gamepad input in tab2',
    async () => {
      // Restore tab1 default
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await waitForStatus(page, 'connected', 5000);

      const page2 = await openSecondTab();
      try {
        await sendConfigToPage(page2, {
          type: 'ACTIVATE_GAMEPAD_CONFIG',
          name: 'default',
          gamepadConfig: DEFAULT_CONFIG,
        });
        await waitForStatus(page2, 'connected', 5000);

        // Press Space in tab1
        await page.keyboard.down('Space');
        await waitForButton(page, 0, true, 3000);

        // Tab2 should NOT have button A pressed
        await new Promise((r) => setTimeout(r, 300));
        expect((await getButtonStates(page2))[0]).toBeFalse();

        await page.keyboard.up('Space');
        await waitForButton(page, 0, false, 3000);
      } finally {
        await page2.close();
      }
    }
  );

  await assert(
    'key press in tab2 does not produce gamepad input in tab1',
    async () => {
      const page2 = await openSecondTab();
      try {
        await sendConfigToPage(page2, {
          type: 'ACTIVATE_GAMEPAD_CONFIG',
          name: 'default',
          gamepadConfig: DEFAULT_CONFIG,
        });
        await waitForStatus(page2, 'connected', 5000);

        // Press Space in tab2
        await page2.keyboard.down('Space');
        await waitForButton(page2, 0, true, 3000);

        // Tab1 should NOT have button A pressed
        await new Promise((r) => setTimeout(r, 300));
        expect((await getButtonStates(page))[0]).toBeFalse();

        await page2.keyboard.up('Space');
        await waitForButton(page2, 0, false, 3000);
      } finally {
        await page2.close();
      }
    }
  );

  console.log('  [Per-Tab Isolation - ENABLED Storage Flag]');

  await assert(
    'setting ENABLED=false in storage does not disconnect already-active tabs',
    async () => {
      const page2 = await openSecondTab();
      try {
        await sendConfigToPage(page2, {
          type: 'ACTIVATE_GAMEPAD_CONFIG',
          name: 'default',
          gamepadConfig: DEFAULT_CONFIG,
        });
        await waitForStatus(page2, 'connected', 5000);

        // Write ENABLED=false to storage directly (simulates popup in another tab)
        await setStorageSync(browser, { ENABLED: false });
        await new Promise((r) => setTimeout(r, 1000));

        // Both tabs should remain connected — they already have active gamepads
        // The ENABLED flag should only affect NEW tab initialization
        expect(await getConnectionStatus(page)).toBe('connected');
        expect(await getConnectionStatus(page2)).toBe('connected');
      } finally {
        await page2.close();
      }
    }
  );

  await assert(
    'setting ENABLED=true in storage does not auto-enable a disabled tab',
    async () => {
      // Disable tab1 explicitly
      await sendConfigToPage(page, { type: 'DISABLE_GAMEPAD' });
      await waitForStatus(page, 'disconnected', 5000);

      // Set ENABLED=true in storage
      await setStorageSync(browser, { ENABLED: true });
      await new Promise((r) => setTimeout(r, 1000));

      // Tab1 should remain disconnected — it was explicitly disabled
      expect(await getConnectionStatus(page)).toBe('disconnected');
    }
  );

  console.log('  [Per-Tab Isolation - Toggle via Keybinding]');

  await assert(
    'toggleExtension keybinding in tab1 does not affect tab2',
    async () => {
      // Config with F8 = toggleExtension
      const toggleConfig = {
        ...DEFAULT_CONFIG,
        keyboardConfig: {
          ...DEFAULT_CONFIG.keyboardConfig,
          F8: [{ type: 'action', gamepadIndex: 0, action: 'toggleExtension' }],
        },
      };

      // Re-enable tab1 with toggle config
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'toggle',
        gamepadConfig: toggleConfig,
      });
      await waitForStatus(page, 'connected', 5000);

      const page2 = await openSecondTab();
      try {
        await sendConfigToPage(page2, {
          type: 'ACTIVATE_GAMEPAD_CONFIG',
          name: 'default',
          gamepadConfig: DEFAULT_CONFIG,
        });
        await waitForStatus(page2, 'connected', 5000);

        // Toggle off in tab1 via F8
        await page.keyboard.press('F8');
        await waitForStatus(page, 'disconnected', 5000);

        // Tab2 should remain connected
        await new Promise((r) => setTimeout(r, 500));
        expect(await getConnectionStatus(page2)).toBe('connected');

        // Keys should still work in tab2
        await page2.keyboard.down('Space');
        await waitForButton(page2, 0, true, 3000);
        await page2.keyboard.up('Space');
        await waitForButton(page2, 0, false, 3000);
      } finally {
        await page2.close();
      }
    }
  );

  await assert(
    'toggleExtension keybinding in tab2 does not affect tab1',
    async () => {
      const toggleConfig = {
        ...DEFAULT_CONFIG,
        keyboardConfig: {
          ...DEFAULT_CONFIG.keyboardConfig,
          F8: [{ type: 'action', gamepadIndex: 0, action: 'toggleExtension' }],
        },
      };

      // Re-enable tab1
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'toggle',
        gamepadConfig: toggleConfig,
      });
      await waitForStatus(page, 'connected', 5000);

      const page2 = await openSecondTab();
      try {
        await sendConfigToPage(page2, {
          type: 'ACTIVATE_GAMEPAD_CONFIG',
          name: 'toggle',
          gamepadConfig: toggleConfig,
        });
        await waitForStatus(page2, 'connected', 5000);

        // Toggle off in tab2 via F8
        await page2.keyboard.press('F8');
        await waitForStatus(page2, 'disconnected', 5000);

        // Tab1 should remain connected
        await new Promise((r) => setTimeout(r, 500));
        expect(await getConnectionStatus(page)).toBe('connected');

        // Keys still work in tab1
        await page.keyboard.down('Space');
        await waitForButton(page, 0, true, 3000);
        await page.keyboard.up('Space');
        await waitForButton(page, 0, false, 3000);
      } finally {
        await page2.close();
      }
    }
  );

  console.log('  [Per-Tab Isolation - Gamepad Connect/Disconnect Events]');

  await assert(
    'connecting gamepad in tab2 does not fire extra events in tab1',
    async () => {
      // Restore tab1
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await waitForStatus(page, 'connected', 5000);

      // Record current event counts in tab1
      const before = await page.evaluate(() => {
        const el = document.getElementById('event-log');
        return {
          connectCount: Number(el?.getAttribute('data-connect-count') || '0'),
          disconnectCount: Number(
            el?.getAttribute('data-disconnect-count') || '0'
          ),
        };
      });

      const page2 = await openSecondTab();
      try {
        // Activate gamepad in tab2
        await sendConfigToPage(page2, {
          type: 'ACTIVATE_GAMEPAD_CONFIG',
          name: 'default',
          gamepadConfig: DEFAULT_CONFIG,
        });
        await waitForStatus(page2, 'connected', 5000);
        await new Promise((r) => setTimeout(r, 500));

        // Tab1 should NOT have extra connect/disconnect events
        const after = await page.evaluate(() => {
          const el = document.getElementById('event-log');
          return {
            connectCount: Number(el?.getAttribute('data-connect-count') || '0'),
            disconnectCount: Number(
              el?.getAttribute('data-disconnect-count') || '0'
            ),
          };
        });
        expect(after.connectCount).toBe(before.connectCount);
        expect(after.disconnectCount).toBe(before.disconnectCount);
      } finally {
        await page2.close();
      }
    }
  );

  await assert(
    'disconnecting gamepad in tab2 does not fire disconnect in tab1',
    async () => {
      const page2 = await openSecondTab();
      try {
        await sendConfigToPage(page2, {
          type: 'ACTIVATE_GAMEPAD_CONFIG',
          name: 'default',
          gamepadConfig: DEFAULT_CONFIG,
        });
        await waitForStatus(page2, 'connected', 5000);

        // Record tab1 event counts
        const before = await page.evaluate(() => {
          const el = document.getElementById('event-log');
          return {
            connectCount: Number(el?.getAttribute('data-connect-count') || '0'),
            disconnectCount: Number(
              el?.getAttribute('data-disconnect-count') || '0'
            ),
          };
        });

        // Disconnect in tab2
        await sendConfigToPage(page2, { type: 'DISABLE_GAMEPAD' });
        await waitForStatus(page2, 'disconnected', 5000);
        await new Promise((r) => setTimeout(r, 500));

        // Tab1 events should be unchanged
        const after = await page.evaluate(() => {
          const el = document.getElementById('event-log');
          return {
            connectCount: Number(el?.getAttribute('data-connect-count') || '0'),
            disconnectCount: Number(
              el?.getAttribute('data-disconnect-count') || '0'
            ),
          };
        });
        expect(after.connectCount).toBe(before.connectCount);
        expect(after.disconnectCount).toBe(before.disconnectCount);
      } finally {
        await page2.close();
      }
    }
  );

  console.log('  [Per-Tab Isolation - Config Changes via Popup]');

  await assert(
    'CONFIG_CHANGED message to tab1 does not alter tab2 config',
    async () => {
      const page2 = await openSecondTab();
      try {
        await sendConfigToPage(page2, {
          type: 'ACTIVATE_GAMEPAD_CONFIG',
          name: 'default',
          gamepadConfig: DEFAULT_CONFIG,
        });
        await waitForStatus(page2, 'connected', 5000);

        // Send CONFIG_CHANGED to tab1 with custom bindings
        await sendConfigToPage(page, {
          type: 'CONFIG_CHANGED',
          name: 'custom',
          gamepadConfig: customConfig,
        });
        await new Promise((r) => setTimeout(r, 500));

        // Tab2 should still use default (Space = A)
        await page2.keyboard.down('Space');
        await waitForButton(page2, 0, true, 3000);
        await page2.keyboard.up('Space');
        await waitForButton(page2, 0, false, 3000);

        // Tab2: 'p' should not work (custom config key)
        await page2.keyboard.down('p');
        await new Promise((r) => setTimeout(r, 300));
        expect((await getButtonStates(page2))[0]).toBeFalse();
        await page2.keyboard.up('p');
      } finally {
        await page2.close();
      }
    }
  );

  await assert(
    'CONFIG_CHANGED message to tab2 does not alter tab1 config',
    async () => {
      // Restore tab1 to default
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await waitForStatus(page, 'connected', 5000);

      const page2 = await openSecondTab();
      try {
        await sendConfigToPage(page2, {
          type: 'ACTIVATE_GAMEPAD_CONFIG',
          name: 'default',
          gamepadConfig: DEFAULT_CONFIG,
        });
        await waitForStatus(page2, 'connected', 5000);

        // Send CONFIG_CHANGED to tab2 with custom bindings
        await sendConfigToPage(page2, {
          type: 'CONFIG_CHANGED',
          name: 'custom',
          gamepadConfig: customConfig,
        });
        await new Promise((r) => setTimeout(r, 500));

        // Tab1 should still use default (Space = A)
        await page.keyboard.down('Space');
        await waitForButton(page, 0, true, 3000);
        await page.keyboard.up('Space');
        await waitForButton(page, 0, false, 3000);
      } finally {
        await page2.close();
      }
    }
  );

  console.log('  [Per-Tab Isolation - Simultaneous Use]');

  await assert(
    'both tabs work independently with different configs at the same time',
    async () => {
      // Tab1 uses custom config (KeyP = a)
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'custom',
        gamepadConfig: customConfig,
      });
      await waitForStatus(page, 'connected', 5000);

      const page2 = await openSecondTab();
      try {
        // Tab2 uses default (Space = a)
        await sendConfigToPage(page2, {
          type: 'ACTIVATE_GAMEPAD_CONFIG',
          name: 'default',
          gamepadConfig: DEFAULT_CONFIG,
        });
        await waitForStatus(page2, 'connected', 5000);

        // Tab1: p works, space doesn't
        await page.keyboard.down('p');
        await waitForButton(page, 0, true, 3000);
        expect((await getButtonStates(page2))[0]).toBeFalse();
        await page.keyboard.up('p');
        await waitForButton(page, 0, false, 3000);

        // Tab2: space works, p doesn't
        await page2.keyboard.down('Space');
        await waitForButton(page2, 0, true, 3000);
        expect((await getButtonStates(page))[0]).toBeFalse();
        await page2.keyboard.up('Space');
        await waitForButton(page2, 0, false, 3000);
      } finally {
        await page2.close();
      }
    }
  );

  await assert(
    'one tab disabled, other tab still fully functional',
    async () => {
      // Restore tab1 to default
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await waitForStatus(page, 'connected', 5000);

      // Ensure new tabs init with default config
      await setStorageSync(browser, { ACTIVE_GP_CONF: 'default' });

      const page2 = await openSecondTab();
      try {
        await sendConfigToPage(page2, {
          type: 'ACTIVATE_GAMEPAD_CONFIG',
          name: 'default',
          gamepadConfig: DEFAULT_CONFIG,
        });
        await waitForStatus(page2, 'connected', 5000);

        // Disable tab1
        await sendConfigToPage(page, { type: 'DISABLE_GAMEPAD' });
        await waitForStatus(page, 'disconnected', 5000);

        // Tab2 should still be fully functional
        await page2.keyboard.down('Space');
        await waitForButton(page2, 0, true, 3000);
        await page2.keyboard.up('Space');
        await waitForButton(page2, 0, false, 3000);

        // Multiple buttons in tab2
        await page2.keyboard.down('b');
        await waitForButton(page2, 1, true, 3000);
        await page2.keyboard.up('b');
        await waitForButton(page2, 1, false, 3000);
      } finally {
        await page2.close();
      }
    }
  );

  // Restore state for subsequent test suites
  await sendConfigToPage(page, {
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: 'default',
    gamepadConfig: DEFAULT_CONFIG,
  });
  await waitForStatus(page, 'connected', 5000);
  await setStorageSync(browser, { ACTIVE_GP_CONF: 'default', ENABLED: true });
};
