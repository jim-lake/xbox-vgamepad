// Tests: Multi-gamepad — buttons and axes are isolated per virtual pad index.
// Covers 2-pad and 4-pad configs.
module.exports = async function ({
  page,
  assert,
  expect,
  helpers,
  releaseAll,
}) {
  const {
    sendConfigToPage,
    getPadButtonStates,
    getPadAxesStates,
    waitForPadButton,
    waitForPadAxis,
  } = helpers;

  await releaseAll(page);

  // ── 2-pad config ──────────────────────────────────────────────────────────
  // KeyA → pad 0 button A (index 0)
  // KeyB → pad 1 button B (index 1)
  // KeyW → pad 0 leftStickUp
  // KeyI → pad 1 rightStickUp

  const twoPadConfig = {
    mouseConfig: { mouseControls: [] },
    keyboardConfig: {
      KeyA: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
      KeyB: [{ type: 'action', gamepadIndex: 1, action: 'b' }],
      KeyW: [{ type: 'action', gamepadIndex: 0, action: 'leftStickUp' }],
      KeyI: [{ type: 'action', gamepadIndex: 1, action: 'rightStickUp' }],
    },
  };

  console.log('  [Multi-Gamepad - 2 pads]');

  await sendConfigToPage(page, {
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: '2pad',
    gamepadConfig: twoPadConfig,
  });
  await new Promise((r) => setTimeout(r, 500));

  await assert('pad 0 button pressed, pad 1 stays idle', async () => {
    await page.keyboard.down('a');
    await waitForPadButton(page, 0, 0, true);
    expect((await getPadButtonStates(page, 1))[0]).toBeFalse();
    await page.keyboard.up('a');
    await waitForPadButton(page, 0, 0, false);
  });

  await assert('pad 1 button pressed, pad 0 stays idle', async () => {
    await page.keyboard.down('b');
    await waitForPadButton(page, 1, 1, true);
    expect((await getPadButtonStates(page, 0))[1]).toBeFalse();
    await page.keyboard.up('b');
    await waitForPadButton(page, 1, 1, false);
  });

  await assert('pad 0 axis deflected, pad 1 axis stays centered', async () => {
    await page.keyboard.down('w');
    await waitForPadAxis(page, 0, 1, 'lt', -0.5);
    const axes1 = await getPadAxesStates(page, 1);
    expect(axes1[1]).toBeCloseTo(0, 0.05);
    await page.keyboard.up('w');
  });

  await assert('pad 1 axis deflected, pad 0 axis stays centered', async () => {
    await page.keyboard.down('i');
    await waitForPadAxis(page, 1, 3, 'lt', -0.5);
    const axes0 = await getPadAxesStates(page, 0);
    expect(axes0[3]).toBeCloseTo(0, 0.05);
    await page.keyboard.up('i');
  });

  await assert('both pads can be pressed simultaneously', async () => {
    await page.keyboard.down('a');
    await page.keyboard.down('b');
    await waitForPadButton(page, 0, 0, true);
    await waitForPadButton(page, 1, 1, true);
    await page.keyboard.up('a');
    await page.keyboard.up('b');
    await waitForPadButton(page, 0, 0, false);
    await waitForPadButton(page, 1, 1, false);
  });

  // ── 4-pad config ──────────────────────────────────────────────────────────
  // Digit1 → pad 0 button A
  // Digit2 → pad 1 button B
  // Digit3 → pad 2 button X
  // Digit4 → pad 3 button Y

  const fourPadConfig = {
    mouseConfig: { mouseControls: [] },
    keyboardConfig: {
      Digit1: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
      Digit2: [{ type: 'action', gamepadIndex: 1, action: 'b' }],
      Digit3: [{ type: 'action', gamepadIndex: 2, action: 'x' }],
      Digit4: [{ type: 'action', gamepadIndex: 3, action: 'y' }],
      KeyQ: [{ type: 'action', gamepadIndex: 0, action: 'leftStickUp' }],
      KeyR: [{ type: 'action', gamepadIndex: 1, action: 'leftStickUp' }],
      KeyT: [{ type: 'action', gamepadIndex: 2, action: 'leftStickUp' }],
      KeyY: [{ type: 'action', gamepadIndex: 3, action: 'leftStickUp' }],
    },
  };

  console.log('  [Multi-Gamepad - 4 pads]');

  await sendConfigToPage(page, {
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: '4pad',
    gamepadConfig: fourPadConfig,
  });
  await new Promise((r) => setTimeout(r, 500));

  await assert('each pad button only affects its own pad', async () => {
    const keys = ['1', '2', '3', '4'];
    const btnIndices = [0, 1, 2, 3]; // a=0, b=1, x=2, y=3

    for (let padIdx = 0; padIdx < 4; padIdx++) {
      await page.keyboard.down(keys[padIdx]);
      await waitForPadButton(page, padIdx, btnIndices[padIdx], true);

      // All other pads must not have that button pressed
      for (let other = 0; other < 4; other++) {
        if (other === padIdx) continue;
        const states = await getPadButtonStates(page, other);
        expect(states[btnIndices[padIdx]]).toBeFalse();
      }

      await page.keyboard.up(keys[padIdx]);
      await waitForPadButton(page, padIdx, btnIndices[padIdx], false);
    }
  });

  await assert('all 4 pads can be pressed at once', async () => {
    for (const k of ['1', '2', '3', '4']) {
      await page.keyboard.down(k);
    }
    await waitForPadButton(page, 0, 0, true);
    await waitForPadButton(page, 1, 1, true);
    await waitForPadButton(page, 2, 2, true);
    await waitForPadButton(page, 3, 3, true);
    for (const k of ['1', '2', '3', '4']) {
      await page.keyboard.up(k);
    }
    await waitForPadButton(page, 0, 0, false);
    await waitForPadButton(page, 1, 1, false);
    await waitForPadButton(page, 2, 2, false);
    await waitForPadButton(page, 3, 3, false);
  });

  await assert('each pad axis only affects its own pad', async () => {
    const keys = ['q', 'r', 't', 'y'];

    for (let padIdx = 0; padIdx < 4; padIdx++) {
      await page.keyboard.down(keys[padIdx]);
      await waitForPadAxis(page, padIdx, 1, 'lt', -0.5);

      for (let other = 0; other < 4; other++) {
        if (other === padIdx) continue;
        const axes = await getPadAxesStates(page, other);
        expect(axes[1]).toBeCloseTo(0, 0.05);
      }

      await page.keyboard.up(keys[padIdx]);
    }
  });
};
