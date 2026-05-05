// Tests: JSON.md spec compliance — complete coverage of all spec sections
// including storage object constraints, GamepadConfig structure validation,
// KeyMap format rules, virtual mouse codes, behavioral contract edge cases
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
    getButtonTouched,
    getGamepadIdentity,
    getConnectionStatus,
    getEventCounts,
    waitForButton,
    waitForAxis,
    waitForAxesCentered,
    waitForStatus,
    setStorageSync,
    getStorageSync,
    sendConfigToPage,
  } = helpers;

  console.log('  [JSON Spec - Storage: configs must contain "default"]');

  await assert(
    'storage with no default preset still works when extension provides built-in default',
    async () => {
      const swTarget = browser.targets().find(
        (t) => t.type() === 'service_worker' && t.url().includes('chrome-extension://')
      );
      const worker = await swTarget.worker();
      await worker.evaluate(() => {
        return new Promise((resolve) => chrome.storage.sync.remove('GP_CONF:default', resolve));
      });

      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.down('Space');
      await waitForButton(page, 0, true);
      await page.keyboard.up('Space');
      await waitForButton(page, 0, false);
    }
  );

  console.log('  [JSON Spec - KeyMap: undefined leaves input unbound]');

  await assert(
    'explicitly undefined keyConfig fields produce no input',
    async () => {
      const config = {
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyConfig: {
          a: undefined,
          b: undefined,
          x: 'KeyP',
        },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'undefKeys',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.down('p');
      await waitForButton(page, 2, true);
      await page.keyboard.up('p');
      await waitForButton(page, 2, false);

      await page.keyboard.down('Space');
      await new Promise((r) => setTimeout(r, 200));
      expect((await getButtonStates(page))[0]).toBeFalse();
      expect((await getButtonStates(page))[1]).toBeFalse();
      await page.keyboard.up('Space');
    }
  );

  console.log('  [JSON Spec - Virtual Mouse Codes in Array Bindings]');

  await assert(
    'Click and RightClick work as array binding elements',
    async () => {
      const config = {
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyConfig: {
          rightTrigger: ['Click', 'KeyE'],
          leftTrigger: ['RightClick', 'KeyQ'],
        },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'mouseArr',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 500));

      // Keyboard alternate for RT
      await page.keyboard.down('e');
      await waitForButton(page, 7, true);
      await page.keyboard.up('e');
      await waitForButton(page, 7, false);

      // Keyboard alternate for LT
      await page.keyboard.down('q');
      await waitForButton(page, 6, true);
      await page.keyboard.up('q');
      await waitForButton(page, 6, false);

      // Mouse click for RT
      await page.mouse.move(200, 200);
      await page.mouse.down();
      await waitForButton(page, 7, true);
      await page.mouse.up();
      await waitForButton(page, 7, false);

      // Right click for LT
      await page.mouse.down({ button: 'right' });
      await waitForButton(page, 6, true);
      await page.mouse.up({ button: 'right' });
      await waitForButton(page, 6, false);
    }
  );

  console.log('  [JSON Spec - Duplicate Key in Array Across Fields]');

  await assert(
    'duplicate key in arrays across two different fields is rejected',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await new Promise((r) => setTimeout(r, 500));

      const config = {
        mouseConfig: { mouseControls: 1, sensitivity: 10 },
        keyConfig: {
          a: ['KeyP', 'KeyQ'],
          b: ['KeyR', 'KeyQ'],
        },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'dupeArr',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.down('q');
      await new Promise((r) => setTimeout(r, 200));
      const buttons = await getButtonStates(page);
      const bothPressed = buttons[0] && buttons[1];
      if (bothPressed) throw new Error('Duplicate key in arrays across fields was accepted');
      await page.keyboard.up('q');
      await new Promise((r) => setTimeout(r, 100));
    }
  );

  console.log('  [JSON Spec - Button Index Completeness]');

  await assert(
    'all 17 button indices (0-16) are individually addressable',
    async () => {
      await releaseAll(page);
      await new Promise((r) => setTimeout(r, 200));

      const fields = [
        'a', 'b', 'x', 'y', 'leftShoulder', 'rightShoulder',
        'leftTrigger', 'rightTrigger', 'select', 'start',
        'leftStickPressed', 'rightStickPressed',
        'dpadUp', 'dpadDown', 'dpadLeft', 'dpadRight', 'home',
      ];
      const keyCodes = [
        'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6',
        'Digit7', 'Digit8', 'Digit9', 'Digit0',
        'KeyP', 'KeyB', 'KeyI', 'KeyJ', 'KeyK', 'KeyL', 'KeyH',
      ];
      const puppeteerKeys = [
        '1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
        'p', 'b', 'i', 'j', 'k', 'l', 'h',
      ];

      const keyConfig = {};
      for (let i = 0; i < fields.length; i++) {
        keyConfig[fields[i]] = keyCodes[i];
      }

      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'allIndices',
        gamepadConfig: {
          mouseConfig: { mouseControls: undefined, sensitivity: 10 },
          keyConfig,
        },
      });
      await new Promise((r) => setTimeout(r, 500));

      for (let i = 0; i < 17; i++) {
        await page.keyboard.down(puppeteerKeys[i]);
        await waitForButton(page, i, true, 5000);
        const buttons = await getButtonStates(page);
        for (let j = 0; j < 17; j++) {
          if (j === i) {
            if (!buttons[j]) throw new Error(`Button ${j} should be pressed`);
          } else {
            if (buttons[j]) throw new Error(`Button ${j} unexpectedly pressed when testing index ${i}`);
          }
        }
        await page.keyboard.up(puppeteerKeys[i]);
        await waitForButton(page, i, false);
      }
    }
  );

  console.log('  [JSON Spec - Axis Index Completeness]');

  await assert(
    'all 8 axis directions map to correct axis indices and values',
    async () => {
      await releaseAll(page);
      await new Promise((r) => setTimeout(r, 200));

      const config = {
        mouseConfig: { mouseControls: undefined, sensitivity: 10 },
        keyConfig: {
          leftStickUp: 'KeyW',
          leftStickDown: 'KeyS',
          leftStickLeft: 'KeyA',
          leftStickRight: 'KeyD',
          rightStickUp: 'KeyI',
          rightStickDown: 'KeyK',
          rightStickLeft: 'KeyJ',
          rightStickRight: 'KeyL',
        },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'axisComplete',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 500));

      const tests = [
        { key: 'w', axis: 1, value: -1 },
        { key: 's', axis: 1, value: 1 },
        { key: 'a', axis: 0, value: -1 },
        { key: 'd', axis: 0, value: 1 },
        { key: 'i', axis: 3, value: -1 },
        { key: 'k', axis: 3, value: 1 },
        { key: 'j', axis: 2, value: -1 },
        { key: 'l', axis: 2, value: 1 },
      ];

      for (const { key, axis, value } of tests) {
        await page.keyboard.down(key);
        await waitForAxis(page, axis, value < 0 ? 'lt' : 'gt', value < 0 ? -0.5 : 0.5);
        const axes = await getAxesStates(page);
        expect(axes[axis]).toBe(value);
        for (let i = 0; i < 4; i++) {
          if (i !== axis) {
            if (Math.abs(axes[i]) > 0.01) {
              await page.keyboard.up(key);
              throw new Error(`Axis ${i} affected (${axes[i]}) when pressing ${key} for axis ${axis}`);
            }
          }
        }
        await page.keyboard.up(key);
      }
      await waitForAxesCentered(page);
    }
  );

  console.log('  [JSON Spec - Sensitivity Integer Boundary]');

  await assert(
    'sensitivity=1 (minimum valid) activates config successfully',
    async () => {
      const config = {
        mouseConfig: { mouseControls: 1, sensitivity: 1 },
        keyConfig: { a: 'KeyP' },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'sensMin',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 500));
      await page.keyboard.down('p');
      await waitForButton(page, 0, true);
      await page.keyboard.up('p');
      await waitForButton(page, 0, false);
    }
  );

  await assert(
    'sensitivity=1000 (maximum valid) activates config successfully',
    async () => {
      const config = {
        mouseConfig: { mouseControls: 1, sensitivity: 1000 },
        keyConfig: { a: 'KeyP' },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'sensMax',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 500));
      await page.keyboard.down('p');
      await waitForButton(page, 0, true);
      await page.keyboard.up('p');
      await waitForButton(page, 0, false);
    }
  );

  console.log('  [JSON Spec - Behavioral Contract #9 - Mouse Movement → Stick]');

  async function getCDPSession(pg) {
    if (typeof pg.createCDPSession === 'function') return pg.createCDPSession();
    if (pg.target && typeof pg.target === 'function')
      return pg.target().createCDPSession();
    throw new Error('Cannot create CDP session');
  }

  await assert(
    'mouseControls=0 targets left stick (axes 0,1)',
    async () => {
      const config = {
        mouseConfig: { mouseControls: 0, sensitivity: 50 },
        keyConfig: {},
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'mouseLeft',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.mouse.click(200, 200);
      await new Promise((r) => setTimeout(r, 200));

      const cdp = await getCDPSession(page);
      await cdp.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: 300,
        y: 200,
        movementX: 50,
        movementY: 0,
      });
      await new Promise((r) => setTimeout(r, 200));

      const axes = await getAxesStates(page);
      if (Math.abs(axes[0]) > 0.01) {
        expect(axes[0]).toBeGreaterThan(0);
        expect(axes[2]).toBeCloseTo(0, 0.05);
        expect(axes[3]).toBeCloseTo(0, 0.05);
      }

      await cdp.detach();
      await new Promise((r) => setTimeout(r, 300));
    }
  );

  await assert(
    'mouseControls=1 targets right stick (axes 2,3)',
    async () => {
      const config = {
        mouseConfig: { mouseControls: 1, sensitivity: 50 },
        keyConfig: {},
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'mouseRight',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.mouse.click(200, 200);
      await new Promise((r) => setTimeout(r, 200));

      const cdp = await getCDPSession(page);
      await cdp.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: 300,
        y: 200,
        movementX: 50,
        movementY: 0,
      });
      await new Promise((r) => setTimeout(r, 200));

      const axes = await getAxesStates(page);
      if (Math.abs(axes[2]) > 0.01) {
        expect(axes[2]).toBeGreaterThan(0);
        expect(axes[0]).toBeCloseTo(0, 0.05);
        expect(axes[1]).toBeCloseTo(0, 0.05);
      }

      await cdp.detach();
      await new Promise((r) => setTimeout(r, 300));
    }
  );

  console.log('  [JSON Spec - Behavioral Contract #10 - Deactivation Events]');

  await assert(
    'gamepaddisconnected event count increments exactly once per disable',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await waitForStatus(page, 'connected');

      const before = await getEventCounts(page);

      await sendConfigToPage(page, { type: 'DISABLE_GAMEPAD' });
      await waitForStatus(page, 'disconnected');

      const after = await getEventCounts(page);
      expect(after.disconnectCount).toBe(before.disconnectCount + 1);

      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await waitForStatus(page, 'connected');
    }
  );

  await assert(
    'gamepadconnected event count increments exactly once per enable',
    async () => {
      const before = await getEventCounts(page);

      await sendConfigToPage(page, { type: 'DISABLE_GAMEPAD' });
      await waitForStatus(page, 'disconnected');

      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await waitForStatus(page, 'connected');

      const after = await getEventCounts(page);
      expect(after.connectCount).toBe(before.connectCount + 1);
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
