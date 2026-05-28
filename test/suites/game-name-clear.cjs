// Tests: gameName is cleared from storage when game ends (GAME_CHANGED with null)
module.exports = async function ({
  page,
  browser,
  assert,
  expect,
  helpers,
  releaseAll,
  DEFAULT_CONFIG,
}) {
  const { setStorageSync, setStorageLocal, getStorageLocal, sendConfigToPage } =
    helpers;

  console.log('  [Game Name Clear - gameName removed from storage on game end]');

  await setStorageSync(browser, {
    'GP_CONF:default': DEFAULT_CONFIG,
    ACTIVE_GP_CONF: 'default',
    ENABLED: true,
  });

  await assert(
    'GAME_CHANGED with a name stores gameName in local storage',
    async () => {
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
      await new Promise((r) => setTimeout(r, 500));

      const data = await getStorageLocal(browser, ['gameName']);
      expect(data['gameName']).toBe('Halo Infinite');
    }
  );

  await assert(
    'GAME_CHANGED with null clears gameName from local storage',
    async () => {
      await page.evaluate(() => {
        window.postMessage(
          {
            source: 'xbox-vgamepad-content-script',
            type: 'GAME_CHANGED',
            gameName: null,
          },
          '*'
        );
      });
      await new Promise((r) => setTimeout(r, 500));

      const data = await getStorageLocal(browser, ['gameName']);
      expect(data['gameName']).toBe(undefined);
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
