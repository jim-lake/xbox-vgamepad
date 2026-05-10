// Tests: JSON spec compliance — custom config shapes, single vs array bindings,
// minimal config, home button bound, mouseControls variations
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
    waitForButton,
    waitForAxis,
    waitForAxesCentered,
    sendConfigToPage,
    makeConfig,
  } = helpers;

  console.log('  [Custom Config - Single String Bindings]');

  const singleBindConfig = makeConfig({
    mouseConfig: { mouseControls: 1, sensitivity: 10 },
    keyboardConfig: {
      KeyP: 'a',
      KeyB: 'b',
      KeyI: 'x',
      KeyJ: 'y',
      KeyW: 'leftStickUp',
      KeyS: 'leftStickDown',
    },
  });

  await assert('single string bindings work for buttons', async () => {
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'single',
      gamepadConfig: singleBindConfig,
    });
    await new Promise((r) => setTimeout(r, 500));

    await page.keyboard.down('p');
    await waitForButton(page, 0, true);
    await page.keyboard.up('p');
    await waitForButton(page, 0, false);

    await page.keyboard.down('b');
    await waitForButton(page, 1, true);
    await page.keyboard.up('b');
    await waitForButton(page, 1, false);
  });

  await assert('single string bindings work for axes', async () => {
    await page.keyboard.down('w');
    await waitForAxis(page, 1, 'lt', -0.5);
    await page.keyboard.up('w');
    await waitForAxesCentered(page);
  });

  console.log('  [Custom Config - Array Bindings]');

  // Two keys bound to the same action
  const arrayBindConfig = makeConfig({
    mouseConfig: { mouseControls: 1, sensitivity: 10 },
    keyboardConfig: {
      KeyP: 'a',
      KeyH: 'a',
      KeyW: 'leftStickUp',
      KeyI: 'leftStickUp',
    },
  });

  await assert(
    'array bindings: both keys activate the same button',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'array',
        gamepadConfig: arrayBindConfig,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.down('p');
      await waitForButton(page, 0, true);
      await page.keyboard.up('p');
      await waitForButton(page, 0, false);

      await page.keyboard.down('h');
      await waitForButton(page, 0, true);
      await page.keyboard.up('h');
      await waitForButton(page, 0, false);
    }
  );

  await assert('array bindings: both keys activate the same axis', async () => {
    await page.keyboard.down('w');
    await waitForAxis(page, 1, 'lt', -0.5);
    await page.keyboard.up('w');
    await waitForAxesCentered(page);

    await page.keyboard.down('i');
    await waitForAxis(page, 1, 'lt', -0.5);
    await page.keyboard.up('i');
    await waitForAxesCentered(page);
  });

  console.log('  [Custom Config - Minimal (Empty Bindings)]');

  const minimalConfig = makeConfig({
    mouseConfig: { mouseControls: undefined, sensitivity: 10 },
    keyboardConfig: {},
  });

  await assert('minimal config: no keys produce any button press', async () => {
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'minimal',
      gamepadConfig: minimalConfig,
    });
    await new Promise((r) => setTimeout(r, 500));

    await page.keyboard.down('Space');
    await new Promise((r) => setTimeout(r, 200));
    expect(await getButtonStates(page)).toAllBeFalse();
    await page.keyboard.up('Space');
  });

  await assert('minimal config: all axes remain centered', async () => {
    await page.keyboard.down('w');
    await new Promise((r) => setTimeout(r, 200));
    expect(await getAxesStates(page)).toAllBeCloseTo(0, 0.01);
    await page.keyboard.up('w');
  });

  console.log('  [Custom Config - Home Button Bound]');

  const homeConfig = makeConfig({
    mouseConfig: { mouseControls: 1, sensitivity: 10 },
    keyboardConfig: { KeyH: 'home', Space: 'a' },
  });

  await assert('home button (index 16) works when bound', async () => {
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'home',
      gamepadConfig: homeConfig,
    });
    await new Promise((r) => setTimeout(r, 500));

    await page.keyboard.down('h');
    await waitForButton(page, 16, true);
    expect((await getButtonStates(page))[16]).toBeTrue();
    await page.keyboard.up('h');
    await waitForButton(page, 16, false);
  });

  console.log('  [Custom Config - All 17 Buttons Bound]');

  const fullConfig = makeConfig({
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
      KeyI: 'dpadUp',
      KeyJ: 'dpadDown',
      KeyK: 'dpadLeft',
      KeyL: 'dpadRight',
      KeyH: 'home',
    },
  });

  const digitKeys = [
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
    'i',
    'j',
    'k',
    'l',
    'h',
  ];

  await assert('custom config with all 17 buttons bound works', async () => {
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'full17',
      gamepadConfig: fullConfig,
    });
    await new Promise((r) => setTimeout(r, 500));

    for (let idx = 0; idx < 17; idx++) {
      await page.keyboard.down(digitKeys[idx]);
      await waitForButton(page, idx, true);
      await page.keyboard.up(digitKeys[idx]);
      await waitForButton(page, idx, false);
    }
  });

  console.log('  [Custom Config - mouseControls=0 (Left Stick)]');

  const mouseLeftStickConfig = makeConfig({
    mouseConfig: { mouseControls: 0, sensitivity: 10 },
    keyboardConfig: { Space: 'a' },
  });

  await assert('mouseControls=0 config activates without error', async () => {
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'mouseLeft',
      gamepadConfig: mouseLeftStickConfig,
    });
    await new Promise((r) => setTimeout(r, 500));

    await page.keyboard.down('Space');
    await waitForButton(page, 0, true);
    await page.keyboard.up('Space');
    await waitForButton(page, 0, false);
  });

  // Restore default for subsequent suites
  await sendConfigToPage(page, {
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: 'default',
    gamepadConfig: DEFAULT_CONFIG,
  });
  await new Promise((r) => setTimeout(r, 500));
};
