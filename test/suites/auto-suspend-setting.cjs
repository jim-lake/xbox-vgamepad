// Tests: autoSuspendOnInput global setting controls auto-suspend behavior
module.exports = async function ({
  page,
  browser,
  assert,
  expect,
  helpers,
  releaseAll,
  DEFAULT_CONFIG,
}) {
  const { setStorageSync, sendConfigToPage, waitForStatus, waitForButton } =
    helpers;

  console.log('  [Auto-Suspend Setting - enable/disable]');

  async function activate() {
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'default',
      gamepadConfig: DEFAULT_CONFIG,
    });
    await waitForStatus(page, 'connected', 5000);
  }

  async function addTextInput() {
    await page.evaluate(() => {
      const input = document.createElement('input');
      input.type = 'text';
      input.id = 'test-text-input';
      document.body.appendChild(input);
    });
    await new Promise((r) => setTimeout(r, 150));
  }

  async function removeTextInput() {
    await page.evaluate(() => {
      document.getElementById('test-text-input')?.remove();
    });
    await new Promise((r) => setTimeout(r, 150));
  }

  async function setAutoSuspend(enabled) {
    await setStorageSync(browser, {
      GLOBAL_SETTINGS: {
        patchRemoteMultigamepad: true,
        enableLogging: false,
        disableBlur: false,
        autoSuspendOnInput: enabled,
      },
    });
    await new Promise((r) => setTimeout(r, 500));
  }

  await activate();

  await assert(
    'text input suspends keyboard when autoSuspendOnInput is true (default)',
    async () => {
      await setAutoSuspend(true);
      await addTextInput();
      // Input should be suspended
      await page.keyboard.press('Space');
      await new Promise((r) => setTimeout(r, 100));
      const btn = await page.evaluate(
        () => navigator.getGamepads()[0]?.buttons[0]?.pressed
      );
      expect(btn).toBe(false);
      await removeTextInput();
    }
  );

  await assert(
    'text input does NOT suspend keyboard when autoSuspendOnInput is false',
    async () => {
      await setAutoSuspend(false);
      await addTextInput();
      // Input should still work
      await page.keyboard.down('Space');
      await waitForButton(page, 0, true, 2000);
      const btn = await page.evaluate(
        () => navigator.getGamepads()[0]?.buttons[0]?.pressed
      );
      expect(btn).toBe(true);
      await page.keyboard.up('Space');
      await waitForButton(page, 0, false, 2000);
      await removeTextInput();
    }
  );

  await assert(
    'toggling autoSuspendOnInput back to true re-enables suspend',
    async () => {
      await setAutoSuspend(true);
      await addTextInput();
      await page.keyboard.press('Space');
      await new Promise((r) => setTimeout(r, 100));
      const btn = await page.evaluate(
        () => navigator.getGamepads()[0]?.buttons[0]?.pressed
      );
      expect(btn).toBe(false);
      await removeTextInput();
    }
  );

  await releaseAll(page);
};
