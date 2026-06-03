// Tests: gameName is tracked in transient tab state
module.exports = async function ({
  page,
  browser,
  assert,
  expect,
  helpers,
  releaseAll,
  DEFAULT_CONFIG,
}) {
  const { setStorageSync, getServiceWorker, sendConfigToPage } = helpers;

  console.log('  [Game Name Clear - gameName in transient tab state]');

  await setStorageSync(browser, {
    'GP_CONF:default': DEFAULT_CONFIG,
    ACTIVE_GP_CONF: 'default',
    ENABLED: true,
  });

  const swTarget = await getServiceWorker(browser);
  const worker = await swTarget.worker();
  await worker.evaluate(() => {
    globalThis.__lastGameName = '__unset__';
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'GAME_CHANGED') {
        globalThis.__lastGameName = msg.gameName;
      }
    });
  });

  await assert(
    'GAME_CHANGED with a name stores gameName in tab state',
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

      const gameName = await worker.evaluate(() => globalThis.__lastGameName);
      expect(gameName).toBe('Halo Infinite');
    }
  );

  await assert(
    'GAME_CHANGED with null clears gameName in tab state',
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

      const gameName = await worker.evaluate(() => globalThis.__lastGameName);
      expect(gameName).toBe(null);
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
