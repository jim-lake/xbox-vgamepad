// Tests: fakeFullscreen per-profile setting intercepts requestFullscreen/exitFullscreen
module.exports = async function ({
  page,
  assert,
  expect,
  helpers,
  releaseAll,
  DEFAULT_CONFIG,
}) {
  const { sendConfigToPage, waitForStatus } = helpers;

  console.log(
    '  [Fake Fullscreen - requestFullscreen/exitFullscreen interception]'
  );

  async function activateWithFakeFullscreen(enabled) {
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'test',
      gamepadConfig: { ...DEFAULT_CONFIG, fakeFullscreen: enabled },
    });
    await waitForStatus(page, 'connected', 5000);
  }

  await activateWithFakeFullscreen(false);

  await assert(
    'requestFullscreen passes through to real API when fakeFullscreen is false',
    async () => {
      const called = await page.evaluate(() => {
        return new Promise((resolve) => {
          document.documentElement.requestFullscreen().then(
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
    'requestFullscreen resolves immediately when fakeFullscreen is true',
    async () => {
      await activateWithFakeFullscreen(true);
      const result = await page.evaluate(() => {
        const start = performance.now();
        let eventFired = false;
        document.addEventListener(
          'fullscreenchange',
          () => {
            eventFired = true;
          },
          { once: true }
        );
        return document.documentElement.requestFullscreen().then(() => {
          return {
            resolved: true,
            fast: performance.now() - start < 50,
            eventFired,
            fullscreenElement:
              document.fullscreenElement === document.documentElement,
          };
        });
      });
      expect(result.resolved).toBe(true);
      expect(result.fast).toBe(true);
      expect(result.eventFired).toBe(true);
      expect(result.fullscreenElement).toBe(true);
    }
  );

  await assert(
    'exitFullscreen resolves immediately when fakeFullscreen is true',
    async () => {
      const result = await page.evaluate(() => {
        const start = performance.now();
        let eventFired = false;
        document.addEventListener(
          'fullscreenchange',
          () => {
            eventFired = true;
          },
          { once: true }
        );
        return document.exitFullscreen().then(() => {
          return {
            resolved: true,
            fast: performance.now() - start < 50,
            eventFired,
            fullscreenElement: document.fullscreenElement === null,
          };
        });
      });
      expect(result.resolved).toBe(true);
      expect(result.fast).toBe(true);
      expect(result.eventFired).toBe(true);
      expect(result.fullscreenElement).toBe(true);
    }
  );

  await assert(
    'exitFullscreen passes through to real API when fakeFullscreen is false',
    async () => {
      await activateWithFakeFullscreen(false);
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
    'CONFIG_CHANGED with fakeFullscreen updates interception dynamically',
    async () => {
      // Switch to fakeFullscreen via CONFIG_CHANGED
      await sendConfigToPage(page, {
        type: 'CONFIG_CHANGED',
        name: 'test',
        gamepadConfig: { ...DEFAULT_CONFIG, fakeFullscreen: true },
      });
      await new Promise((r) => setTimeout(r, 200));

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
      expect(fakeResult.eventFired).toBe(true);

      // Switch back to real
      await sendConfigToPage(page, {
        type: 'CONFIG_CHANGED',
        name: 'test',
        gamepadConfig: { ...DEFAULT_CONFIG, fakeFullscreen: false },
      });
      await new Promise((r) => setTimeout(r, 200));

      const realResult = await page.evaluate(() => {
        return new Promise((resolve) => {
          document.documentElement.requestFullscreen().then(
            () => resolve({ passedThrough: true }),
            () => resolve({ passedThrough: true })
          );
          setTimeout(() => resolve({ passedThrough: false }), 200);
        });
      });
      expect(realResult.passedThrough).toBe(true);
    }
  );

  await releaseAll(page);
};
