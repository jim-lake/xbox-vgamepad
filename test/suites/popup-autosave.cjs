// Tests: Popup auto-save behavior — config saved to storage immediately,
// but only sent to content script (activating on page) on popup close.
module.exports = async function ({
  page,
  browser,
  assert,
  expect,
  helpers,
  releaseAll,
}) {
  const {
    getButtonStates,
    waitForButton,
    setStorageSync,
    getStorageSync,
    sendConfigToPage,
  } = helpers;

  console.log('  [Popup Auto-Save Behavior]');

  // Start with a known config active on the page
  const baseConfig = {
    mouseConfig: { mouseControls: 1, sensitivity: 10 },
    keyConfig: { a: 'KeyP' },
  };
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
      // Simulate popup editing: save new config to storage but do NOT send to page
      const editedConfig = {
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyConfig: { a: 'KeyJ' },
      };
      await setStorageSync(browser, { 'GP_CONF:popuptest': editedConfig });

      // Verify storage was updated
      const stored = await getStorageSync(browser, ['GP_CONF:popuptest']);
      expect(stored['GP_CONF:popuptest'].keyConfig.a).toBe('KeyJ');

      // But the page still uses the OLD binding (KeyP)
      await page.keyboard.down('p');
      await new Promise((r) => setTimeout(r, 100));
      const states = await getButtonStates(page);
      expect(states[0]).toBeTrue(); // A button pressed via old KeyP binding
      await page.keyboard.up('p');
      await new Promise((r) => setTimeout(r, 100));

      // New binding (KeyJ) should NOT work yet
      await page.keyboard.down('j');
      await new Promise((r) => setTimeout(r, 100));
      const states2 = await getButtonStates(page);
      expect(states2[0]).toBeFalse(); // KeyJ not active on page
      await page.keyboard.up('j');
      await new Promise((r) => setTimeout(r, 100));
    }
  );

  await assert(
    'sending config to page activates new bindings (simulates popup close)',
    async () => {
      // Simulate popup close: send the edited config to the page
      const editedConfig = {
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyConfig: { a: 'KeyJ' },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'popuptest',
        gamepadConfig: editedConfig,
      });
      await new Promise((r) => setTimeout(r, 300));

      // Now KeyJ should work
      await page.keyboard.down('j');
      await new Promise((r) => setTimeout(r, 100));
      const states = await getButtonStates(page);
      expect(states[0]).toBeTrue();
      await page.keyboard.up('j');
      await new Promise((r) => setTimeout(r, 100));

      // Old KeyP should no longer work
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
      // Simulate undo: write original config back to storage
      await setStorageSync(browser, { 'GP_CONF:popuptest': baseConfig });

      // Verify storage reverted
      const stored = await getStorageSync(browser, ['GP_CONF:popuptest']);
      expect(stored['GP_CONF:popuptest'].keyConfig.a).toBe('KeyP');

      // Page still has the last-activated config (KeyJ) until popup closes
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
      // Simulate popup close after undo: send the reverted config
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'popuptest',
        gamepadConfig: baseConfig,
      });
      await new Promise((r) => setTimeout(r, 300));

      // KeyP works again
      await page.keyboard.down('p');
      await new Promise((r) => setTimeout(r, 100));
      const states = await getButtonStates(page);
      expect(states[0]).toBeTrue();
      await page.keyboard.up('p');
      await new Promise((r) => setTimeout(r, 100));

      // KeyJ no longer works
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
    gamepadConfig: {
      mouseConfig: { mouseControls: 1, sensitivity: 10 },
      keyConfig: {
        a: 'Space',
        b: ['ControlLeft', 'Backspace'],
        x: 'KeyR',
        y: ['KeyV', 'Scroll'],
        leftShoulder: ['KeyC', 'KeyG'],
        leftTrigger: 'RightClick',
        rightShoulder: 'KeyQ',
        rightTrigger: 'Click',
        start: 'Enter',
        select: 'Tab',
        dpadUp: ['ArrowUp', 'KeyX'],
        dpadLeft: ['ArrowLeft', 'KeyN'],
        dpadDown: ['ArrowDown', 'KeyZ'],
        dpadRight: 'ArrowRight',
        leftStickUp: 'KeyW',
        leftStickLeft: 'KeyA',
        leftStickDown: 'KeyS',
        leftStickRight: 'KeyD',
        rightStickUp: 'KeyO',
        rightStickLeft: 'KeyK',
        rightStickDown: 'KeyL',
        rightStickRight: 'Semicolon',
        leftStickPressed: 'ShiftLeft',
        rightStickPressed: 'KeyF',
        toggleGamepad: 'F9',
      },
    },
  });
  await new Promise((r) => setTimeout(r, 300));
  await releaseAll(page);
};
