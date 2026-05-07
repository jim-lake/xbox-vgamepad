// Tests: Toggle keybinding, unlimited bindings per key, shared key codes across fields
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
    getEventCounts,
    waitForButton,
    waitForStatus,
    sendConfigToPage,
  } = helpers;

  // Ensure we start clean with default config
  await releaseAll(page);
  await sendConfigToPage(page, {
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: 'default',
    gamepadConfig: DEFAULT_CONFIG,
  });
  await new Promise((r) => setTimeout(r, 500));

  // ─── Toggle Keybinding ───────────────────────────────────────────────

  console.log('  [Toggle Keybinding]');

  await assert('F9 disconnects the gamepad', async () => {
    await releaseAll(page);
    const before = await getConnectionStatus(page);
    expect(before).toBe('connected');

    await page.keyboard.press('F9');
    await waitForStatus(page, 'disconnected', 3000);

    const after = await getConnectionStatus(page);
    expect(after).toBe('disconnected');
  });

  await assert('F9 reconnects the gamepad after disconnect', async () => {
    // Should be disconnected from previous test
    const before = await getConnectionStatus(page);
    expect(before).toBe('disconnected');

    await page.keyboard.press('F9');
    await waitForStatus(page, 'connected', 3000);

    const after = await getConnectionStatus(page);
    expect(after).toBe('connected');
  });

  await assert(
    'Toggle fires gamepadconnected/disconnected events',
    async () => {
      await releaseAll(page);
      const countsBefore = await getEventCounts(page);

      await page.keyboard.press('F9');
      await waitForStatus(page, 'disconnected', 3000);

      await page.keyboard.press('F9');
      await waitForStatus(page, 'connected', 3000);

      const countsAfter = await getEventCounts(page);
      expect(countsAfter.disconnectCount).toBe(
        countsBefore.disconnectCount + 1
      );
      expect(countsAfter.connectCount).toBe(countsBefore.connectCount + 1);
    }
  );

  await assert('Custom toggle keybinding works', async () => {
    await releaseAll(page);
    const customConfig = {
      ...DEFAULT_CONFIG,
      keyConfig: { ...DEFAULT_CONFIG.keyConfig, toggleGamepad: 'F8' },
    };
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'custom-toggle',
      gamepadConfig: customConfig,
    });
    await new Promise((r) => setTimeout(r, 300));

    await page.keyboard.press('F8');
    await waitForStatus(page, 'disconnected', 3000);

    await page.keyboard.press('F8');
    await waitForStatus(page, 'connected', 3000);

    // Restore default config
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'default',
      gamepadConfig: DEFAULT_CONFIG,
    });
    await new Promise((r) => setTimeout(r, 300));
  });

  await assert('Gamepad inputs work after toggle reconnect', async () => {
    await releaseAll(page);

    // Disconnect and reconnect
    await page.keyboard.press('F9');
    await waitForStatus(page, 'disconnected', 3000);
    await page.keyboard.press('F9');
    await waitForStatus(page, 'connected', 3000);
    await new Promise((r) => setTimeout(r, 200));

    // Verify inputs still work
    await page.keyboard.down('Space');
    await waitForButton(page, 0, true);
    const buttons = await getButtonStates(page);
    expect(buttons[0]).toBeTrue();
    await page.keyboard.up('Space');
    await waitForButton(page, 0, false);
  });

  // ─── Unlimited Bindings Per Key ──────────────────────────────────────

  console.log('  [Unlimited Bindings Per Key]');

  await assert(
    'More than 2 alternate bindings activate the same button',
    async () => {
      await releaseAll(page);
      const config = {
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyConfig: {
          a: ['Space', 'KeyP', 'KeyI', 'KeyU'],
          toggleGamepad: 'F9',
        },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'multi-bind',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 300));

      // Test each binding
      await page.keyboard.down('p');
      await waitForButton(page, 0, true);
      await page.keyboard.up('p');
      await waitForButton(page, 0, false);

      await page.keyboard.down('i');
      await waitForButton(page, 0, true);
      await page.keyboard.up('i');
      await waitForButton(page, 0, false);

      await page.keyboard.down('u');
      await waitForButton(page, 0, true);
      await page.keyboard.up('u');
      await waitForButton(page, 0, false);

      await page.keyboard.down('Space');
      await waitForButton(page, 0, true);
      await page.keyboard.up('Space');
      await waitForButton(page, 0, false);
    }
  );

  await assert('3 bindings on axis field all work', async () => {
    await releaseAll(page);
    const config = {
      mouseConfig: { mouseControls: 1, sensitivity: 10 },
      keyConfig: { leftStickUp: ['KeyW', 'KeyP', 'KeyI'], toggleGamepad: 'F9' },
    };
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'multi-axis',
      gamepadConfig: config,
    });
    await new Promise((r) => setTimeout(r, 300));

    await page.keyboard.down('p');
    await new Promise((r) => setTimeout(r, 100));
    let axes = await getAxesStates(page);
    expect(axes[1]).toBe(-1);
    await page.keyboard.up('p');
    await new Promise((r) => setTimeout(r, 100));

    await page.keyboard.down('i');
    await new Promise((r) => setTimeout(r, 100));
    axes = await getAxesStates(page);
    expect(axes[1]).toBe(-1);
    await page.keyboard.up('i');
    await new Promise((r) => setTimeout(r, 100));
  });

  // ─── Shared Key Codes (same key bound to multiple fields) ────────────

  console.log('  [Shared Key Codes]');

  await assert('One key activates two buttons simultaneously', async () => {
    await releaseAll(page);
    const config = {
      mouseConfig: { mouseControls: 1, sensitivity: 10 },
      keyConfig: { a: 'Space', b: 'Space', toggleGamepad: 'F9' },
    };
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'shared-key',
      gamepadConfig: config,
    });
    await new Promise((r) => setTimeout(r, 300));

    await page.keyboard.down('Space');
    await waitForButton(page, 0, true);
    await new Promise((r) => setTimeout(r, 100));
    const buttons = await getButtonStates(page);
    expect(buttons[0]).toBeTrue();
    expect(buttons[1]).toBeTrue();

    await page.keyboard.up('Space');
    await waitForButton(page, 0, false);
    await new Promise((r) => setTimeout(r, 100));
    const buttonsAfter = await getButtonStates(page);
    expect(buttonsAfter[0]).toBeFalse();
    expect(buttonsAfter[1]).toBeFalse();
  });

  await assert('One key activates button and axis simultaneously', async () => {
    await releaseAll(page);
    const config = {
      mouseConfig: { mouseControls: 1, sensitivity: 10 },
      keyConfig: { a: 'KeyW', leftStickUp: 'KeyW', toggleGamepad: 'F9' },
    };
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'shared-btn-axis',
      gamepadConfig: config,
    });
    await new Promise((r) => setTimeout(r, 300));

    await page.keyboard.down('w');
    await waitForButton(page, 0, true);
    await new Promise((r) => setTimeout(r, 100));
    const buttons = await getButtonStates(page);
    const axes = await getAxesStates(page);
    expect(buttons[0]).toBeTrue();
    expect(axes[1]).toBe(-1);

    await page.keyboard.up('w');
    await waitForButton(page, 0, false);
    await new Promise((r) => setTimeout(r, 100));
    const buttonsAfter = await getButtonStates(page);
    const axesAfter = await getAxesStates(page);
    expect(buttonsAfter[0]).toBeFalse();
    expect(axesAfter[1]).toBe(0);
  });

  await assert('Shared key in arrays works', async () => {
    await releaseAll(page);
    const config = {
      mouseConfig: { mouseControls: 1, sensitivity: 10 },
      keyConfig: {
        a: ['Space', 'KeyP'],
        x: ['KeyP', 'KeyR'],
        toggleGamepad: 'F9',
      },
    };
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'shared-array',
      gamepadConfig: config,
    });
    await new Promise((r) => setTimeout(r, 300));

    // KeyP is shared between a and x
    await page.keyboard.down('p');
    await waitForButton(page, 0, true);
    await new Promise((r) => setTimeout(r, 100));
    const buttons = await getButtonStates(page);
    expect(buttons[0]).toBeTrue(); // a
    expect(buttons[2]).toBeTrue(); // x

    await page.keyboard.up('p');
    await waitForButton(page, 0, false);
    await new Promise((r) => setTimeout(r, 100));

    // Space only activates a
    await page.keyboard.down('Space');
    await waitForButton(page, 0, true);
    await new Promise((r) => setTimeout(r, 100));
    const buttons2 = await getButtonStates(page);
    expect(buttons2[0]).toBeTrue();
    expect(buttons2[2]).toBeFalse();
    await page.keyboard.up('Space');
    await waitForButton(page, 0, false);
  });

  // Restore default config for subsequent suites
  await releaseAll(page);
  await sendConfigToPage(page, {
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: 'default',
    gamepadConfig: DEFAULT_CONFIG,
  });
  await new Promise((r) => setTimeout(r, 300));
};
