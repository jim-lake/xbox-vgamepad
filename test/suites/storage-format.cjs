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
    makeConfig,
  } = helpers;

  console.log('  [Storage Format - Top-Level Object]');

  await assert('storage contains isEnabled field', async () => {
    const data = await getStorageSync(browser, ['ENABLED']);
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
      const customConfig = makeConfig({
        mouseConfig: { mouseControls: 1, sensitivity: 15 },
        keyboardConfig: { KeyP: 'a', KeyB: 'b', KeyJ: 'start' },
      });
      await setStorageSync(browser, {
        'GP_CONF:roundtrip': customConfig,
        ACTIVE_GP_CONF: 'roundtrip',
        ENABLED: true,
      });

      // Read it back
      const data = await getStorageSync(browser, ['GP_CONF:roundtrip']);
      const stored = data['GP_CONF:roundtrip'];
      if (!stored) throw new Error('Custom config not found after write');
      if (stored.keyboardConfig.KeyP?.[0]?.action !== 'a')
        throw new Error('keyboardConfig.KeyP mismatch');
      if (stored.mouseConfig.mouseControls?.[0]?.sensitivity !== 15)
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
      const fullConfig = makeConfig({
        mouseConfig: { mouseControls: 0, sensitivity: 500 },
        keyboardConfig: {
          Digit1: 'a',
          Digit2: 'b',
          Digit3: 'b',
          Digit4: 'x',
          Digit5: 'y',
          Digit6: 'leftShoulder',
          Digit7: 'rightShoulder',
          Digit8: 'leftTrigger',
          Digit9: 'rightTrigger',
          Digit0: 'select',
          KeyP: 'start',
          KeyB: 'leftStickPressed',
          KeyI: 'rightStickPressed',
          KeyW: 'dpadUp',
          KeyS: 'dpadDown',
          KeyA: 'dpadLeft',
          KeyD: 'dpadRight',
          KeyH: 'home',
          KeyT: 'leftStickUp',
          KeyG: 'leftStickDown',
          KeyF: 'leftStickLeft',
          KeyJ: 'leftStickRight',
          KeyY: 'rightStickUp',
          KeyN: 'rightStickDown',
          KeyM: 'rightStickLeft',
          KeyU: 'rightStickRight',
        },
      });
      await setStorageSync(browser, { 'GP_CONF:full': fullConfig });
      const data = await getStorageSync(browser, ['GP_CONF:full']);
      const stored = data['GP_CONF:full'];
      if (stored.mouseConfig.mouseControls?.[0]?.stick !== 'left')
        throw new Error('mouseControls mismatch');
      if (stored.mouseConfig.mouseControls?.[0]?.sensitivity !== 500)
        throw new Error('sensitivity mismatch');
      if (stored.keyboardConfig.KeyH?.[0]?.action !== 'home')
        throw new Error('home binding mismatch');
      if (stored.keyboardConfig.Digit2?.[0]?.action !== 'b')
        throw new Error('b binding mismatch');
    }
  );

  console.log('  [Storage - Multiple Presets]');

  await assert('multiple presets can coexist in storage', async () => {
    const preset1 = makeConfig({
      mouseConfig: { mouseControls: 1, sensitivity: 10 },
      keyboardConfig: { KeyP: 'a' },
    });
    const preset2 = makeConfig({
      mouseConfig: { mouseControls: 0, sensitivity: 20 },
      keyboardConfig: { KeyB: 'a' },
    });
    const preset3 = makeConfig({
      mouseConfig: { mouseControls: 1, sensitivity: 30 },
      keyboardConfig: { KeyI: 'a' },
    });

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
    if (data['GP_CONF:p2'].mouseConfig.mouseControls?.[0]?.sensitivity !== 20)
      throw new Error('p2 sensitivity mismatch');
  });

  await assert(
    'switching activeConfig in storage selects the right preset',
    async () => {
      const presetA = makeConfig({
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyboardConfig: { KeyI: 'a' },
      });
      const presetB = makeConfig({
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyboardConfig: { KeyJ: 'a' },
      });

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
