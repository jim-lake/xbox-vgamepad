// Tests: Trigger buttons (LT/RT, indices 6 and 7) via keyboard bindings,
// all opposing axis release sequences for all 4 axes,
// gamepad data freshness, no duplicate gamepads after enable/disable cycles
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

  console.log('  [Trigger Buttons via Keyboard - Custom Config]');

  const triggerConfig = {
    mouseConfig: { mouseControls: undefined, sensitivity: 10 },
    keyConfig: {
      leftTrigger: 'KeyQ',
      rightTrigger: 'KeyE',
      a: 'Space',
    },
  };

  await assert(
    'left trigger (index 6) activates via keyboard binding',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'triggerKB',
        gamepadConfig: triggerConfig,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.down('q');
      await waitForButton(page, 6, true);
      const values = await getButtonValues(page);
      expect(values[6]).toBe(1);
      await page.keyboard.up('q');
      await waitForButton(page, 6, false);
      const valuesAfter = await getButtonValues(page);
      expect(valuesAfter[6]).toBe(0);
    }
  );

  await assert(
    'right trigger (index 7) activates via keyboard binding',
    async () => {
      await page.keyboard.down('e');
      await waitForButton(page, 7, true);
      const values = await getButtonValues(page);
      expect(values[7]).toBe(1);
      await page.keyboard.up('e');
      await waitForButton(page, 7, false);
    }
  );

  await assert(
    'both triggers can be held simultaneously via keyboard',
    async () => {
      await page.keyboard.down('q');
      await page.keyboard.down('e');
      await waitForButton(page, 6, true);
      await waitForButton(page, 7, true);
      const buttons = await getButtonStates(page);
      expect(buttons[6]).toBeTrue();
      expect(buttons[7]).toBeTrue();
      await page.keyboard.up('q');
      await page.keyboard.up('e');
      await waitForButton(page, 6, false);
      await waitForButton(page, 7, false);
    }
  );

  await assert(
    'trigger + face button simultaneously via keyboard',
    async () => {
      await releaseAll(page);
      await new Promise((r) => setTimeout(r, 200));

      await page.keyboard.down('q');
      await waitForButton(page, 6, true);
      await page.keyboard.down('Space');
      await waitForButton(page, 0, true);

      const buttons = await getButtonStates(page);
      expect(buttons[6]).toBeTrue();
      expect(buttons[0]).toBeTrue();

      await page.keyboard.up('q');
      await waitForButton(page, 6, false);
      expect((await getButtonStates(page))[0]).toBeTrue();
      await page.keyboard.up('Space');
      await waitForButton(page, 0, false);
    }
  );

  await assert(
    'triggers with array bindings work for both keys',
    async () => {
      const config = {
        mouseConfig: { mouseControls: undefined, sensitivity: 10 },
        keyConfig: {
          leftTrigger: ['KeyQ', 'KeyZ'],
          rightTrigger: ['KeyE', 'KeyX'],
        },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'triggerArr',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.keyboard.down('q');
      await waitForButton(page, 6, true);
      await page.keyboard.up('q');
      await waitForButton(page, 6, false);

      await page.keyboard.down('z');
      await waitForButton(page, 6, true);
      await page.keyboard.up('z');
      await waitForButton(page, 6, false);

      await page.keyboard.down('x');
      await waitForButton(page, 7, true);
      await page.keyboard.up('x');
      await waitForButton(page, 7, false);
    }
  );

  console.log('  [Opposing Axis Release Sequences - All 4 Axes]');

  // Restore default config for axis tests
  await releaseAll(page);
  await sendConfigToPage(page, {
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: 'default',
    gamepadConfig: DEFAULT_CONFIG,
  });
  await new Promise((r) => setTimeout(r, 500));

  const opposingTests = [
    { keyA: 'w', keyB: 's', axis: 1, dirA: -1, dirB: 1, label: 'left stick Y' },
    { keyA: 'a', keyB: 'd', axis: 0, dirA: -1, dirB: 1, label: 'left stick X' },
    { keyA: 'o', keyB: 'l', axis: 3, dirA: -1, dirB: 1, label: 'right stick Y' },
    { keyA: 'k', keyB: 'Semicolon', axis: 2, dirA: -1, dirB: 1, label: 'right stick X' },
  ];

  for (const { keyA, keyB, axis, dirA, dirB, label } of opposingTests) {
    await assert(
      `${label}: press ${keyA}, press ${keyB} (cancel), release ${keyA} → axis = ${dirB}`,
      async () => {
        await releaseAll(page);
        await new Promise((r) => setTimeout(r, 100));

        await page.keyboard.down(keyA);
        await waitForAxis(page, axis, dirA < 0 ? 'lt' : 'gt', dirA < 0 ? -0.5 : 0.5);
        await page.keyboard.down(keyB);
        await waitForAxis(page, axis, 'eq', 0);
        await page.keyboard.up(keyA);
        await waitForAxis(page, axis, dirB < 0 ? 'lt' : 'gt', dirB < 0 ? -0.5 : 0.5);
        expect((await getAxesStates(page))[axis]).toBe(dirB);
        await page.keyboard.up(keyB);
        await waitForAxesCentered(page);
      }
    );

    await assert(
      `${label}: press ${keyB}, press ${keyA} (cancel), release ${keyB} → axis = ${dirA}`,
      async () => {
        await releaseAll(page);
        await new Promise((r) => setTimeout(r, 100));

        await page.keyboard.down(keyB);
        await waitForAxis(page, axis, dirB < 0 ? 'lt' : 'gt', dirB < 0 ? -0.5 : 0.5);
        await page.keyboard.down(keyA);
        await waitForAxis(page, axis, 'eq', 0);
        await page.keyboard.up(keyB);
        await waitForAxis(page, axis, dirA < 0 ? 'lt' : 'gt', dirA < 0 ? -0.5 : 0.5);
        expect((await getAxesStates(page))[axis]).toBe(dirA);
        await page.keyboard.up(keyA);
        await waitForAxesCentered(page);
      }
    );
  }

  console.log('  [Gamepad Data - Fresh Reads Reflect Current State]');

  await assert(
    'two consecutive getGamepads() calls during input show same state',
    async () => {
      await page.keyboard.down('Space');
      await waitForButton(page, 0, true);

      const result = await page.evaluate(() => {
        const gp1 = navigator.getGamepads()[0];
        const gp2 = navigator.getGamepads()[0];
        return {
          read1: gp1.buttons[0].pressed,
          read2: gp2.buttons[0].pressed,
        };
      });
      expect(result.read1).toBeTrue();
      expect(result.read2).toBeTrue();

      await page.keyboard.up('Space');
      await waitForButton(page, 0, false);
    }
  );

  console.log('  [No Duplicate Gamepads After Enable/Disable Cycles]');

  await assert(
    'only one gamepad in getGamepads() after 5 enable/disable cycles',
    async () => {
      for (let i = 0; i < 5; i++) {
        await sendConfigToPage(page, { type: 'DISABLE_GAMEPAD' });
        await waitForStatus(page, 'disconnected');
        await sendConfigToPage(page, {
          type: 'ACTIVATE_GAMEPAD_CONFIG',
          name: 'default',
          gamepadConfig: DEFAULT_CONFIG,
        });
        await waitForStatus(page, 'connected');
      }

      const count = await page.evaluate(() => {
        const gps = navigator.getGamepads();
        let n = 0;
        for (let i = 0; i < gps.length; i++) {
          if (gps[i] !== null && gps[i] !== undefined && gps[i].connected) n++;
        }
        return n;
      });
      expect(count).toBe(1);
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
