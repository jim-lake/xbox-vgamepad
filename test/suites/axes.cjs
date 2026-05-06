// Tests: Axis bindings, opposing axes, diagonal movement (JSON.md behavioral contract)
module.exports = async function ({ page, assert, expect, helpers }) {
  const { getAxesStates, waitForAxis, waitForAxesCentered } = helpers;

  console.log('  [Left Stick Axes (WASD)]');
  for (const { key, axis, expected, label } of [
    {
      key: 'w',
      axis: 1,
      expected: -1,
      label: 'W moves left stick up (axis 1 = -1)',
    },
    {
      key: 's',
      axis: 1,
      expected: 1,
      label: 'S moves left stick down (axis 1 = +1)',
    },
    {
      key: 'a',
      axis: 0,
      expected: -1,
      label: 'A moves left stick left (axis 0 = -1)',
    },
    {
      key: 'd',
      axis: 0,
      expected: 1,
      label: 'D moves left stick right (axis 0 = +1)',
    },
  ]) {
    await assert(`pressing ${label}`, async () => {
      await page.keyboard.down(key);
      await waitForAxis(
        page,
        axis,
        expected < 0 ? 'lt' : 'gt',
        expected < 0 ? -0.5 : 0.5
      );
      expect((await getAxesStates(page))[axis]).toBeCloseTo(expected, 0.05);
      await page.keyboard.up(key);
      await waitForAxesCentered(page);
    });
  }

  console.log('  [Right Stick Axes (OKLS)]');
  for (const { key, axis, expected, label } of [
    {
      key: 'o',
      axis: 3,
      expected: -1,
      label: 'O moves right stick up (axis 3 = -1)',
    },
    {
      key: 'l',
      axis: 3,
      expected: 1,
      label: 'L moves right stick down (axis 3 = +1)',
    },
    {
      key: 'k',
      axis: 2,
      expected: -1,
      label: 'K moves right stick left (axis 2 = -1)',
    },
    {
      key: 'Semicolon',
      axis: 2,
      expected: 1,
      label: '; moves right stick right (axis 2 = +1)',
    },
  ]) {
    await assert(`pressing ${label}`, async () => {
      await page.keyboard.down(key);
      await waitForAxis(
        page,
        axis,
        expected < 0 ? 'lt' : 'gt',
        expected < 0 ? -0.5 : 0.5
      );
      expect((await getAxesStates(page))[axis]).toBeCloseTo(expected, 0.05);
      await page.keyboard.up(key);
      await waitForAxesCentered(page);
    });
  }

  console.log('  [Opposing Axes Cancel - JSON Spec]');

  for (const { keys, axis, label } of [
    {
      keys: ['w', 's'],
      axis: 1,
      label: 'W + S cancels left stick Y axis to 0',
    },
    {
      keys: ['a', 'd'],
      axis: 0,
      label: 'A + D cancels left stick X axis to 0',
    },
    {
      keys: ['k', 'Semicolon'],
      axis: 2,
      label: 'K + ; cancels right stick X axis to 0',
    },
    {
      keys: ['o', 'l'],
      axis: 3,
      label: 'O + L cancels right stick Y axis to 0',
    },
  ]) {
    await assert(`holding ${label}`, async () => {
      await page.keyboard.down(keys[0]);
      await new Promise((r) => setTimeout(r, 50));
      await page.keyboard.down(keys[1]);
      await waitForAxis(page, axis, 'eq', 0);
      expect((await getAxesStates(page))[axis]).toBeCloseTo(0, 0.05);
      await page.keyboard.up(keys[0]);
      await page.keyboard.up(keys[1]);
      await waitForAxesCentered(page);
    });
  }

  await assert(
    'releasing one opposing direction restores the other',
    async () => {
      await page.keyboard.down('w');
      await waitForAxis(page, 1, 'lt', -0.5);
      await page.keyboard.down('s');
      await waitForAxis(page, 1, 'eq', 0);
      await page.keyboard.up('w');
      await waitForAxis(page, 1, 'gt', 0.5);
      expect((await getAxesStates(page))[1]).toBeCloseTo(1, 0.05);
      await page.keyboard.up('s');
      await waitForAxesCentered(page);
    }
  );

  console.log('  [Diagonal Stick Movement]');

  await assert('W + D produces diagonal left stick movement', async () => {
    await page.keyboard.down('w');
    await page.keyboard.down('d');
    await waitForAxis(page, 0, 'gt', 0.5);
    await waitForAxis(page, 1, 'lt', -0.5);
    const axes = await getAxesStates(page);
    expect(axes[0]).toBeCloseTo(1, 0.05);
    expect(axes[1]).toBeCloseTo(-1, 0.05);
    await page.keyboard.up('w');
    await page.keyboard.up('d');
    await waitForAxesCentered(page);
  });

  await assert(
    'all four axis directions produce correct values simultaneously',
    async () => {
      await page.keyboard.down('d'); // left X = +1
      await page.keyboard.down('w'); // left Y = -1
      await page.keyboard.down('Semicolon'); // right X = +1
      await page.keyboard.down('o'); // right Y = -1
      await waitForAxis(page, 0, 'gt', 0.5);
      await waitForAxis(page, 1, 'lt', -0.5);
      await waitForAxis(page, 2, 'gt', 0.5);
      await waitForAxis(page, 3, 'lt', -0.5);
      const axes = await getAxesStates(page);
      expect(axes[0]).toBeCloseTo(1, 0.05);
      expect(axes[1]).toBeCloseTo(-1, 0.05);
      expect(axes[2]).toBeCloseTo(1, 0.05);
      expect(axes[3]).toBeCloseTo(-1, 0.05);
      await page.keyboard.up('d');
      await page.keyboard.up('w');
      await page.keyboard.up('Semicolon');
      await page.keyboard.up('o');
      await waitForAxesCentered(page);
    }
  );
};
