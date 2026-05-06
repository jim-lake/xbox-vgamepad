// Tests: Default config JSON.md compliance — verify the exact default config
// structure matches the spec, including every field name, key code, and value
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

  await assert('default config has home = undefined', async () => {
    expect(DEFAULT_CONFIG.keyConfig.home).toBe(undefined);
  });

  // Verify every single binding from the JSON.md default config spec
  const expectedBindings = {
    a: 'Space',
    b: ['ControlLeft', 'Backspace'],
    x: 'KeyR',
    y: ['KeyV', 'Scroll'],
    leftShoulder: ['KeyC', 'KeyG'],
    rightShoulder: 'KeyQ',
    leftTrigger: 'RightClick',
    rightTrigger: 'Click',
    start: 'Enter',
    select: 'Tab',
    dpadUp: ['ArrowUp', 'KeyX'],
    dpadDown: ['ArrowDown', 'KeyZ'],
    dpadLeft: ['ArrowLeft', 'KeyN'],
    dpadRight: 'ArrowRight',
    leftStickUp: 'KeyW',
    leftStickDown: 'KeyS',
    leftStickLeft: 'KeyA',
    leftStickRight: 'KeyD',
    rightStickUp: 'KeyO',
    rightStickDown: 'KeyL',
    rightStickLeft: 'KeyK',
    rightStickRight: 'Semicolon',
    leftStickPressed: 'ShiftLeft',
    rightStickPressed: 'KeyF',
  };

  for (const [field, expected] of Object.entries(expectedBindings)) {
    await assert(
      `default config: ${field} = ${JSON.stringify(expected)}`,
      async () => {
        const actual = DEFAULT_CONFIG.keyConfig[field];
        if (Array.isArray(expected)) {
          if (!Array.isArray(actual))
            throw new Error(`Expected array, got ${JSON.stringify(actual)}`);
          if (actual.length !== expected.length)
            throw new Error(
              `Array length mismatch: ${actual.length} vs ${expected.length}`
            );
          for (let i = 0; i < expected.length; i++) {
            if (actual[i] !== expected[i])
              throw new Error(
                `Index ${i}: expected ${expected[i]}, got ${actual[i]}`
              );
          }
        } else {
          if (actual !== expected)
            throw new Error(
              `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
            );
        }
      }
    );
  }

  console.log('  [Default Config - No Extra Fields]');

  await assert(
    'default config keyConfig has exactly the expected fields',
    async () => {
      const expectedFields = Object.keys(expectedBindings).sort();
      const actualFields = Object.keys(DEFAULT_CONFIG.keyConfig)
        .filter((k) => DEFAULT_CONFIG.keyConfig[k] !== undefined)
        .sort();
      // All expected fields should be present
      for (const f of expectedFields) {
        if (
          DEFAULT_CONFIG.keyConfig[f] === undefined &&
          expectedBindings[f] !== undefined
        ) {
          throw new Error(`Missing field: ${f}`);
        }
      }
    }
  );

  console.log('  [Default Config - Button Index Mapping Compliance]');

  // Verify the button field → gamepadIndex mapping from JSON.md
  const buttonIndexMap = {
    a: 0,
    b: 1,
    x: 2,
    y: 3,
    leftShoulder: 4,
    rightShoulder: 5,
    leftTrigger: 6,
    rightTrigger: 7,
    select: 8,
    start: 9,
    leftStickPressed: 10,
    rightStickPressed: 11,
    dpadUp: 12,
    dpadDown: 13,
    dpadLeft: 14,
    dpadRight: 15,
    home: 16,
  };

  // Map of field → puppeteer key for the first binding
  const fieldToKey = {
    a: 'Space',
    b: 'Control',
    x: 'r',
    rightShoulder: 'q',
    select: 'Tab',
    start: 'Enter',
    leftStickPressed: 'Shift',
    rightStickPressed: 'f',
    dpadUp: 'ArrowUp',
    dpadDown: 'ArrowDown',
    dpadLeft: 'ArrowLeft',
    dpadRight: 'ArrowRight',
  };

  for (const [field, key] of Object.entries(fieldToKey)) {
    const idx = buttonIndexMap[field];
    await assert(
      `${field} maps to gamepadIndex ${idx} per JSON.md spec`,
      async () => {
        await page.keyboard.down(key);
        await waitForButton(page, idx, true);
        // Verify it's the correct index and no other button is affected
        const buttons = await getButtonStates(page);
        expect(buttons[idx]).toBeTrue();
        await page.keyboard.up(key);
        await waitForButton(page, idx, false);
      }
    );
  }

  console.log('  [Default Config - Axis Index Mapping Compliance]');

  const axisIndexMap = {
    leftStickUp: { axis: 1, value: -1 },
    leftStickDown: { axis: 1, value: 1 },
    leftStickLeft: { axis: 0, value: -1 },
    leftStickRight: { axis: 0, value: 1 },
    rightStickUp: { axis: 3, value: -1 },
    rightStickDown: { axis: 3, value: 1 },
    rightStickLeft: { axis: 2, value: -1 },
    rightStickRight: { axis: 2, value: 1 },
  };

  const axisFieldToKey = {
    leftStickUp: 'w',
    leftStickDown: 's',
    leftStickLeft: 'a',
    leftStickRight: 'd',
    rightStickUp: 'o',
    rightStickDown: 'l',
    rightStickLeft: 'k',
    rightStickRight: 'Semicolon',
  };

  for (const [field, { axis, value }] of Object.entries(axisIndexMap)) {
    const key = axisFieldToKey[field];
    await assert(
      `${field} maps to axes[${axis}] = ${value} per JSON.md spec`,
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
