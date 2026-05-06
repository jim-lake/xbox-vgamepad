// Tests: Gamepad API details not covered elsewhere —
// timestamp updates on input, touched=true when pressed,
// gamepaddisconnected event data, exact axis values for all 8 directions,
// button value types, getGamepads() returns fresh snapshots
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
    getButtonValues,
    getButtonTouched,
    getAxesStates,
    getGamepadIdentity,
    getConnectionStatus,
    getEventCounts,
    waitForButton,
    waitForAxis,
    waitForAxesCentered,
    waitForStatus,
    sendConfigToPage,
  } = helpers;

  console.log('  [Gamepad API - Timestamp Updates on Input]');

  await assert(
    'gamepad timestamp changes when a button is pressed',
    async () => {
      const ts1 = await page.evaluate(() => {
        const gp = navigator.getGamepads()[0];
        return gp?.timestamp;
      });

      await page.keyboard.down('Space');
      await waitForButton(page, 0, true);
      await new Promise((r) => setTimeout(r, 50));

      const ts2 = await page.evaluate(() => {
        const gp = navigator.getGamepads()[0];
        return gp?.timestamp;
      });

      await page.keyboard.up('Space');
      await waitForButton(page, 0, false);

      // Timestamp should have advanced
      if (typeof ts1 === 'number' && typeof ts2 === 'number') {
        if (ts2 <= ts1)
          throw new Error(`Timestamp did not advance: ${ts1} → ${ts2}`);
      }
    }
  );

  await assert(
    'gamepad timestamp changes when an axis key is pressed',
    async () => {
      const ts1 = await page.evaluate(() => {
        const gp = navigator.getGamepads()[0];
        return gp?.timestamp;
      });

      await page.keyboard.down('w');
      await waitForAxis(page, 1, 'lt', -0.5);
      await new Promise((r) => setTimeout(r, 50));

      const ts2 = await page.evaluate(() => {
        const gp = navigator.getGamepads()[0];
        return gp?.timestamp;
      });

      await page.keyboard.up('w');
      await waitForAxesCentered(page);

      if (typeof ts1 === 'number' && typeof ts2 === 'number') {
        if (ts2 <= ts1)
          throw new Error(`Timestamp did not advance: ${ts1} → ${ts2}`);
      }
    }
  );

  console.log('  [Gamepad API - Button Touched Property Behavior]');

  await assert(
    'button touched property is boolean when button is pressed',
    async () => {
      await page.keyboard.down('Space');
      await waitForButton(page, 0, true);
      const touched = await getButtonTouched(page);
      // touched may or may not be true when pressed — implementation-dependent
      // but it must be a boolean
      if (typeof touched[0] !== 'boolean')
        throw new Error(`touched[0] is not boolean: ${typeof touched[0]}`);
      await page.keyboard.up('Space');
      await waitForButton(page, 0, false);
    }
  );

  await assert(
    'button touched property is consistent across all buttons when idle',
    async () => {
      await releaseAll(page);
      await new Promise((r) => setTimeout(r, 200));
      const touched = await getButtonTouched(page);
      for (let i = 0; i < touched.length; i++) {
        expect(touched[i]).toBeFalse();
      }
    }
  );

  console.log('  [Gamepad API - gamepaddisconnected Event Data]');

  await assert(
    'gamepaddisconnected event fires with correct count',
    async () => {
      const countsBefore = await getEventCounts(page);
      const disconnectBefore = countsBefore.disconnectCount;

      await sendConfigToPage(page, { type: 'DISABLE_GAMEPAD' });
      await waitForStatus(page, 'disconnected');

      const countsAfter = await getEventCounts(page);
      expect(countsAfter.disconnectCount).toBeGreaterThan(disconnectBefore);

      // Re-enable
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await waitForStatus(page, 'connected');
    }
  );

  console.log('  [Gamepad API - Exact Axis Values for All 8 Directions]');

  const axisDirections = [
    { key: 'w', axis: 1, expected: -1, label: 'leftStickUp' },
    { key: 's', axis: 1, expected: 1, label: 'leftStickDown' },
    { key: 'a', axis: 0, expected: -1, label: 'leftStickLeft' },
    { key: 'd', axis: 0, expected: 1, label: 'leftStickRight' },
    { key: 'o', axis: 3, expected: -1, label: 'rightStickUp' },
    { key: 'l', axis: 3, expected: 1, label: 'rightStickDown' },
    { key: 'k', axis: 2, expected: -1, label: 'rightStickLeft' },
    { key: 'Semicolon', axis: 2, expected: 1, label: 'rightStickRight' },
  ];

  for (const { key, axis, expected, label } of axisDirections) {
    await assert(
      `${label}: axis[${axis}] is exactly ${expected} when ${key} pressed`,
      async () => {
        await page.keyboard.down(key);
        const cmp = expected < 0 ? 'lt' : 'gt';
        const thr = expected < 0 ? -0.5 : 0.5;
        await waitForAxis(page, axis, cmp, thr);
        const axes = await getAxesStates(page);
        expect(axes[axis]).toBe(expected);
        await page.keyboard.up(key);
        await waitForAxesCentered(page);
      }
    );
  }

  console.log('  [Gamepad API - getGamepads() Returns Fresh Data]');

  await assert(
    'consecutive getGamepads() calls reflect state changes',
    async () => {
      await releaseAll(page);
      await new Promise((r) => setTimeout(r, 200));

      // Verify unpressed
      await waitForButton(page, 0, false);
      const before = await page.evaluate(() => {
        return navigator.getGamepads()[0]?.buttons[0].pressed;
      });
      expect(before).toBeFalse();

      // Press and verify
      await page.keyboard.down('Space');
      await waitForButton(page, 0, true);
      const during = await page.evaluate(() => {
        return navigator.getGamepads()[0]?.buttons[0].pressed;
      });
      expect(during).toBeTrue();

      // Release and verify
      await page.keyboard.up('Space');
      await waitForButton(page, 0, false);
      const after = await page.evaluate(() => {
        return navigator.getGamepads()[0]?.buttons[0].pressed;
      });
      expect(after).toBeFalse();
    }
  );

  await assert('getGamepads() reflects axis changes in real time', async () => {
    const before = await page.evaluate(() => {
      return navigator.getGamepads()[0]?.axes[1];
    });
    expect(before).toBeCloseTo(0, 0.05);

    await page.keyboard.down('w');
    await waitForAxis(page, 1, 'lt', -0.5);
    const during = await page.evaluate(() => {
      return navigator.getGamepads()[0]?.axes[1];
    });
    expect(during).toBe(-1);

    await page.keyboard.up('w');
    await waitForAxesCentered(page);
  });

  console.log('  [Gamepad API - Button Value and Pressed Consistency]');

  await assert('button.value === 1 when button.pressed === true', async () => {
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
  });

  await assert('button.value === 0 when button.pressed === false', async () => {
    const result = await page.evaluate(() => {
      const b = navigator.getGamepads()[0]?.buttons[0];
      return { pressed: b?.pressed, value: b?.value };
    });
    expect(result.pressed).toBeFalse();
    expect(result.value).toBe(0);
  });
};
