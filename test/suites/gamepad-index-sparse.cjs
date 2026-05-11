// Tests: When config only has bindings for gamepadIndex 1 (nothing for 0),
// the extension must NOT create a virtual gamepad at index 0.
module.exports = async function ({
  page,
  assert,
  expect,
  helpers,
  releaseAll,
  DEFAULT_CONFIG,
}) {
  const { sendConfigToPage, getPadButtonStates, waitForPadButton } = helpers;

  await releaseAll(page);

  // Config with buttons only on gamepadIndex 1 — no actions target index 0.
  const index1OnlyConfig = {
    mouseConfig: { mouseControls: [] },
    keyboardConfig: {
      KeyA: [{ type: 'action', gamepadIndex: 1, action: 'a' }],
      KeyB: [{ type: 'action', gamepadIndex: 1, action: 'b' }],
    },
  };

  console.log('  [Sparse gamepadIndex — only index 1 configured]');

  await sendConfigToPage(page, {
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: 'index1only',
    gamepadConfig: index1OnlyConfig,
  });
  await new Promise((r) => setTimeout(r, 500));

  await assert(
    'gamepad at index 0 is null when only index 1 is configured',
    async () => {
      const isNull = await page.evaluate(
        () => navigator.getGamepads()[0] === null
      );
      expect(isNull).toBeTrue();
    }
  );

  await assert(
    'gamepad at index 1 exists and responds to key press',
    async () => {
      await page.keyboard.down('a');
      await waitForPadButton(page, 1, 0, true);
      await page.keyboard.up('a');
      await waitForPadButton(page, 1, 0, false);
    }
  );

  await assert(
    'pad-0-buttons element is empty (no virtual pad 0)',
    async () => {
      const data = await page.evaluate(
        () =>
          document
            .getElementById('pad-0-buttons')
            ?.getAttribute('data-buttons') ?? ''
      );
      expect(data).toBe('');
    }
  );

  // Restore default config for subsequent suites
  await sendConfigToPage(page, {
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: 'default',
    gamepadConfig: DEFAULT_CONFIG,
  });
  await new Promise((r) => setTimeout(r, 500));
};
