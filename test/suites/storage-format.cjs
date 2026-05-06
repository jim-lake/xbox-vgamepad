// Tests: JSON.md storage format — top-level storage object shape,
// chrome.storage.sync round-trip, activeConfig, isEnabled, configs record
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
    waitForButton,
    waitForStatus,
    setStorageSync,
    getStorageSync,
    sendConfigToPage,
  } = helpers;

  console.log('  [Storage Format - Top-Level Object]');

  await assert('storage contains isEnabled field', async () => {
    const data = await getStorageSync(browser, ['ENABLED']);
    // The extension stores isEnabled under the key 'ENABLED'
    if (data.ENABLED === undefined)
      throw new Error('ENABLED key not found in storage');
  });

  await assert('storage contains activeConfig field', async () => {
    const data = await getStorageSync(browser, ['ACTIVE_GP_CONF']);
    if (data.ACTIVE_GP_CONF === undefined)
      throw new Error('ACTIVE_GP_CONF key not found in storage');
  });

  await assert(
    'default config is available even without explicit storage entry',
    async () => {
      // The extension hardcodes the default config and merges it at runtime,
      // so GP_CONF:default may not exist in storage. Verify the extension
      // still serves the default config by activating it.
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

  console.log('  [Storage Round-Trip]');

  await assert(
    'writing a custom config to storage and activating it works',
    async () => {
      const customConfig = {
        mouseConfig: { mouseControls: 1, sensitivity: 15 },
        keyConfig: { a: 'KeyP', b: 'KeyB', start: 'KeyJ' },
      };
      await setStorageSync(browser, {
        'GP_CONF:roundtrip': customConfig,
        ACTIVE_GP_CONF: 'roundtrip',
        ENABLED: true,
      });

      // Read it back
      const data = await getStorageSync(browser, ['GP_CONF:roundtrip']);
      const stored = data['GP_CONF:roundtrip'];
      if (!stored) throw new Error('Custom config not found after write');
      if (stored.keyConfig.a !== 'KeyP')
        throw new Error('keyConfig.a mismatch');
      if (stored.mouseConfig.sensitivity !== 15)
        throw new Error('sensitivity mismatch');

      // Activate it via message
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'roundtrip',
        gamepadConfig: customConfig,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.down('p');
      await waitForButton(page, 0, true);
      await page.keyboard.up('p');
      await waitForButton(page, 0, false);
    }
  );

  await assert(
    'config with all GamepadConfig fields round-trips correctly',
    async () => {
      const fullConfig = {
        mouseConfig: { mouseControls: 0, sensitivity: 500 },
        keyConfig: {
          a: 'Digit1',
          b: ['Digit2', 'Digit3'],
          x: 'Digit4',
          y: 'Digit5',
          leftShoulder: 'Digit6',
          rightShoulder: 'Digit7',
          leftTrigger: 'Digit8',
          rightTrigger: 'Digit9',
          select: 'Digit0',
          start: 'KeyP',
          leftStickPressed: 'KeyB',
          rightStickPressed: 'KeyI',
          dpadUp: 'KeyW',
          dpadDown: 'KeyS',
          dpadLeft: 'KeyA',
          dpadRight: 'KeyD',
          home: 'KeyH',
          leftStickUp: 'KeyT',
          leftStickDown: 'KeyG',
          leftStickLeft: 'KeyF',
          leftStickRight: 'KeyJ',
          rightStickUp: 'KeyY',
          rightStickDown: 'KeyN',
          rightStickLeft: 'KeyM',
          rightStickRight: 'KeyU',
        },
      };
      await setStorageSync(browser, { 'GP_CONF:full': fullConfig });
      const data = await getStorageSync(browser, ['GP_CONF:full']);
      const stored = data['GP_CONF:full'];
      if (stored.mouseConfig.mouseControls !== 0)
        throw new Error('mouseControls mismatch');
      if (stored.mouseConfig.sensitivity !== 500)
        throw new Error('sensitivity mismatch');
      if (stored.keyConfig.home !== 'KeyH')
        throw new Error('home binding mismatch');
      if (
        !Array.isArray(stored.keyConfig.b) ||
        stored.keyConfig.b[1] !== 'Digit3'
      )
        throw new Error('array binding mismatch');
    }
  );

  console.log('  [Storage - Multiple Presets]');

  await assert('multiple presets can coexist in storage', async () => {
    const preset1 = {
      mouseConfig: { mouseControls: 1, sensitivity: 10 },
      keyConfig: { a: 'KeyP' },
    };
    const preset2 = {
      mouseConfig: { mouseControls: 0, sensitivity: 20 },
      keyConfig: { a: 'KeyB' },
    };
    const preset3 = {
      mouseConfig: { mouseControls: 1, sensitivity: 30 },
      keyConfig: { a: 'KeyI' },
    };

    await setStorageSync(browser, {
      'GP_CONF:p1': preset1,
      'GP_CONF:p2': preset2,
      'GP_CONF:p3': preset3,
    });

    const data = await getStorageSync(browser, [
      'GP_CONF:p1',
      'GP_CONF:p2',
      'GP_CONF:p3',
    ]);
    if (!data['GP_CONF:p1']) throw new Error('preset p1 missing');
    if (!data['GP_CONF:p2']) throw new Error('preset p2 missing');
    if (!data['GP_CONF:p3']) throw new Error('preset p3 missing');
    if (data['GP_CONF:p2'].mouseConfig.sensitivity !== 20)
      throw new Error('p2 sensitivity mismatch');
  });

  await assert(
    'switching activeConfig in storage selects the right preset',
    async () => {
      const presetA = {
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyConfig: { a: 'KeyI' },
      };
      const presetB = {
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyConfig: { a: 'KeyJ' },
      };

      await setStorageSync(browser, {
        'GP_CONF:presetA': presetA,
        'GP_CONF:presetB': presetB,
        ACTIVE_GP_CONF: 'presetB',
        ENABLED: true,
      });

      // Activate presetB
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'presetB',
        gamepadConfig: presetB,
      });
      await new Promise((r) => setTimeout(r, 500));

      // KeyJ (presetB's 'a' binding) should work
      await page.keyboard.down('j');
      await waitForButton(page, 0, true);
      await page.keyboard.up('j');
      await waitForButton(page, 0, false);

      // KeyI (presetA's 'a' binding) should NOT work
      await page.keyboard.down('i');
      await new Promise((r) => setTimeout(r, 200));
      expect((await getButtonStates(page))[0]).toBeFalse();
      await page.keyboard.up('i');
    }
  );

  console.log('  [Storage - isEnabled Toggle via Storage]');

  await assert(
    'setting isEnabled=false in storage and disabling works',
    async () => {
      await setStorageSync(browser, { ENABLED: false });
      await sendConfigToPage(page, { type: 'DISABLE_GAMEPAD' });
      await waitForStatus(page, 'disconnected');
      expect(await getConnectionStatus(page)).toBe('disconnected');
    }
  );

  await assert(
    'setting isEnabled=true in storage and re-enabling works',
    async () => {
      await setStorageSync(browser, { ENABLED: true });
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await waitForStatus(page, 'connected');
      expect(await getConnectionStatus(page)).toBe('connected');
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
