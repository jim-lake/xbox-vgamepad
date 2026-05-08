// Tests: Default config JSON.md compliance — verify the exact default config
// structure matches the spec, including every key code and action name
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
    waitForButton,
    waitForAxis,
    waitForAxesCentered,
    sendConfigToPage,
  } = helpers;

  console.log('  [Default Config Structure - JSON.md Spec]');

  await assert(
    'default config has mouseConfig.mouseControls = 1 (right stick)',
    async () => {
      expect(DEFAULT_CONFIG.mouseConfig.mouseControls).toBe(1);
    }
  );

  await assert('default config has mouseConfig.sensitivity = 10', async () => {
    expect(DEFAULT_CONFIG.mouseConfig.sensitivity).toBe(10);
  });

  await assert('default config has no home binding', async () => {
    // In the new structure, home is simply absent from keyboardConfig
    const hasBoundHome = Object.values(DEFAULT_CONFIG.keyboardConfig).some(
      (v) => v === 'home' || (Array.isArray(v) && v.includes('home'))
    );
    expect(hasBoundHome).toBeFalse();
  });

  // Verify every single binding from the JSON.md default config spec
  // Format: keyCode → actionName
  const expectedBindings = {
    Space: 'a',
    ControlLeft: 'b',
    Backspace: 'b',
    KeyR: 'x',
    KeyV: 'y',
    Scroll: 'y',
    KeyC: 'leftShoulder',
    KeyG: 'leftShoulder',
    KeyQ: 'rightShoulder',
    RightClick: 'leftTrigger',
    Click: 'rightTrigger',
    Enter: 'start',
    Tab: 'select',
    ArrowUp: 'dpadUp',
    KeyX: 'dpadUp',
    ArrowDown: 'dpadDown',
    KeyZ: 'dpadDown',
    ArrowLeft: 'dpadLeft',
    KeyN: 'dpadLeft',
    ArrowRight: 'dpadRight',
    KeyW: 'leftStickUp',
    KeyS: 'leftStickDown',
    KeyA: 'leftStickLeft',
    KeyD: 'leftStickRight',
    KeyO: 'rightStickUp',
    KeyL: 'rightStickDown',
    KeyK: 'rightStickLeft',
    Semicolon: 'rightStickRight',
    ShiftLeft: 'leftStickPressed',
    KeyF: 'rightStickPressed',
    F9: 'toggleGamepad',
  };

  for (const [code, expected] of Object.entries(expectedBindings)) {
    await assert(
      `default config: ${code} = ${JSON.stringify(expected)}`,
      async () => {
        const actual = DEFAULT_CONFIG.keyboardConfig[code];
        if (actual !== expected)
          throw new Error(
            `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
          );
      }
    );
  }

  console.log('  [Default Config - Button Index Mapping Compliance]');

  // Verify the action → gamepadIndex mapping from JSON.md
  // Map of puppeteer key → expected button index
  const keyToButtonIndex = {
    Space: 0, // a
    Control: 1, // b (ControlLeft)
    r: 2, // x
    q: 5, // rightShoulder
    Tab: 8, // select
    Enter: 9, // start
    Shift: 10, // leftStickPressed
    f: 11, // rightStickPressed
    ArrowUp: 12, // dpadUp
    ArrowDown: 13, // dpadDown
    ArrowLeft: 14, // dpadLeft
    ArrowRight: 15, // dpadRight
  };

  for (const [key, idx] of Object.entries(keyToButtonIndex)) {
    await assert(
      `${key} maps to gamepadIndex ${idx} per JSON.md spec`,
      async () => {
        await page.keyboard.down(key);
        await waitForButton(page, idx, true);
        const buttons = await getButtonStates(page);
        expect(buttons[idx]).toBeTrue();
        await page.keyboard.up(key);
        await waitForButton(page, idx, false);
      }
    );
  }

  console.log('  [Default Config - Axis Index Mapping Compliance]');

  const axisTests = [
    { key: 'w', axis: 1, value: -1 }, // leftStickUp
    { key: 's', axis: 1, value: 1 }, // leftStickDown
    { key: 'a', axis: 0, value: -1 }, // leftStickLeft
    { key: 'd', axis: 0, value: 1 }, // leftStickRight
    { key: 'o', axis: 3, value: -1 }, // rightStickUp
    { key: 'l', axis: 3, value: 1 }, // rightStickDown
    { key: 'k', axis: 2, value: -1 }, // rightStickLeft
    { key: 'Semicolon', axis: 2, value: 1 }, // rightStickRight
  ];

  for (const { key, axis, value } of axisTests) {
    await assert(
      `${key} maps to axes[${axis}] = ${value} per JSON.md spec`,
      async () => {
        await page.keyboard.down(key);
        const cmp = value < 0 ? 'lt' : 'gt';
        await waitForAxis(page, axis, cmp, value < 0 ? -0.5 : 0.5);
        const axes = await getAxesStates(page);
        expect(axes[axis]).toBe(value);
        await page.keyboard.up(key);
        await waitForAxesCentered(page);
      }
    );
  }
};
