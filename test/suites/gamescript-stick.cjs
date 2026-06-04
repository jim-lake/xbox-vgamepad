// Tests: GameScript point and rotate stick actions
module.exports = async function ({
  page,
  assert,
  expect,
  helpers,
  releaseAll,
}) {
  const {
    waitForAxis,
    waitForAxesCentered,
    getAxesStates,
    sendConfigToPage,
    waitForPadAxis,
    getPadAxesStates,
  } = helpers;

  await releaseAll(page);

  function scriptConfig(keyCode, script) {
    return {
      mouseConfig: { mouseControls: [] },
      keyboardConfig: { [keyCode]: [script] },
    };
  }

  function multiScriptConfig(entries) {
    const kc = {};
    for (const [key, script] of entries) {
      kc[key] = [script];
    }
    return { mouseConfig: { mouseControls: [] }, keyboardConfig: kc };
  }

  console.log('  [GameScript Stick - point basic]');

  await assert('point: sets left stick to (1, -0.5)', async () => {
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'point-test',
      gamepadConfig: scriptConfig('KeyP', {
        type: 'script',
        name: 'point',
        activationType: 'on_down',
        actions: [
          { type: 'point', gamepadIndex: 0, stick: 'left', x: 1, y: -0.5 },
          { type: 'delay', durationMs: 500 },
        ],
      }),
    });
    await new Promise((r) => setTimeout(r, 200));

    await page.keyboard.down('p');
    await waitForAxis(page, 0, 'eq', 1);
    await waitForAxis(page, 1, 'eq', -0.5);

    await page.keyboard.up('p');
    await new Promise((r) => setTimeout(r, 600));
    await waitForAxesCentered(page);
  });

  console.log('  [GameScript Stick - point held activation]');

  await assert('point: held activation holds stick until release', async () => {
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'point-held',
      gamepadConfig: scriptConfig('KeyP', {
        type: 'script',
        name: 'point-held',
        activationType: 'held',
        actions: [
          { type: 'point', gamepadIndex: 0, stick: 'left', x: 0.7, y: 0.7 },
          { type: 'delay', durationMs: 'infinite' },
        ],
      }),
    });
    await new Promise((r) => setTimeout(r, 200));

    await page.keyboard.down('p');
    await waitForAxis(page, 0, 'eq', 0.7);
    await waitForAxis(page, 1, 'eq', 0.7);

    // Hold for a bit
    await new Promise((r) => setTimeout(r, 200));
    const axes = await getAxesStates(page);
    expect(Math.abs(axes[0] - 0.7) < 0.01).toBeTrue();

    // Release cancels
    await page.keyboard.up('p');
    await waitForAxesCentered(page);
  });

  console.log('  [GameScript Stick - point right stick]');

  await assert('point: sets right stick (axes 2,3)', async () => {
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'point-right',
      gamepadConfig: scriptConfig('KeyP', {
        type: 'script',
        name: 'point-right',
        activationType: 'on_down',
        actions: [
          { type: 'point', gamepadIndex: 0, stick: 'right', x: -0.3, y: 0.9 },
          { type: 'delay', durationMs: 500 },
        ],
      }),
    });
    await new Promise((r) => setTimeout(r, 200));

    await page.keyboard.down('p');
    await waitForAxis(page, 2, 'eq', -0.3);
    await waitForAxis(page, 3, 'eq', 0.9);

    await page.keyboard.up('p');
    await new Promise((r) => setTimeout(r, 600));
    await waitForAxesCentered(page);
  });

  console.log('  [GameScript Stick - rotate does not delay next action]');

  await assert(
    'rotate: does NOT delay next action (zero-duration)',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'rotate-nodelay',
        gamepadConfig: scriptConfig('KeyR', {
          type: 'script',
          name: 'rotate-nodelay',
          activationType: 'on_down',
          actions: [
            {
              type: 'rotate',
              gamepadIndex: 0,
              stick: 'left',
              startX: 0,
              startY: 1,
              endX: 0,
              endY: 1,
              directions: 'infinite',
              rotateMs: 500,
              clockwise: true,
            },
            {
              type: 'down',
              buttons: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
            },
            { type: 'delay', durationMs: 600 },
            {
              type: 'up',
              buttons: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
            },
          ],
        }),
      });
      await new Promise((r) => setTimeout(r, 200));

      await page.keyboard.down('r');
      // Button A should be pressed almost immediately (rotate didn't block)
      await helpers.waitForButton(page, 0, true);

      await page.keyboard.up('r');
      await new Promise((r) => setTimeout(r, 700));
      await waitForAxesCentered(page);
    }
  );

  console.log('  [GameScript Stick - rotate cancel stops rotation]');

  await assert('rotate: cancel stops rotation and resets stick', async () => {
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'rotate-cancel',
      gamepadConfig: scriptConfig('KeyR', {
        type: 'script',
        name: 'rotate-cancel',
        activationType: 'held',
        actions: [
          {
            type: 'rotate',
            gamepadIndex: 0,
            stick: 'left',
            startX: 0,
            startY: 1,
            endX: 0,
            endY: 1,
            directions: 'infinite',
            rotateMs: 5000,
            clockwise: true,
          },
          { type: 'delay', durationMs: 'infinite' },
        ],
      }),
    });
    await new Promise((r) => setTimeout(r, 200));

    await page.keyboard.down('r');
    // Wait a bit for rotation to start
    await new Promise((r) => setTimeout(r, 100));
    // Axes should be non-zero (rotating)
    const axes = await getAxesStates(page);
    const magnitude = Math.sqrt(axes[0] ** 2 + axes[1] ** 2);
    expect(magnitude > 0.01).toBeTrue();

    // Release cancels
    await page.keyboard.up('r');
    await waitForAxesCentered(page);
  });

  console.log('  [GameScript Stick - rotate smooth full circle]');

  await assert('rotate: smooth full circle (start === end, 360°)', async () => {
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'rotate-full',
      gamepadConfig: scriptConfig('KeyR', {
        type: 'script',
        name: 'rotate-full',
        activationType: 'on_down',
        actions: [
          {
            type: 'rotate',
            gamepadIndex: 0,
            stick: 'left',
            startX: 0,
            startY: 1,
            endX: 0,
            endY: 1,
            directions: 'infinite',
            rotateMs: 300,
            clockwise: true,
          },
          { type: 'delay', durationMs: 400 },
        ],
      }),
    });
    await new Promise((r) => setTimeout(r, 200));

    await page.keyboard.down('r');
    // Within 50ms rotation should start (axis non-zero)
    await new Promise((r) => setTimeout(r, 50));
    const axes = await getAxesStates(page);
    const magnitude = Math.sqrt(axes[0] ** 2 + axes[1] ** 2);
    expect(magnitude > 0.01).toBeTrue();

    // After rotation completes + delay, axes centered
    await page.keyboard.up('r');
    await new Promise((r) => setTimeout(r, 500));
    await waitForAxesCentered(page);
  });

  console.log('  [GameScript Stick - rotate discrete 4 directions]');

  await assert('rotate: 4-direction quantization', async () => {
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'rotate-4',
      gamepadConfig: scriptConfig('KeyR', {
        type: 'script',
        name: 'rotate-4',
        activationType: 'on_down',
        actions: [
          {
            type: 'rotate',
            gamepadIndex: 0,
            stick: 'left',
            startX: 1,
            startY: 0,
            endX: 1,
            endY: 0,
            directions: 4,
            rotateMs: 400,
            clockwise: true,
          },
          { type: 'delay', durationMs: 500 },
        ],
      }),
    });
    await new Promise((r) => setTimeout(r, 200));

    await page.keyboard.down('r');
    // Immediately the stick should be at (1, 0)
    await waitForAxis(page, 0, 'eq', 1);

    await page.keyboard.up('r');
    await new Promise((r) => setTimeout(r, 600));
    await waitForAxesCentered(page);
  });

  console.log('  [GameScript Stick - point multi-gamepad]');

  await assert('point: multiple gamepads targeted independently', async () => {
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'point-multi',
      gamepadConfig: multiScriptConfig([
        [
          'KeyP',
          {
            type: 'script',
            name: 'point-pad0',
            activationType: 'on_down',
            actions: [
              { type: 'point', gamepadIndex: 0, stick: 'left', x: 1, y: 0 },
              { type: 'delay', durationMs: 500 },
            ],
          },
        ],
        [
          'KeyO',
          {
            type: 'script',
            name: 'point-pad1',
            activationType: 'on_down',
            actions: [
              { type: 'point', gamepadIndex: 1, stick: 'left', x: 0, y: -1 },
              { type: 'delay', durationMs: 500 },
            ],
          },
        ],
      ]),
    });
    await new Promise((r) => setTimeout(r, 200));

    await page.keyboard.down('p');
    await waitForAxis(page, 0, 'eq', 1);

    await page.keyboard.down('o');
    await waitForPadAxis(page, 1, 1, 'eq', -1);

    // Pad 0 unaffected on axis 1
    const pad0 = await getPadAxesStates(page, 0);
    expect(Math.abs(pad0[1]) < 0.01).toBeTrue();

    await page.keyboard.up('p');
    await page.keyboard.up('o');
    await new Promise((r) => setTimeout(r, 600));
    await waitForAxesCentered(page);
  });

  // Restore default config for subsequent suites
  await sendConfigToPage(page, { type: 'DISABLE_GAMEPAD' });
  await new Promise((r) => setTimeout(r, 200));
  await sendConfigToPage(page, {
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: 'Default',
    gamepadConfig: {
      mouseConfig: { mouseControls: [] },
      keyboardConfig: {
        Space: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
      },
    },
  });
  await new Promise((r) => setTimeout(r, 200));
};
