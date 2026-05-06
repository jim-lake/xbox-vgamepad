// Tests: Full default config compliance — every binding from JSON.md verified end-to-end
module.exports = async function ({ page, assert, expect, helpers }) {
  const { waitForButton, waitForAxis, waitForAxesCentered } = helpers;

  console.log('  [Default Config - JSON Spec Compliance]');

  const allButtonBindings = [
    { field: 'a', key: 'Space', index: 0 },
    { field: 'b', key: 'Control', index: 1 },
    { field: 'b', key: 'Backspace', index: 1 },
    { field: 'x', key: 'r', index: 2 },
    { field: 'y', key: 'v', index: 3 },
    { field: 'leftShoulder', key: 'c', index: 4 },
    { field: 'leftShoulder', key: 'g', index: 4 },
    { field: 'rightShoulder', key: 'q', index: 5 },
    { field: 'select', key: 'Tab', index: 8 },
    { field: 'start', key: 'Enter', index: 9 },
    { field: 'leftStickPressed', key: 'Shift', index: 10 },
    { field: 'rightStickPressed', key: 'f', index: 11 },
    { field: 'dpadUp', key: 'ArrowUp', index: 12 },
    { field: 'dpadUp', key: 'x', index: 12 },
    { field: 'dpadDown', key: 'ArrowDown', index: 13 },
    { field: 'dpadDown', key: 'z', index: 13 },
    { field: 'dpadLeft', key: 'ArrowLeft', index: 14 },
    { field: 'dpadLeft', key: 'n', index: 14 },
    { field: 'dpadRight', key: 'ArrowRight', index: 15 },
  ];

  for (const { field, key, index } of allButtonBindings) {
    await assert(
      `default config: ${field} → ${key} → button[${index}]`,
      async () => {
        await page.keyboard.down(key);
        await waitForButton(page, index, true);
        await page.keyboard.up(key);
        await waitForButton(page, index, false);
      }
    );
  }

  const allAxisBindings = [
    { field: 'leftStickUp', key: 'w', axisIndex: 1, expected: -1 },
    { field: 'leftStickDown', key: 's', axisIndex: 1, expected: 1 },
    { field: 'leftStickLeft', key: 'a', axisIndex: 0, expected: -1 },
    { field: 'leftStickRight', key: 'd', axisIndex: 0, expected: 1 },
    { field: 'rightStickUp', key: 'o', axisIndex: 3, expected: -1 },
    { field: 'rightStickDown', key: 'l', axisIndex: 3, expected: 1 },
    { field: 'rightStickLeft', key: 'k', axisIndex: 2, expected: -1 },
    { field: 'rightStickRight', key: 'Semicolon', axisIndex: 2, expected: 1 },
  ];

  for (const { field, key, axisIndex, expected } of allAxisBindings) {
    await assert(
      `default config: ${field} → ${key} → axes[${axisIndex}] = ${expected}`,
      async () => {
        await page.keyboard.down(key);
        const cmp = expected < 0 ? 'lt' : 'gt';
        const thr = expected < 0 ? -0.5 : 0.5;
        await waitForAxis(page, axisIndex, cmp, thr);
        await page.keyboard.up(key);
        await waitForAxesCentered(page);
      }
    );
  }
};
