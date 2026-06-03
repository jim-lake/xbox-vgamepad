// Tests: Game matching activates config per-tab without updating global ACTIVE_GP_CONF
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
    sendConfigToPage,
    makeConfig,
    waitForButton,
  } = helpers;

  console.log('  [Game Preset Sync - per-tab activation without global write]');

  const fpsConfig = makeConfig({
    mouseConfig: { mouseControls: 1, sensitivity: 10 },
    keyboardConfig: { KeyP: 'a' },
  });

  // Set up: store a config and a game→preset mapping
  await setStorageSync(browser, {
    'GP_CONF:fps': fpsConfig,
    'GP_CONF:default': DEFAULT_CONFIG,
    ACTIVE_GP_CONF: 'default',
    ENABLED: true,
  });
  await setStorageLocal(browser, { gamePresets: { 'Halo Infinite': 'fps' } });

  await assert(
    'GAME_CHANGED with matched game does NOT update ACTIVE_GP_CONF in storage',
    async () => {
      // Send GAME_CHANGED as if the injected script detected a new game
      await page.evaluate(() => {
        window.postMessage(
          {
            source: 'xbox-vgamepad-content-script',
            type: 'GAME_CHANGED',
            gameName: 'Halo Infinite',
          },
          '*'
        );
      });

      // Wait for background to process
      await new Promise((r) => setTimeout(r, 1000));

      // Global storage should remain unchanged (per-tab only)
      const data = await getStorageSync(browser, ['ACTIVE_GP_CONF']);
      expect(data['ACTIVE_GP_CONF']).toBe('default');
    }
  );

  await assert('game-matched config is activated on the page', async () => {
    // The background should have sent ACTIVATE_GAMEPAD_CONFIG to the tab
    await page.keyboard.down('p');
    await waitForButton(page, 0, true);
    await page.keyboard.up('p');
    await waitForButton(page, 0, false);
  });

  await assert(
    'GAME_CHANGED with no matching preset does not change ACTIVE_GP_CONF',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await new Promise((r) => setTimeout(r, 300));

      // Send GAME_CHANGED for an unmapped game
      await page.evaluate(() => {
        window.postMessage(
          {
            source: 'xbox-vgamepad-content-script',
            type: 'GAME_CHANGED',
            gameName: 'Unknown Game',
          },
          '*'
        );
      });
      await new Promise((r) => setTimeout(r, 500));

      const data = await getStorageSync(browser, ['ACTIVE_GP_CONF']);
      expect(data['ACTIVE_GP_CONF']).toBe('default');
    }
  );

  // Restore default
  await sendConfigToPage(page, {
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: 'default',
    gamepadConfig: DEFAULT_CONFIG,
  });
  await new Promise((r) => setTimeout(r, 300));
  await releaseAll(page);
};
