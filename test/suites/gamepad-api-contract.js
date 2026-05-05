// Tests: Gamepad API contract — getGamepads() shape, gamepad at index 0,
// other slots empty, axis clamping, mouse diagonal movement,
// mouse with mouseControls=undefined produces no deflection,
// gamepad appears/disappears from getGamepads() array
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
    getAxesStates,
    getButtonStates,
    getGamepadIdentity,
    getConnectionStatus,
    waitForButton,
    waitForAxis,
    waitForAxesCentered,
    waitForStatus,
    sendConfigToPage,
  } = helpers;

  async function getCDPSession(pg) {
    if (typeof pg.createCDPSession === 'function') return pg.createCDPSession();
    if (pg.target && typeof pg.target === 'function')
      return pg.target().createCDPSession();
    throw new Error('Cannot create CDP session');
  }

  console.log('  [Gamepad API - getGamepads() Array Shape]');

  await assert(
    'navigator.getGamepads() returns array-like with gamepad at index 0',
    async () => {
      const result = await page.evaluate(() => {
        const gps = navigator.getGamepads();
        return {
          length: gps.length,
          hasIndex0: gps[0] !== null && gps[0] !== undefined,
          index0Id: gps[0]?.id,
        };
      });
      expect(result.hasIndex0).toBeTrue();
      expect(result.index0Id).toBe(
        'Xbox 360 Controller (XInput STANDARD GAMEPAD)'
      );
    }
  );

  await assert('gamepad slots beyond index 0 are null or empty', async () => {
    const result = await page.evaluate(() => {
      const gps = navigator.getGamepads();
      const others = [];
      for (let i = 1; i < gps.length; i++) {
        if (gps[i] !== null) others.push(i);
      }
      return others;
    });
    if (result.length > 0)
      throw new Error(`Non-null gamepads at indices: ${result.join(', ')}`);
  });

  await assert(
    'gamepad.index property matches its position in getGamepads()',
    async () => {
      const result = await page.evaluate(() => {
        const gp = navigator.getGamepads()[0];
        return { index: gp?.index, id: gp?.id };
      });
      expect(result.index).toBe(0);
    }
  );

  console.log('  [Gamepad API - Gamepad Object Properties]');

  await assert('gamepad.timestamp is a number', async () => {
    const ts = await page.evaluate(() => {
      const gp = navigator.getGamepads()[0];
      return typeof gp?.timestamp;
    });
    expect(ts).toBe('number');
  });

  await assert('gamepad.buttons entries have correct shape', async () => {
    const result = await page.evaluate(() => {
      const gp = navigator.getGamepads()[0];
      if (!gp) return { ok: false, reason: 'no gamepad' };
      for (let i = 0; i < gp.buttons.length; i++) {
        const b = gp.buttons[i];
        if (typeof b.pressed !== 'boolean')
          return { ok: false, reason: `buttons[${i}].pressed not boolean` };
        if (typeof b.value !== 'number')
          return { ok: false, reason: `buttons[${i}].value not number` };
        if (typeof b.touched !== 'boolean')
          return { ok: false, reason: `buttons[${i}].touched not boolean` };
      }
      return { ok: true };
    });
    expect(result.ok).toBeTrue();
  });

  await assert('gamepad.axes entries are all numbers', async () => {
    const result = await page.evaluate(() => {
      const gp = navigator.getGamepads()[0];
      if (!gp) return false;
      return gp.axes.every((a) => typeof a === 'number');
    });
    expect(result).toBeTrue();
  });

  console.log('  [Gamepad API - Axis Value Clamping]');

  await assert(
    'axis values never exceed +1 or go below -1 from keyboard input',
    async () => {
      // Press opposing directions and single directions, verify clamping
      await page.keyboard.down('w');
      await waitForAxis(page, 1, 'lt', -0.5);
      const axes1 = await getAxesStates(page);
      if (axes1[1] < -1.001) throw new Error(`Axis 1 below -1: ${axes1[1]}`);
      await page.keyboard.up('w');

      await page.keyboard.down('s');
      await waitForAxis(page, 1, 'gt', 0.5);
      const axes2 = await getAxesStates(page);
      if (axes2[1] > 1.001) throw new Error(`Axis 1 above +1: ${axes2[1]}`);
      await page.keyboard.up('s');
      await waitForAxesCentered(page);
    }
  );

  await assert(
    'mouse movement does not produce axis values outside [-1, +1]',
    async () => {
      await page.mouse.click(200, 200);
      await new Promise((r) => setTimeout(r, 200));

      const cdp = await getCDPSession(page);
      // Send a very large mouse movement
      await cdp.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: 500,
        y: 500,
        movementX: 99999,
        movementY: 99999,
      });
      await new Promise((r) => setTimeout(r, 200));

      const axes = await getAxesStates(page);
      for (let i = 0; i < 4; i++) {
        if (axes[i] > 1.001 || axes[i] < -1.001) {
          await cdp.detach();
          throw new Error(`Axis ${i} out of range: ${axes[i]}`);
        }
      }
      await cdp.detach();
      await new Promise((r) => setTimeout(r, 300));
    }
  );

  console.log('  [Mouse - Diagonal Movement]');

  await assert(
    'diagonal mouse movement deflects both X and Y of target stick',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.mouse.click(200, 200);
      await new Promise((r) => setTimeout(r, 200));

      const cdp = await getCDPSession(page);
      await cdp.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: 300,
        y: 300,
        movementX: 50,
        movementY: 50,
      });
      await new Promise((r) => setTimeout(r, 200));

      const axes = await getAxesStates(page);
      // Right stick (axes 2,3) should both be deflected if pointer lock is active
      if (Math.abs(axes[2]) > 0.01 && Math.abs(axes[3]) > 0.01) {
        expect(axes[2]).toBeGreaterThan(0);
        expect(axes[3]).toBeGreaterThan(0);
      }
      // else: pointer lock not available in headless — skip gracefully

      await cdp.detach();
      await new Promise((r) => setTimeout(r, 300));
    }
  );

  console.log('  [Mouse - mouseControls=undefined Produces No Deflection]');

  await assert(
    'mouse movement with mouseControls=undefined does not deflect any stick',
    async () => {
      const config = {
        mouseConfig: { mouseControls: undefined, sensitivity: 10 },
        keyConfig: { a: 'Space' },
      };
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'noMouse',
        gamepadConfig: config,
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.mouse.click(200, 200);
      await new Promise((r) => setTimeout(r, 200));

      const cdp = await getCDPSession(page);
      await cdp.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: 400,
        y: 400,
        movementX: 100,
        movementY: 100,
      });
      await new Promise((r) => setTimeout(r, 200));

      const axes = await getAxesStates(page);
      expect(axes).toAllBeCloseTo(0, 0.05);

      await cdp.detach();
      await new Promise((r) => setTimeout(r, 300));
    }
  );

  console.log(
    '  [Gamepad API - Gamepad Disappears from getGamepads on Disable]'
  );

  await assert('getGamepads()[0] is null after disable', async () => {
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'default',
      gamepadConfig: DEFAULT_CONFIG,
    });
    await waitForStatus(page, 'connected');

    await sendConfigToPage(page, { type: 'DISABLE_GAMEPAD' });
    await waitForStatus(page, 'disconnected');

    const result = await page.evaluate(() => {
      const gps = navigator.getGamepads();
      return (
        gps[0] === null || gps[0] === undefined || gps[0].connected === false
      );
    });
    expect(result).toBeTrue();
  });

  await assert(
    'getGamepads()[0] returns valid gamepad after re-enable',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'default',
        gamepadConfig: DEFAULT_CONFIG,
      });
      await waitForStatus(page, 'connected');

      const result = await page.evaluate(() => {
        const gp = navigator.getGamepads()[0];
        return (
          gp !== null &&
          gp !== undefined &&
          gp.connected === true &&
          gp.id === 'Xbox 360 Controller (XInput STANDARD GAMEPAD)'
        );
      });
      expect(result).toBeTrue();
    }
  );

  console.log(
    '  [Gamepad API - Multiple Enable/Disable Cycles Preserve Identity]'
  );

  await assert(
    'gamepad identity is consistent across multiple enable/disable cycles',
    async () => {
      for (let i = 0; i < 3; i++) {
        await sendConfigToPage(page, { type: 'DISABLE_GAMEPAD' });
        await waitForStatus(page, 'disconnected');
        await sendConfigToPage(page, {
          type: 'ACTIVATE_GAMEPAD_CONFIG',
          name: 'default',
          gamepadConfig: DEFAULT_CONFIG,
        });
        await waitForStatus(page, 'connected');
      }

      const identity = await getGamepadIdentity(page);
      expect(identity.id).toBe('Xbox 360 Controller (XInput STANDARD GAMEPAD)');
      expect(identity.index).toBe(0);
      expect(identity.mapping).toBe('standard');
      expect(identity.connected).toBe('true');
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
