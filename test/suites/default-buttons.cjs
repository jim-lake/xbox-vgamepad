// Tests: All default config button bindings (JSON.md default config)
module.exports = async function ({
  page,
  assert,
  expect,
  helpers,
  releaseAll,
}) {
  const { getButtonStates, waitForButton } = helpers;

  console.log('  [Face Buttons]');
  const faceButtons = [
    { name: 'A', key: 'Space', index: 0 },
    { name: 'B (ControlLeft)', key: 'Control', index: 1 },
    { name: 'B (Backspace)', key: 'Backspace', index: 1 },
    { name: 'X', key: 'r', index: 2 },
    { name: 'Y (KeyV)', key: 'v', index: 3 },
  ];
  for (const { name, key, index } of faceButtons) {
    await assert(
      `pressing ${key} triggers button ${name} (index ${index})`,
      async () => {
        await page.keyboard.down(key);
        await waitForButton(page, index, true);
        expect((await getButtonStates(page))[index]).toBeTrue();
        await page.keyboard.up(key);
        await waitForButton(page, index, false);
      }
    );
  }

  console.log('  [Shoulder & Trigger Buttons]');
  const shoulderButtons = [
    { name: 'Left Shoulder (KeyC)', key: 'c', index: 4 },
    { name: 'Left Shoulder (KeyG)', key: 'g', index: 4 },
    { name: 'Right Shoulder', key: 'q', index: 5 },
  ];
  for (const { name, key, index } of shoulderButtons) {
    await assert(
      `pressing ${key} triggers ${name} (index ${index})`,
      async () => {
        await page.keyboard.down(key);
        await waitForButton(page, index, true);
        expect((await getButtonStates(page))[index]).toBeTrue();
        await page.keyboard.up(key);
        await waitForButton(page, index, false);
      }
    );
  }

  console.log('  [Menu Buttons]');
  for (const { name, key, index } of [
    { name: 'Select', key: 'Tab', index: 8 },
    { name: 'Start', key: 'Enter', index: 9 },
  ]) {
    await assert(
      `pressing ${key} triggers ${name} (index ${index})`,
      async () => {
        await page.keyboard.down(key);
        await waitForButton(page, index, true);
        await page.keyboard.up(key);
        await waitForButton(page, index, false);
      }
    );
  }

  console.log('  [Stick Press Buttons]');
  for (const { name, key, index } of [
    { name: 'Left Stick Press (ShiftLeft)', key: 'Shift', index: 10 },
    { name: 'Right Stick Press (KeyF)', key: 'f', index: 11 },
  ]) {
    await assert(
      `pressing ${key} triggers ${name} (index ${index})`,
      async () => {
        await page.keyboard.down(key);
        await waitForButton(page, index, true);
        await page.keyboard.up(key);
        await waitForButton(page, index, false);
      }
    );
  }

  console.log('  [D-Pad Buttons]');
  const dpadButtons = [
    { name: 'D-Pad Up (ArrowUp)', key: 'ArrowUp', index: 12 },
    { name: 'D-Pad Up (KeyX)', key: 'x', index: 12 },
    { name: 'D-Pad Down (ArrowDown)', key: 'ArrowDown', index: 13 },
    { name: 'D-Pad Down (KeyZ)', key: 'z', index: 13 },
    { name: 'D-Pad Left (ArrowLeft)', key: 'ArrowLeft', index: 14 },
    { name: 'D-Pad Left (KeyN)', key: 'n', index: 14 },
    { name: 'D-Pad Right', key: 'ArrowRight', index: 15 },
  ];
  for (const { name, key, index } of dpadButtons) {
    await assert(
      `pressing ${key} triggers ${name} (index ${index})`,
      async () => {
        await page.keyboard.down(key);
        await waitForButton(page, index, true);
        await page.keyboard.up(key);
        await waitForButton(page, index, false);
      }
    );
  }

  console.log('  [Mouse Click → Trigger Buttons]');
  await page.mouse.move(200, 200);

  await assert(
    'left mouse click triggers Right Trigger (index 7)',
    async () => {
      await page.mouse.down();
      await waitForButton(page, 7, true);
      expect((await getButtonStates(page))[7]).toBeTrue();
      await page.mouse.up();
      await waitForButton(page, 7, false);
    }
  );

  await assert(
    'right mouse click triggers Left Trigger (index 6)',
    async () => {
      await page.mouse.down({ button: 'right' });
      await waitForButton(page, 6, true);
      expect((await getButtonStates(page))[6]).toBeTrue();
      await page.mouse.up({ button: 'right' });
      await waitForButton(page, 6, false);
    }
  );
};
