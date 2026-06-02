// Tests: fakeFullscreen global setting intercepts requestFullscreen/exitFullscreen
module.exports = async function ({
  page,
  browser,
  assert,
  expect,
  helpers,
  releaseAll,
  DEFAULT_CONFIG,
}) {
  const { setStorageSync, sendConfigToPage } = helpers;

  console.log(
    '  [Fake Fullscreen - requestFullscreen/exitFullscreen interception]'
  );

  // Activate config so extension is running
  await sendConfigToPage(page, {
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: 'default',
    gamepadConfig: DEFAULT_CONFIG,
  });
  await new Promise((r) => setTimeout(r, 300));

  async function setFakeFullscreen(enabled) {
    await setStorageSync(browser, {
      GLOBAL_SETTINGS: {
        patchRemoteMultigamepad: true,
        enableLogging: false,
        disableBlur: false,
        autoSuspendOnInput: true,
        fakeFullscreen: enabled,
      },
    });
    await new Promise((r) => setTimeout(r, 500));
  }

  await assert(
    'requestFullscreen passes through to real API when fakeFullscreen is false',
    async () => {
      await setFakeFullscreen(false);
      const called = await page.evaluate(() => {
        return new Promise((resolve) => {
          // Track if the real API was invoked by listening for fullscreenchange/error
          let realCalled = false;
          const handler = () => {
            realCalled = true;
          };
          document.addEventListener('fullscreenchange', handler);
          document.addEventListener('fullscreenerror', handler);
          document.documentElement.requestFullscreen().then(
            () => {
              // resolved — real API was called
              document.removeEventListener('fullscreenchange', handler);
              document.removeEventListener('fullscreenerror', handler);
              resolve(true);
            },
            () => {
              // rejected — real API was called (rejected for lack of user gesture)
              document.removeEventListener('fullscreenchange', handler);
              document.removeEventListener('fullscreenerror', handler);
              resolve(true);
            }
          );
          // If neither resolves/rejects quickly, the fake intercepted it
          setTimeout(() => {
            document.removeEventListener('fullscreenchange', handler);
            document.removeEventListener('fullscreenerror', handler);
            resolve(realCalled);
          }, 200);
        });
      });
      expect(called).toBe(true);
    }
  );

  await assert(
    'requestFullscreen resolves immediately when fakeFullscreen is true',
    async () => {
      await setFakeFullscreen(true);
      const result = await page.evaluate(() => {
        const start = performance.now();
        return document.documentElement.requestFullscreen().then(() => {
          return { resolved: true, fast: performance.now() - start < 50 };
        });
      });
      expect(result.resolved).toBe(true);
      expect(result.fast).toBe(true);
    }
  );

  await assert(
    'exitFullscreen resolves immediately when fakeFullscreen is true',
    async () => {
      await setFakeFullscreen(true);
      const result = await page.evaluate(() => {
        const start = performance.now();
        return document.exitFullscreen().then(() => {
          return { resolved: true, fast: performance.now() - start < 50 };
        });
      });
      expect(result.resolved).toBe(true);
      expect(result.fast).toBe(true);
    }
  );

  await assert(
    'exitFullscreen passes through to real API when fakeFullscreen is false',
    async () => {
      await setFakeFullscreen(false);
      const called = await page.evaluate(() => {
        return new Promise((resolve) => {
          document.exitFullscreen().then(
            () => resolve(true),
            () => resolve(true)
          );
          setTimeout(() => resolve(false), 200);
        });
      });
      expect(called).toBe(true);
    }
  );

  await assert(
    'toggling fakeFullscreen dynamically switches behavior',
    async () => {
      // Enable fake — should resolve fast without fullscreen events
      await setFakeFullscreen(true);
      const fakeResult = await page.evaluate(() => {
        let eventFired = false;
        const handler = () => {
          eventFired = true;
        };
        document.addEventListener('fullscreenchange', handler);
        document.addEventListener('fullscreenerror', handler);
        return document.documentElement.requestFullscreen().then(() => {
          document.removeEventListener('fullscreenchange', handler);
          document.removeEventListener('fullscreenerror', handler);
          return { resolved: true, eventFired };
        });
      });
      expect(fakeResult.resolved).toBe(true);
      expect(fakeResult.eventFired).toBe(false);

      // Disable fake — real API is called (events may fire)
      await setFakeFullscreen(false);
      const realResult = await page.evaluate(() => {
        return new Promise((resolve) => {
          let settled = false;
          document.documentElement.requestFullscreen().then(
            () => {
              settled = true;
              resolve({ passedThrough: true });
            },
            () => {
              settled = true;
              resolve({ passedThrough: true });
            }
          );
          setTimeout(() => {
            if (!settled) {
              resolve({ passedThrough: false });
            }
          }, 200);
        });
      });
      expect(realResult.passedThrough).toBe(true);
    }
  );

  await releaseAll(page);
};
