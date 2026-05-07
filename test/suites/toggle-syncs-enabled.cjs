// Tests: F9 toggle syncs the ENABLED storage flag
module.exports = async function ({
  page,
  browser,
  assert,
  expect,
  helpers,
  releaseAll,
  DEFAULT_CONFIG,
}) {
  const { waitForStatus, sendConfigToPage, getStorageSync, setStorageSync } =
    helpers;

  // Ensure we start clean with default config and enabled
  await releaseAll(page);
  await setStorageSync(browser, { ENABLED: true });
  await sendConfigToPage(page, {
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: 'default',
    gamepadConfig: DEFAULT_CONFIG,
  });
  await new Promise((r) => setTimeout(r, 500));

  console.log('  [Toggle Syncs Enabled State]');

  await assert('F9 toggle sets ENABLED to false in storage', async () => {
    await releaseAll(page);
    await waitForStatus(page, 'connected', 3000);

    await page.keyboard.press('F9');
    await waitForStatus(page, 'disconnected', 3000);
    // Give time for the message to propagate to background
    await new Promise((r) => setTimeout(r, 500));

    const data = await getStorageSync(browser, ['ENABLED']);
    expect(data.ENABLED).toBeFalse();
  });

  await assert(
    'F9 toggle sets ENABLED to true in storage on reconnect',
    async () => {
      await page.keyboard.press('F9');
      await waitForStatus(page, 'connected', 3000);
      await new Promise((r) => setTimeout(r, 500));

      const data = await getStorageSync(browser, ['ENABLED']);
      expect(data.ENABLED).toBeTrue();
    }
  );

  await assert('Multiple toggles correctly track ENABLED state', async () => {
    await releaseAll(page);

    // Toggle off
    await page.keyboard.press('F9');
    await waitForStatus(page, 'disconnected', 3000);
    await new Promise((r) => setTimeout(r, 500));
    let data = await getStorageSync(browser, ['ENABLED']);
    expect(data.ENABLED).toBeFalse();

    // Toggle on
    await page.keyboard.press('F9');
    await waitForStatus(page, 'connected', 3000);
    await new Promise((r) => setTimeout(r, 500));
    data = await getStorageSync(browser, ['ENABLED']);
    expect(data.ENABLED).toBeTrue();

    // Toggle off again
    await page.keyboard.press('F9');
    await waitForStatus(page, 'disconnected', 3000);
    await new Promise((r) => setTimeout(r, 500));
    data = await getStorageSync(browser, ['ENABLED']);
    expect(data.ENABLED).toBeFalse();

    // Restore
    await page.keyboard.press('F9');
    await waitForStatus(page, 'connected', 3000);
    await new Promise((r) => setTimeout(r, 500));
  });

  // Restore default config for subsequent suites
  await releaseAll(page);
  await setStorageSync(browser, { ENABLED: true });
  await sendConfigToPage(page, {
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: 'default',
    gamepadConfig: DEFAULT_CONFIG,
  });
  await new Promise((r) => setTimeout(r, 300));
};
