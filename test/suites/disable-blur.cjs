// Tests: disableBlur global setting suppresses window blur events
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

  console.log('  [Disable Blur - window blur suppression]');

  // Activate config so extension is running
  await sendConfigToPage(page, {
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: 'default',
    gamepadConfig: DEFAULT_CONFIG,
  });
  await new Promise((r) => setTimeout(r, 300));

  await assert('blur event propagates when disableBlur is false', async () => {
    // Ensure disableBlur is off
    await setStorageSync(browser, {
      GLOBAL_SETTINGS: {
        patchRemoteMultigamepad: true,
        enableLogging: false,
        disableBlur: false,
      },
    });
    await new Promise((r) => setTimeout(r, 500));

    const received = await page.evaluate(() => {
      return new Promise((resolve) => {
        let got = false;
        const handler = () => {
          got = true;
        };
        window.addEventListener('blur', handler);
        window.dispatchEvent(new Event('blur'));
        // Give a tick for propagation
        setTimeout(() => {
          window.removeEventListener('blur', handler);
          resolve(got);
        }, 50);
      });
    });
    expect(received).toBe(true);
  });

  await assert(
    'blur event is suppressed when disableBlur is true',
    async () => {
      await setStorageSync(browser, {
        GLOBAL_SETTINGS: {
          patchRemoteMultigamepad: true,
          enableLogging: false,
          disableBlur: true,
        },
      });
      await new Promise((r) => setTimeout(r, 500));

      const received = await page.evaluate(() => {
        return new Promise((resolve) => {
          let got = false;
          const handler = () => {
            got = true;
          };
          window.addEventListener('blur', handler);
          window.dispatchEvent(new Event('blur'));
          setTimeout(() => {
            window.removeEventListener('blur', handler);
            resolve(got);
          }, 50);
        });
      });
      expect(received).toBe(false);
    }
  );

  await assert('blur suppression toggles off dynamically', async () => {
    // Turn it back off
    await setStorageSync(browser, {
      GLOBAL_SETTINGS: {
        patchRemoteMultigamepad: true,
        enableLogging: false,
        disableBlur: false,
      },
    });
    await new Promise((r) => setTimeout(r, 500));

    const received = await page.evaluate(() => {
      return new Promise((resolve) => {
        let got = false;
        const handler = () => {
          got = true;
        };
        window.addEventListener('blur', handler);
        window.dispatchEvent(new Event('blur'));
        setTimeout(() => {
          window.removeEventListener('blur', handler);
          resolve(got);
        }, 50);
      });
    });
    expect(received).toBe(true);
  });

  await releaseAll(page);
};
