// Tests: Behavioral contract items from JSON.md
// Simultaneous inputs, alternate bindings, idle state, key release order,
// rapid presses, unbound keys, input isolation
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
    getButtonValues,
    waitForButton,
    waitForAxis,
    waitForAxesCentered,
  } = helpers;

  console.log('  [Simultaneous Inputs - JSON Spec]');

  await assert(
    'pressing Space + KeyR activates A and X simultaneously',
    async () => {
      await page.keyboard.down('Space');
      await page.keyboard.down('r');
      await waitForButton(page, 0, true);
      await waitForButton(page, 2, true);
      await page.keyboard.up('Space');
      await page.keyboard.up('r');
      await waitForButton(page, 0, false);
      await waitForButton(page, 2, false);
    }
  );

  await assert('button + stick key simultaneously works', async () => {
    await page.keyboard.down('Space');
    await page.keyboard.down('w');
    await waitForButton(page, 0, true);
    await waitForAxis(page, 1, 'lt', -0.5);
    await page.keyboard.up('Space');
    await page.keyboard.up('w');
    await waitForButton(page, 0, false);
    await waitForAxesCentered(page);
  });

  await assert('all four D-Pad directions can be held at once', async () => {
    await page.keyboard.down('ArrowUp');
    await page.keyboard.down('ArrowDown');
    await page.keyboard.down('ArrowLeft');
    await page.keyboard.down('ArrowRight');
    await waitForButton(page, 12, true);
    await waitForButton(page, 13, true);
    await waitForButton(page, 14, true);
    await waitForButton(page, 15, true);
    await page.keyboard.up('ArrowUp');
    await page.keyboard.up('ArrowDown');
    await page.keyboard.up('ArrowLeft');
    await page.keyboard.up('ArrowRight');
    await waitForButton(page, 12, false);
    await waitForButton(page, 13, false);
    await waitForButton(page, 14, false);
    await waitForButton(page, 15, false);
  });

  await assert(
    'pressing one input does not affect unrelated inputs',
    async () => {
      await page.keyboard.down('Space');
      await waitForButton(page, 0, true);
      const buttons = await getButtonStates(page);
      for (let i = 1; i < buttons.length; i++) {
        expect(buttons[i]).toBeFalse();
      }
      expect(await getAxesStates(page)).toAllBeCloseTo(0, 0.01);
      await page.keyboard.up('Space');
      await waitForButton(page, 0, false);
    }
  );

  await assert('mouse click + keyboard press work simultaneously', async () => {
    await page.mouse.move(200, 200);
    await page.mouse.down();
    await page.keyboard.down('Space');
    await waitForButton(page, 7, true);
    await waitForButton(page, 0, true);
    await page.mouse.up();
    await page.keyboard.up('Space');
    await waitForButton(page, 7, false);
    await waitForButton(page, 0, false);
  });

  console.log('  [Alternate Key Bindings - JSON Spec]');

  await assert(
    'both alternate bindings independently activate the same button',
    async () => {
      await page.keyboard.down('Control');
      await waitForButton(page, 1, true);
      await page.keyboard.up('Control');
      await waitForButton(page, 1, false);
      await page.keyboard.down('Backspace');
      await waitForButton(page, 1, true);
      await page.keyboard.up('Backspace');
      await waitForButton(page, 1, false);
    }
  );

  await assert(
    'holding both alternates then releasing one keeps button pressed',
    async () => {
      await page.keyboard.down('Control');
      await waitForButton(page, 1, true);
      await page.keyboard.down('Backspace');
      expect((await getButtonStates(page))[1]).toBeTrue();
      await page.keyboard.up('Control');
      await new Promise((r) => setTimeout(r, 100));
      await page.keyboard.up('Backspace');
      await waitForButton(page, 1, false);
    }
  );

  console.log('  [Idle State - No Phantom Input]');

  await assert('no buttons pressed when idle', async () => {
    await releaseAll(page);
    await new Promise((r) => setTimeout(r, 200));
    expect(await getButtonStates(page)).toAllBeFalse();
  });

  await assert('all axes centered when idle', async () => {
    await releaseAll(page);
    await waitForAxesCentered(page);
    expect(await getAxesStates(page)).toAllBeCloseTo(0, 0.01);
  });

  await assert('all button values are 0 when idle', async () => {
    await releaseAll(page);
    await new Promise((r) => setTimeout(r, 200));
    expect(await getButtonValues(page)).toAllBeCloseTo(0, 0.01);
  });

  console.log('  [Key Release Order]');

  await assert(
    'releasing keys in reverse order clears all buttons',
    async () => {
      await page.keyboard.down('Space');
      await page.keyboard.down('r');
      await page.keyboard.down('Enter');
      await waitForButton(page, 0, true);
      await waitForButton(page, 2, true);
      await waitForButton(page, 9, true);
      await page.keyboard.up('Enter');
      await waitForButton(page, 9, false);
      await page.keyboard.up('r');
      await waitForButton(page, 2, false);
      await page.keyboard.up('Space');
      await waitForButton(page, 0, false);
      expect(await getButtonStates(page)).toAllBeFalse();
    }
  );

  await assert(
    'releasing one stick direction while holding another updates correctly',
    async () => {
      await page.keyboard.down('w');
      await page.keyboard.down('d');
      await waitForAxis(page, 0, 'gt', 0.5);
      await waitForAxis(page, 1, 'lt', -0.5);
      await page.keyboard.up('w');
      await waitForAxis(page, 1, 'eq', 0);
      const axes = await getAxesStates(page);
      expect(axes[0]).toBeGreaterThan(0);
      expect(axes[1]).toBeCloseTo(0, 0.05);
      await page.keyboard.up('d');
      await waitForAxesCentered(page);
    }
  );

  console.log('  [Rapid Key Presses]');

  await assert('rapid press/release cycles register correctly', async () => {
    for (let i = 0; i < 5; i++) {
      await page.keyboard.down('Space');
      await waitForButton(page, 0, true);
      await page.keyboard.up('Space');
      await waitForButton(page, 0, false);
    }
  });

  await assert('rapid axis direction changes register correctly', async () => {
    for (let i = 0; i < 3; i++) {
      await page.keyboard.down('w');
      await waitForAxis(page, 1, 'lt', -0.5);
      await page.keyboard.up('w');
      await waitForAxis(page, 1, 'eq', 0);
    }
  });

  console.log('  [Unbound Keys]');

  await assert(
    'pressing an unbound key does not affect any button',
    async () => {
      await page.keyboard.down('h');
      await new Promise((r) => setTimeout(r, 200));
      expect(await getButtonStates(page)).toAllBeFalse();
      await page.keyboard.up('h');
    }
  );

  await assert(
    'home button (index 16) is unbound in default config',
    async () => {
      await releaseAll(page);
      await new Promise((r) => setTimeout(r, 100));
      expect((await getButtonStates(page))[16]).toBeFalse();
    }
  );
};
