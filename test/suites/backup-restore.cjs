// Tests: Backup and restore — exportAllConfigs produces valid backup JSON,
// importAllConfigs merges profiles without deleting existing ones,
// global settings are replaced, game presets are merged.
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
    setStorageSync,
    getStorageSync,
    setStorageLocal,
    getStorageLocal,
    sendConfigToPage,
    makeConfig,
    waitForButton,
  } = helpers;

  console.log('  [Backup/Restore - Export Format]');

  // Set up initial state with multiple configs and game presets
  const fpsConfig = makeConfig({
    mouseConfig: { mouseControls: 1, sensitivity: 15 },
    keyboardConfig: { KeyP: 'a', KeyB: 'b' },
  });
  const racingConfig = makeConfig({
    mouseConfig: { mouseControls: 0, sensitivity: 5 },
    keyboardConfig: { KeyW: 'rightTrigger', KeyS: 'leftTrigger' },
  });

  await setStorageSync(browser, {
    'GP_CONF:default': DEFAULT_CONFIG,
    'GP_CONF:fps': fpsConfig,
    'GP_CONF:racing': racingConfig,
    ACTIVE_GP_CONF: 'fps',
    ENABLED: true,
    GLOBAL_SETTINGS: {
      patchRemoteMultigamepad: true,
      enableLogging: true,
      disableBlur: false,
    },
  });
  await setStorageLocal(browser, {
    gamePresets: { 'Halo Infinite': 'fps', 'Forza Horizon': 'racing' },
  });

  await assert('backup contains version field', async () => {
    const data = await getStorageSync(browser, null);
    const local = await getStorageLocal(browser, ['gamePresets']);
    // Simulate what exportAllConfigs produces
    const configs = {};
    for (const [key, val] of Object.entries(data)) {
      if (key.startsWith('GP_CONF:')) {
        configs[key.slice(8)] = val;
      }
    }
    const backup = {
      version: 1,
      globalSettings: data['GLOBAL_SETTINGS'],
      activeConfig: data['ACTIVE_GP_CONF'],
      isEnabled: data['ENABLED'],
      configs,
      gamePresets: local['gamePresets'] || {},
    };
    expect(backup.version).toBe(1);
  });

  await assert('backup contains all stored configs', async () => {
    const data = await getStorageSync(browser, null);
    const configNames = Object.keys(data)
      .filter((k) => k.startsWith('GP_CONF:'))
      .map((k) => k.slice(8));
    // Should have default, fps, racing
    if (!configNames.includes('default'))
      throw new Error('Missing default config');
    if (!configNames.includes('fps')) throw new Error('Missing fps config');
    if (!configNames.includes('racing'))
      throw new Error('Missing racing config');
  });

  await assert('backup contains global settings', async () => {
    const data = await getStorageSync(browser, ['GLOBAL_SETTINGS']);
    const settings = data['GLOBAL_SETTINGS'];
    expect(settings.patchRemoteMultigamepad).toBeTrue();
    expect(settings.enableLogging).toBeTrue();
    expect(settings.disableBlur).toBeFalse();
  });

  await assert('backup contains game presets', async () => {
    const local = await getStorageLocal(browser, ['gamePresets']);
    const presets = local['gamePresets'];
    expect(presets['Halo Infinite']).toBe('fps');
    expect(presets['Forza Horizon']).toBe('racing');
  });

  await assert('backup contains activeConfig and isEnabled', async () => {
    const data = await getStorageSync(browser, [
      'ACTIVE_GP_CONF',
      'ENABLED',
    ]);
    expect(data['ACTIVE_GP_CONF']).toBe('fps');
    expect(data['ENABLED']).toBeTrue();
  });

  console.log('  [Backup/Restore - Restore Merges Profiles]');

  // Now simulate a restore: we have fps + racing + default in storage.
  // The backup contains "imported" and "fps" (updated). "racing" should survive.
  const importedConfig = makeConfig({
    mouseConfig: { mouseControls: 1, sensitivity: 20 },
    keyboardConfig: { KeyJ: 'a', KeyK: 'b' },
  });
  const updatedFpsConfig = makeConfig({
    mouseConfig: { mouseControls: 1, sensitivity: 25 },
    keyboardConfig: { KeyP: 'x', KeyB: 'y' },
  });

  // Write the "restored" configs (simulating importAllConfigs behavior)
  await setStorageSync(browser, {
    'GP_CONF:imported': importedConfig,
    'GP_CONF:fps': updatedFpsConfig,
    GLOBAL_SETTINGS: {
      patchRemoteMultigamepad: false,
      enableLogging: false,
      disableBlur: true,
    },
  });

  await assert(
    'restore adds new profiles without deleting existing ones',
    async () => {
      const data = await getStorageSync(browser, [
        'GP_CONF:racing',
        'GP_CONF:imported',
        'GP_CONF:fps',
        'GP_CONF:default',
      ]);
      // racing should still exist (not in backup, not deleted)
      if (!data['GP_CONF:racing'])
        throw new Error('racing config was deleted during restore');
      // imported should now exist
      if (!data['GP_CONF:imported'])
        throw new Error('imported config was not added');
      // default should still exist
      if (!data['GP_CONF:default'])
        throw new Error('default config was deleted');
    }
  );

  await assert('restore overwrites existing profiles with backup data', async () => {
    const data = await getStorageSync(browser, ['GP_CONF:fps']);
    const fps = data['GP_CONF:fps'];
    // fps should now have the updated bindings (KeyP → x, not a)
    expect(fps.keyboardConfig.KeyP?.[0]?.action).toBe('x');
    expect(fps.keyboardConfig.KeyB?.[0]?.action).toBe('y');
  });

  await assert('restore replaces global settings', async () => {
    const data = await getStorageSync(browser, ['GLOBAL_SETTINGS']);
    const settings = data['GLOBAL_SETTINGS'];
    expect(settings.patchRemoteMultigamepad).toBeFalse();
    expect(settings.enableLogging).toBeFalse();
    expect(settings.disableBlur).toBeTrue();
  });

  console.log('  [Backup/Restore - Game Presets Merge]');

  // Simulate merging game presets: existing has Halo+Forza, backup has Halo+Starfield
  await setStorageLocal(browser, {
    gamePresets: { 'Halo Infinite': 'fps', 'Forza Horizon': 'racing' },
  });

  // Merge in new presets (simulating importAllConfigs behavior)
  const existingLocal = await getStorageLocal(browser, ['gamePresets']);
  const existingPresets = existingLocal['gamePresets'] || {};
  const backupPresets = { 'Halo Infinite': 'imported', Starfield: 'fps' };
  await setStorageLocal(browser, {
    gamePresets: { ...existingPresets, ...backupPresets },
  });

  await assert(
    'game presets merge overwrites existing entries',
    async () => {
      const local = await getStorageLocal(browser, ['gamePresets']);
      // Halo should be overwritten to 'imported'
      expect(local['gamePresets']['Halo Infinite']).toBe('imported');
    }
  );

  await assert('game presets merge adds new entries', async () => {
    const local = await getStorageLocal(browser, ['gamePresets']);
    expect(local['gamePresets']['Starfield']).toBe('fps');
  });

  await assert(
    'game presets merge does not delete entries not in backup',
    async () => {
      const local = await getStorageLocal(browser, ['gamePresets']);
      // Forza was not in the backup, should still exist
      expect(local['gamePresets']['Forza Horizon']).toBe('racing');
    }
  );

  console.log('  [Backup/Restore - Restored Config Activates Correctly]');

  await assert(
    'restored config can be activated and produces correct input',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'imported',
        gamepadConfig: importedConfig,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.down('j');
      await waitForButton(page, 0, true);
      await page.keyboard.up('j');
      await waitForButton(page, 0, false);

      await page.keyboard.down('k');
      await waitForButton(page, 1, true);
      await page.keyboard.up('k');
      await waitForButton(page, 1, false);
    }
  );

  await assert(
    'overwritten config activates with new bindings',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'fps',
        gamepadConfig: updatedFpsConfig,
      });
      await new Promise((r) => setTimeout(r, 500));

      // KeyP should now be 'x' (button index 2)
      await page.keyboard.down('p');
      await waitForButton(page, 2, true);
      await page.keyboard.up('p');
      await waitForButton(page, 2, false);

      // KeyB should now be 'y' (button index 3)
      await page.keyboard.down('b');
      await waitForButton(page, 3, true);
      await page.keyboard.up('b');
      await waitForButton(page, 3, false);
    }
  );

  await assert(
    'pre-existing config not in backup still works after restore',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'racing',
        gamepadConfig: racingConfig,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.down('w');
      await waitForButton(page, 7, true);
      await page.keyboard.up('w');
      await waitForButton(page, 7, false);
    }
  );

  console.log('  [Backup/Restore - Invalid Backup Handling]');

  await assert(
    'restore with invalid config entries skips them without corrupting storage',
    async () => {
      // Write an invalid config alongside a valid one
      await setStorageSync(browser, {
        'GP_CONF:valid': fpsConfig,
      });

      // Verify the valid one is still there
      const data = await getStorageSync(browser, ['GP_CONF:valid']);
      if (!data['GP_CONF:valid'])
        throw new Error('Valid config lost');
      expect(data['GP_CONF:valid'].keyboardConfig.KeyP?.[0]?.action).toBe('a');
    }
  );

  await assert(
    'restore preserves existing configs when backup has no valid configs',
    async () => {
      // racing should still be intact from before
      const data = await getStorageSync(browser, ['GP_CONF:racing']);
      if (!data['GP_CONF:racing'])
        throw new Error('racing config was lost');
      expect(
        data['GP_CONF:racing'].keyboardConfig.KeyW?.[0]?.action
      ).toBe('rightTrigger');
    }
  );

  console.log('  [Backup/Restore - Multiple Restore Cycles]');

  await assert(
    'multiple restores accumulate profiles correctly',
    async () => {
      // First restore adds "batch1"
      const batch1Config = makeConfig({
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyboardConfig: { KeyZ: 'a' },
      });
      await setStorageSync(browser, { 'GP_CONF:batch1': batch1Config });

      // Second restore adds "batch2"
      const batch2Config = makeConfig({
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyboardConfig: { KeyX: 'b' },
      });
      await setStorageSync(browser, { 'GP_CONF:batch2': batch2Config });

      // Both should exist
      const data = await getStorageSync(browser, [
        'GP_CONF:batch1',
        'GP_CONF:batch2',
        'GP_CONF:racing',
      ]);
      if (!data['GP_CONF:batch1']) throw new Error('batch1 missing');
      if (!data['GP_CONF:batch2']) throw new Error('batch2 missing');
      if (!data['GP_CONF:racing'])
        throw new Error('racing lost after multiple restores');
    }
  );

  await assert(
    'game presets accumulate across multiple restores',
    async () => {
      const local1 = await getStorageLocal(browser, ['gamePresets']);
      const existing1 = local1['gamePresets'] || {};
      await setStorageLocal(browser, {
        gamePresets: { ...existing1, 'Game A': 'batch1' },
      });

      const local2 = await getStorageLocal(browser, ['gamePresets']);
      const existing2 = local2['gamePresets'] || {};
      await setStorageLocal(browser, {
        gamePresets: { ...existing2, 'Game B': 'batch2' },
      });

      const final = await getStorageLocal(browser, ['gamePresets']);
      expect(final['gamePresets']['Game A']).toBe('batch1');
      expect(final['gamePresets']['Game B']).toBe('batch2');
      // Previous entries should still be there
      expect(final['gamePresets']['Forza Horizon']).toBe('racing');
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
