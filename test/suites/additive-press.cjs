// Tests: Additive button/axis press model — multiple keys mapped to the same
// action are additive; a button/axis stays active until ALL sources release it.
module.exports = async function ({
  page,
  assert,
  expect,
  helpers,
  releaseAll,
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

  await releaseAll(page);

  // Config: two keys → same button, two keys → same axis direction
  const config = makeConfig({
    mouseConfig: { mouseControls: null, sensitivity: 10 },
    keyboardConfig: {
      KeyA: 'a',
      KeyB: 'a',
      KeyW: 'leftStickUp',
      KeyI: 'leftStickUp',
      F9: 'toggleGamepad',
    },
  });
  await sendConfigToPage(page, {
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: 'additive-test',
    gamepadConfig: config,
  });
  await new Promise((r) => setTimeout(r, 300));

  console.log('  [Additive Button Press]');

  await assert(
    'button stays pressed when first of two keys is released',
    async () => {
      await page.keyboard.down('a');
      await waitForButton(page, 0, true);
      await page.keyboard.down('b');
      await new Promise((r) => setTimeout(r, 50));
      expect((await getButtonStates(page))[0]).toBeTrue();

      await page.keyboard.up('a');
      await new Promise((r) => setTimeout(r, 100));
      // b is still held — button must remain pressed
      expect((await getButtonStates(page))[0]).toBeTrue();

      await page.keyboard.up('b');
      await waitForButton(page, 0, false);
    }
  );

  await assert(
    'button stays pressed when second of two keys is released',
    async () => {
      await page.keyboard.down('a');
      await waitForButton(page, 0, true);
      await page.keyboard.down('b');
      await new Promise((r) => setTimeout(r, 50));

      await page.keyboard.up('b');
      await new Promise((r) => setTimeout(r, 100));
      // a is still held — button must remain pressed
      expect((await getButtonStates(page))[0]).toBeTrue();

      await page.keyboard.up('a');
      await waitForButton(page, 0, false);
    }
  );

  await assert('button releases only after both keys are up', async () => {
    await page.keyboard.down('a');
    await page.keyboard.down('b');
    await waitForButton(page, 0, true);

    await page.keyboard.up('a');
    await page.keyboard.up('b');
    await waitForButton(page, 0, false);
    expect((await getButtonStates(page))[0]).toBeFalse();
  });

  console.log('  [Additive Axis Press]');

  await assert(
    'axis stays deflected when first of two keys is released',
    async () => {
      await page.keyboard.down('w');
      await waitForAxis(page, 1, 'lt', -0.5);
      await page.keyboard.down('i');
      await new Promise((r) => setTimeout(r, 50));

      await page.keyboard.up('w');
      await new Promise((r) => setTimeout(r, 100));
      // i is still held — axis must remain deflected
      const axes = await getAxesStates(page);
      expect(axes[1]).toBeCloseTo(-1, 0.05);

      await page.keyboard.up('i');
      await waitForAxesCentered(page);
    }
  );

  await assert(
    'axis stays deflected when second of two keys is released',
    async () => {
      await page.keyboard.down('w');
      await waitForAxis(page, 1, 'lt', -0.5);
      await page.keyboard.down('i');
      await new Promise((r) => setTimeout(r, 50));

      await page.keyboard.up('i');
      await new Promise((r) => setTimeout(r, 100));
      // w is still held — axis must remain deflected
      const axes = await getAxesStates(page);
      expect(axes[1]).toBeCloseTo(-1, 0.05);

      await page.keyboard.up('w');
      await waitForAxesCentered(page);
    }
  );

  await assert('axis centers only after both keys are up', async () => {
    await page.keyboard.down('w');
    await page.keyboard.down('i');
    await waitForAxis(page, 1, 'lt', -0.5);

    await page.keyboard.up('w');
    await page.keyboard.up('i');
    await waitForAxesCentered(page);
    expect((await getAxesStates(page))[1]).toBeCloseTo(0, 0.05);
  });
};
