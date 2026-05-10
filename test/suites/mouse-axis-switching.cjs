// Tests: Mouse axis config switching — transitions between no-axis, left, right
module.exports = async function ({
  page,
  assert,
  expect,
  helpers,
  releaseAll,
  DEFAULT_CONFIG,
}) {
  const { sendConfigToPage, waitForReady, makeConfig } = helpers;

  async function hasOverlay(pg) {
    return pg.evaluate(() => !!document.getElementById('xvg-pointer-overlay'));
  }
  async function hasMinimizedBtn(pg) {
    return pg.evaluate(
      () => !!document.getElementById('xvg-pointer-minimized')
    );
  }

  const noMouseConfig = makeConfig({
    mouseConfig: { mouseControls: null, sensitivity: 10 },
    keyboardConfig: { Space: 'a' },
  });
  const leftStickConfig = makeConfig({
    mouseConfig: { mouseControls: 0, sensitivity: 10 },
    keyboardConfig: { Space: 'a' },
  });
  const rightStickConfig = makeConfig({
    mouseConfig: { mouseControls: 1, sensitivity: 10 },
    keyboardConfig: { Space: 'a' },
  });

  console.log('  [Mouse Axis Switching: no-axis → left → no-axis]');

  await assert('no-axis config does not show overlay', async () => {
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'noMouse',
      gamepadConfig: noMouseConfig,
    });
    await new Promise((r) => setTimeout(r, 300));
    expect(await hasOverlay(page)).toBeFalse();
    expect(await hasMinimizedBtn(page)).toBeFalse();
  });

  await assert(
    'switching from no-axis to left stick shows overlay',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'leftMouse',
        gamepadConfig: leftStickConfig,
      });
      await new Promise((r) => setTimeout(r, 300));
      expect(await hasOverlay(page)).toBeTrue();
    }
  );

  await assert(
    'switching from left stick back to no-axis removes overlay',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'noMouse',
        gamepadConfig: noMouseConfig,
      });
      await new Promise((r) => setTimeout(r, 300));
      expect(await hasOverlay(page)).toBeFalse();
      expect(await hasMinimizedBtn(page)).toBeFalse();
    }
  );

  console.log('  [Mouse Axis Switching: no-axis → left → right → no-axis]');

  await assert(
    'no-axis → left → right → no-axis transitions cleanly',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'noMouse',
        gamepadConfig: noMouseConfig,
      });
      await new Promise((r) => setTimeout(r, 300));
      expect(await hasOverlay(page)).toBeFalse();

      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'leftMouse',
        gamepadConfig: leftStickConfig,
      });
      await new Promise((r) => setTimeout(r, 300));
      expect(await hasOverlay(page)).toBeTrue();

      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'rightMouse',
        gamepadConfig: rightStickConfig,
      });
      await new Promise((r) => setTimeout(r, 300));
      expect(await hasOverlay(page)).toBeTrue();

      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'noMouse',
        gamepadConfig: noMouseConfig,
      });
      await new Promise((r) => setTimeout(r, 300));
      expect(await hasOverlay(page)).toBeFalse();
      expect(await hasMinimizedBtn(page)).toBeFalse();
    }
  );

  console.log('  [Mouse Axis Switching: right → left]');

  await assert(
    'switching from right stick to left stick keeps overlay',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'rightMouse',
        gamepadConfig: rightStickConfig,
      });
      await new Promise((r) => setTimeout(r, 300));
      expect(await hasOverlay(page)).toBeTrue();

      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'leftMouse',
        gamepadConfig: leftStickConfig,
      });
      await new Promise((r) => setTimeout(r, 300));
      expect(await hasOverlay(page)).toBeTrue();
    }
  );

  console.log('  [Mouse Axis Switching: left → right]');

  await assert(
    'switching from left stick to right stick keeps overlay',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'rightMouse',
        gamepadConfig: rightStickConfig,
      });
      await new Promise((r) => setTimeout(r, 300));
      expect(await hasOverlay(page)).toBeTrue();
    }
  );

  console.log('  [Mouse Axis Switching: right → no-axis]');

  await assert(
    'switching from right stick to no-axis removes overlay',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'noMouse',
        gamepadConfig: noMouseConfig,
      });
      await new Promise((r) => setTimeout(r, 300));
      expect(await hasOverlay(page)).toBeFalse();
      expect(await hasMinimizedBtn(page)).toBeFalse();
    }
  );

  console.log(
    '  [Mouse Axis Switching: keyboard still works after transitions]'
  );

  await assert(
    'keyboard bindings work after mouse axis transitions',
    async () => {
      const { waitForButton, getButtonStates } = helpers;
      await page.keyboard.down('Space');
      await waitForButton(page, 0, true);
      expect((await getButtonStates(page))[0]).toBeTrue();
      await page.keyboard.up('Space');
      await waitForButton(page, 0, false);
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
