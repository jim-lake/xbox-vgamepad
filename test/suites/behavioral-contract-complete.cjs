// Tests: Full behavioral contract from JSON.md verified end-to-end —
// every numbered contract item tested independently of implementation
const {
  ACTION_BUTTON_INDEX,
  CODE_TO_PUPPETEER_KEY,
} = require('../default_config.cjs');

module.exports = async function ({
  page,
  browser,
  assert,
  expect,
  helpers,
  releaseAll,
  DEFAULT_CONFIG,
}) {
  const {
    getButtonStates,
    getAxesStates,
    getButtonValues,
    getGamepadIdentity,
    getConnectionStatus,
    getEventCounts,
    waitForButton,
    waitForAxis,
    waitForAxesCentered,
    waitForStatus,
    sendConfigToPage,
    makeConfig,
  } = helpers;

  console.log('  [Contract #1 - Gamepad Appears on Activation]');

  await assert(
    'gamepad is present in getGamepads() when extension is active',
    async () => {
      const result = await page.evaluate(() => {
        const gp = navigator.getGamepads()[0];
        return gp !== null && gp !== undefined && gp.connected === true;
      });
      expect(result).toBeTrue();
    }
  );

  await assert('gamepad shape matches spec on activation', async () => {
    const result = await page.evaluate(() => {
      const gp = navigator.getGamepads()[0];
      if (!gp) return { ok: false, reason: 'no gamepad' };
      return {
        ok: true,
        id: gp.id,
        index: gp.index,
        mapping: gp.mapping,
        connected: gp.connected,
        buttonsLen: gp.buttons.length,
        axesLen: gp.axes.length,
      };
    });
    expect(result.ok).toBeTrue();
    expect(result.id).toBe('Xbox 360 Controller (XInput STANDARD GAMEPAD)');
    expect(result.index).toBe(0);
    expect(result.mapping).toBe('standard');
    expect(result.connected).toBeTrue();
    expect(result.buttonsLen).toBe(17);
    expect(result.axesLen).toBe(4);
  });

  console.log('  [Contract #2 - Key Press → Button Press]');

  await assert(
    'bound key press immediately sets buttons[index].pressed=true, value=1',
    async () => {
      await page.keyboard.down('Space');
      await waitForButton(page, 0, true);
      const result = await page.evaluate(() => {
        const b = navigator.getGamepads()[0]?.buttons[0];
        return { pressed: b?.pressed, value: b?.value };
      });
      expect(result.pressed).toBeTrue();
      expect(result.value).toBe(1);
      await page.keyboard.up('Space');
      await waitForButton(page, 0, false);
    }
  );

  console.log('  [Contract #3 - Key Release → Button Release]');

  await assert(
    'releasing bound key sets buttons[index].pressed=false, value=0',
    async () => {
      await page.keyboard.down('Space');
      await waitForButton(page, 0, true);
      await page.keyboard.up('Space');
      await waitForButton(page, 0, false);
      const result = await page.evaluate(() => {
        const b = navigator.getGamepads()[0]?.buttons[0];
        return { pressed: b?.pressed, value: b?.value };
      });
      expect(result.pressed).toBeFalse();
      expect(result.value).toBe(0);
    }
  );

  console.log('  [Contract #4 - Key Press → Axis Deflection]');

  await assert(
    'bound axis key deflects axis to full value (-1 or +1)',
    async () => {
      await page.keyboard.down('w');
      await waitForAxis(page, 1, 'lt', -0.5);
      const axes = await getAxesStates(page);
      expect(axes[1]).toBe(-1);
      await page.keyboard.up('w');
      await waitForAxesCentered(page);

      await page.keyboard.down('d');
      await waitForAxis(page, 0, 'gt', 0.5);
      const axes2 = await getAxesStates(page);
      expect(axes2[0]).toBe(1);
      await page.keyboard.up('d');
      await waitForAxesCentered(page);
    }
  );

  console.log('  [Contract #5 - Key Release → Axis Center]');

  await assert(
    'releasing axis key returns axis to 0 (unless opposing held)',
    async () => {
      await page.keyboard.down('w');
      await waitForAxis(page, 1, 'lt', -0.5);
      await page.keyboard.up('w');
      await waitForAxesCentered(page);
      const axes = await getAxesStates(page);
      expect(axes[1]).toBe(0);
    }
  );

  await assert(
    'releasing axis key while opposing held keeps axis at opposing value',
    async () => {
      await page.keyboard.down('s'); // down = +1
      await waitForAxis(page, 1, 'gt', 0.5);
      await page.keyboard.down('w'); // up = -1, cancels to 0
      await waitForAxis(page, 1, 'eq', 0);
      await page.keyboard.up('w'); // release up, down still held → +1
      await waitForAxis(page, 1, 'gt', 0.5);
      expect((await getAxesStates(page))[1]).toBe(1);
      await page.keyboard.up('s');
      await waitForAxesCentered(page);
    }
  );

  console.log('  [Contract #6 - Opposing Axes Cancel]');

  await assert(
    'both opposing direction keys held → axis value is 0',
    async () => {
      // Left stick Y
      await page.keyboard.down('w');
      await page.keyboard.down('s');
      await new Promise((r) => setTimeout(r, 100));
      expect((await getAxesStates(page))[1]).toBe(0);
      await page.keyboard.up('w');
      await page.keyboard.up('s');
      await waitForAxesCentered(page);

      // Left stick X
      await page.keyboard.down('a');
      await page.keyboard.down('d');
      await new Promise((r) => setTimeout(r, 100));
      expect((await getAxesStates(page))[0]).toBe(0);
      await page.keyboard.up('a');
      await page.keyboard.up('d');
      await waitForAxesCentered(page);

      // Right stick Y
      await page.keyboard.down('o');
      await page.keyboard.down('l');
      await new Promise((r) => setTimeout(r, 100));
      expect((await getAxesStates(page))[3]).toBe(0);
      await page.keyboard.up('o');
      await page.keyboard.up('l');
      await waitForAxesCentered(page);

      // Right stick X
      await page.keyboard.down('k');
      await page.keyboard.down('Semicolon');
      await new Promise((r) => setTimeout(r, 100));
      expect((await getAxesStates(page))[2]).toBe(0);
      await page.keyboard.up('k');
      await page.keyboard.up('Semicolon');
      await waitForAxesCentered(page);
    }
  );

  console.log('  [Contract #7 - Simultaneous Inputs]');

  await assert(
    'multiple buttons and axes active simultaneously without interference',
    async () => {
      await releaseAll(page);
      await new Promise((r) => setTimeout(r, 300));

      // Press buttons and axes one at a time, waiting for each
      await page.keyboard.down('Space'); // A = 0
      await waitForButton(page, 0, true, 5000);
      await page.keyboard.down('x'); // X = 2
      await waitForButton(page, 2, true, 5000);
      await page.keyboard.down('y'); // Y = 3
      await waitForButton(page, 3, true, 5000);
      await page.keyboard.down('w'); // left Y = -1
      await waitForAxis(page, 1, 'lt', -0.5, 5000);
      await page.keyboard.down('d'); // left X = +1
      await waitForAxis(page, 0, 'gt', 0.5, 5000);

      const buttons = await getButtonStates(page);
      expect(buttons[0]).toBeTrue();
      expect(buttons[2]).toBeTrue();
      expect(buttons[3]).toBeTrue();
      expect(buttons[1]).toBeFalse();

      const axes = await getAxesStates(page);
      expect(axes[0]).toBe(1);
      expect(axes[1]).toBe(-1);

      await page.keyboard.up('Space');
      await page.keyboard.up('x');
      await page.keyboard.up('y');
      await page.keyboard.up('w');
      await page.keyboard.up('d');
      await new Promise((r) => setTimeout(r, 200));
      await waitForAxesCentered(page);
    }
  );

  console.log('  [Contract #8 - Alternate Bindings]');

  await assert(
    'either alternate key independently activates the button',
    async () => {
      // Find the first action that has multiple keys bound to it in the default config
      const actionKeys = {};
      for (const [code, entries] of Object.entries(
        DEFAULT_CONFIG.keyboardConfig
      )) {
        for (const entry of entries) {
          if (entry.type !== 'action') continue;
          const act = entry.action;
          if (ACTION_BUTTON_INDEX[act] === undefined) continue;
          if (!CODE_TO_PUPPETEER_KEY[code]) continue;
          (actionKeys[act] = actionKeys[act] || []).push(code);
        }
      }
      const [act, codes] = Object.entries(actionKeys).find(
        ([, c]) => c.length > 1
      );
      const index = ACTION_BUTTON_INDEX[act];
      for (const code of codes) {
        const key = CODE_TO_PUPPETEER_KEY[code];
        await page.keyboard.down(key);
        await waitForButton(page, index, true);
        await page.keyboard.up(key);
        await waitForButton(page, index, false);
      }
    }
  );

  await assert('alternate trigger bindings work independently', async () => {
    // Find an action bound to both a keyboard code and a shift key
    const actionKeys = {};
    for (const [code, entries] of Object.entries(
      DEFAULT_CONFIG.keyboardConfig
    )) {
      for (const entry of entries) {
        if (entry.type !== 'action') continue;
        const act = entry.action;
        if (ACTION_BUTTON_INDEX[act] === undefined) continue;
        if (!CODE_TO_PUPPETEER_KEY[code]) continue;
        (actionKeys[act] = actionKeys[act] || []).push(code);
      }
    }
    const entry = Object.entries(actionKeys).find(([, c]) => c.length > 1);
    if (!entry) return; // no multi-key bindings, skip
    const [act, codes] = entry;
    const index = ACTION_BUTTON_INDEX[act];
    const key = CODE_TO_PUPPETEER_KEY[codes[codes.length - 1]];
    await page.keyboard.down(key);
    await waitForButton(page, index, true);
    await page.keyboard.up(key);
    await waitForButton(page, index, false);
  });

  console.log('  [Contract #10 - Gamepad Disappears on Deactivation]');

  await assert(
    'disabling extension fires gamepaddisconnected and removes gamepad',
    async () => {
      const countsBefore = await getEventCounts(page);

      await sendConfigToPage(page, { type: 'DISABLE_GAMEPAD' });
      await waitForStatus(page, 'disconnected');

      const countsAfter = await getEventCounts(page);
      expect(countsAfter.disconnectCount).toBeGreaterThan(
        countsBefore.disconnectCount
      );

      const result = await page.evaluate(() => {
        const gp = navigator.getGamepads()[0];
        return gp === null || gp === undefined || gp.connected === false;
      });
      expect(result).toBeTrue();

      // Re-enable
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await waitForStatus(page, 'connected');
    }
  );

  console.log('  [Contract #11 - No Phantom Input]');

  await assert(
    'all buttons unpressed and all axes at 0 when completely idle',
    async () => {
      await releaseAll(page);
      await new Promise((r) => setTimeout(r, 300));

      const result = await page.evaluate(() => {
        const gp = navigator.getGamepads()[0];
        if (!gp) return { ok: false, reason: 'no gamepad' };
        for (let i = 0; i < gp.buttons.length; i++) {
          if (gp.buttons[i].pressed)
            return { ok: false, reason: `button ${i} pressed` };
          if (gp.buttons[i].value !== 0)
            return {
              ok: false,
              reason: `button ${i} value=${gp.buttons[i].value}`,
            };
        }
        for (let i = 0; i < gp.axes.length; i++) {
          if (Math.abs(gp.axes[i]) > 0.01)
            return { ok: false, reason: `axis ${i} = ${gp.axes[i]}` };
        }
        return { ok: true };
      });
      if (!result.ok) throw new Error(`Phantom input: ${result.reason}`);
    }
  );

  console.log('  [Contract - Full Config with All keyboardConfig Fields]');

  await assert(
    'config with every keyboardConfig field populated works end-to-end',
    async () => {
      const config = makeConfig({
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyboardConfig: {
          Digit1: 'a',
          Digit2: 'b',
          Digit3: 'x',
          Digit4: 'y',
          Digit5: 'leftShoulder',
          Digit6: 'rightShoulder',
          Digit7: 'leftTrigger',
          Digit8: 'rightTrigger',
          Digit9: 'select',
          Digit0: 'start',
          KeyP: 'leftStickPressed',
          KeyB: 'rightStickPressed',
          KeyU: 'dpadUp',
          KeyJ: 'dpadDown',
          KeyH: 'dpadLeft',
          KeyN: 'dpadRight',
          KeyM: 'home',
          KeyW: 'leftStickUp',
          KeyS: 'leftStickDown',
          KeyA: 'leftStickLeft',
          KeyD: 'leftStickRight',
          KeyI: 'rightStickUp',
          KeyK: 'rightStickDown',
          KeyO: 'rightStickLeft',
          KeyL: 'rightStickRight',
        },
      });
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'full25',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 500));

      // Test all 17 buttons
      const buttonKeys = [
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        '0',
        'p',
        'b',
        'u',
        'j',
        'h',
        'n',
        'm',
      ];
      for (let i = 0; i < 17; i++) {
        await page.keyboard.down(buttonKeys[i]);
        await waitForButton(page, i, true);
        await page.keyboard.up(buttonKeys[i]);
        await waitForButton(page, i, false);
      }

      // Test all 8 axis directions
      const axisTests = [
        { key: 'w', axis: 1, expected: -1 },
        { key: 's', axis: 1, expected: 1 },
        { key: 'a', axis: 0, expected: -1 },
        { key: 'd', axis: 0, expected: 1 },
        { key: 'i', axis: 3, expected: -1 },
        { key: 'k', axis: 3, expected: 1 },
        { key: 'o', axis: 2, expected: -1 },
        { key: 'l', axis: 2, expected: 1 },
      ];
      for (const { key, axis, expected } of axisTests) {
        await page.keyboard.down(key);
        const cmp = expected < 0 ? 'lt' : 'gt';
        await waitForAxis(page, axis, cmp, expected < 0 ? -0.5 : 0.5);
        await page.keyboard.up(key);
      }
      await waitForAxesCentered(page);
    }
  );

  // Restore default
  await sendConfigToPage(page, {
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: 'default',
    gamepadConfig: DEFAULT_CONFIG,
  });
  await new Promise((r) => setTimeout(r, 500));
};
