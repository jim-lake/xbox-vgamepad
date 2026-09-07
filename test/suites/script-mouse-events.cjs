// Tests: Script mouse event dispatch (pointerdown/mousedown on key_down,
// pointerup/mouseup/click on key_up), additive model for mouse buttons,
// script hold suppresses real release events, and keyboard rebinds with scripts.
module.exports = async function ({
  page,
  assert,
  expect,
  helpers,
  releaseAll,
  DEFAULT_CONFIG,
}) {
  const { sendConfigToPage, waitForStatus, waitForButton, getButtonStates } =
    helpers;

  await releaseAll(page);

  console.log('  [Script Mouse Events - pointerdown/mousedown on key_down]');

  // Script that does a Click key_down, delay, key_up
  const clickScript = {
    type: 'script',
    name: 'click-script',
    activationType: 'on_down',
    actions: [
      { type: 'key_down', keys: ['Click'] },
      { type: 'delay', durationMs: 100 },
      { type: 'key_up', keys: ['Click'] },
    ],
  };

  // Click mapped to button A (index 0) and KeyG triggers the script
  await sendConfigToPage(page, {
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: 'test',
    gamepadConfig: {
      ...DEFAULT_CONFIG,
      keyboardConfig: {
        ...DEFAULT_CONFIG.keyboardConfig,
        Click: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
        KeyG: [clickScript],
      },
    },
  });
  await waitForStatus(page, 'connected', 5000);

  await assert(
    'script key_down Click dispatches pointerdown and mousedown',
    async () => {
      await page.evaluate(() => {
        window.__testMouseEvents = [];
        const handler = (e) => {
          window.__testMouseEvents.push({
            type: e.type,
            button: e.button,
            buttons: e.buttons,
          });
        };
        window.__testMouseHandler = handler;
        document.body.addEventListener('pointerdown', handler);
        document.body.addEventListener('mousedown', handler);
        document.body.addEventListener('pointerup', handler);
        document.body.addEventListener('mouseup', handler);
        document.body.addEventListener('click', handler);
      });

      await page.keyboard.down('g');
      await new Promise((r) => setTimeout(r, 50));

      const events = await page.evaluate(() => window.__testMouseEvents);
      const ptrDown = events.find(
        (e) => e.type === 'pointerdown' && e.button === 0
      );
      const mouseDown = events.find(
        (e) => e.type === 'mousedown' && e.button === 0
      );
      expect(ptrDown !== undefined).toBeTrue();
      expect(mouseDown !== undefined).toBeTrue();
      expect(ptrDown.buttons).toBe(1);
      expect(mouseDown.buttons).toBe(1);

      await page.keyboard.up('g');
      await new Promise((r) => setTimeout(r, 200));

      await page.evaluate(() => {
        document.body.removeEventListener('pointerdown', window.__testMouseHandler);
        document.body.removeEventListener('mousedown', window.__testMouseHandler);
        document.body.removeEventListener('pointerup', window.__testMouseHandler);
        document.body.removeEventListener('mouseup', window.__testMouseHandler);
        document.body.removeEventListener('click', window.__testMouseHandler);
      });
    }
  );

  await releaseAll(page);

  await assert(
    'script key_up Click dispatches pointerup, mouseup, and click',
    async () => {
      await page.evaluate(() => {
        window.__testMouseEvents = [];
        const handler = (e) => {
          window.__testMouseEvents.push({
            type: e.type,
            button: e.button,
            buttons: e.buttons,
          });
        };
        window.__testMouseHandler = handler;
        document.body.addEventListener('pointerdown', handler);
        document.body.addEventListener('mousedown', handler);
        document.body.addEventListener('pointerup', handler);
        document.body.addEventListener('mouseup', handler);
        document.body.addEventListener('click', handler);
      });

      await page.keyboard.down('g');
      await new Promise((r) => setTimeout(r, 200));
      // Script has completed (100ms delay then key_up)

      const events = await page.evaluate(() => window.__testMouseEvents);
      const ptrUp = events.find(
        (e) => e.type === 'pointerup' && e.button === 0
      );
      const mouseUp = events.find(
        (e) => e.type === 'mouseup' && e.button === 0
      );
      const click = events.find((e) => e.type === 'click' && e.button === 0);
      expect(ptrUp !== undefined).toBeTrue();
      expect(mouseUp !== undefined).toBeTrue();
      expect(click !== undefined).toBeTrue();
      expect(ptrUp.buttons).toBe(0);
      expect(mouseUp.buttons).toBe(0);

      await page.keyboard.up('g');
      await new Promise((r) => setTimeout(r, 100));

      await page.evaluate(() => {
        document.body.removeEventListener('pointerdown', window.__testMouseHandler);
        document.body.removeEventListener('mousedown', window.__testMouseHandler);
        document.body.removeEventListener('pointerup', window.__testMouseHandler);
        document.body.removeEventListener('mouseup', window.__testMouseHandler);
        document.body.removeEventListener('click', window.__testMouseHandler);
      });
    }
  );

  await releaseAll(page);

  console.log('  [Script Mouse Events - PointerEvent properties]');

  await assert(
    'pointerdown has full PointerEvent properties (pointerId, pointerType, pressure)',
    async () => {
      await page.evaluate(() => {
        window.__testPtrProps = null;
        window.__testPtrHandler = (e) => {
          if (!window.__testPtrProps) {
            window.__testPtrProps = {
              pointerId: e.pointerId,
              pointerType: e.pointerType,
              width: e.width,
              height: e.height,
              pressure: e.pressure,
              isPrimary: e.isPrimary,
              clientX: e.clientX,
              clientY: e.clientY,
            };
          }
        };
        document.body.addEventListener('pointerdown', window.__testPtrHandler);
      });

      await page.keyboard.down('g');
      await new Promise((r) => setTimeout(r, 50));

      const props = await page.evaluate(() => window.__testPtrProps);
      expect(props !== null).toBeTrue();
      expect(props.pointerId).toBe(1);
      expect(props.pointerType).toBe('mouse');
      expect(props.width).toBe(1);
      expect(props.height).toBe(1);
      expect(props.pressure).toBe(0.5);
      expect(props.isPrimary).toBeTrue();
      expect(typeof props.clientX).toBe('number');
      expect(typeof props.clientY).toBe('number');

      await page.keyboard.up('g');
      await new Promise((r) => setTimeout(r, 200));

      await page.evaluate(() => {
        document.body.removeEventListener('pointerdown', window.__testPtrHandler);
      });
    }
  );

  await releaseAll(page);

  console.log('  [Script Mouse Events - synthesized Click does NOT trigger gamepad]');

  await assert(
    'script-dispatched Click does NOT trigger button A via input processor',
    async () => {
      // If the script's synthetic pointerdown re-entered the input processor,
      // button A would get a double-press. We verify it stays at single press
      // from the script's own 'down' action (if any) or not at all.
      // Here the script only does key_down/key_up for Click — the input processor
      // should ignore synthetic events (isScriptDispatching guard).
      await page.keyboard.down('g');
      await new Promise((r) => setTimeout(r, 50));

      // Button A should NOT be pressed — the script dispatches Click events
      // but the input processor ignores them due to isScriptDispatching
      const buttons = await getButtonStates(page);
      expect(buttons[0]).toBeFalse();

      await page.keyboard.up('g');
      await new Promise((r) => setTimeout(r, 200));
    }
  );

  await releaseAll(page);

  console.log('  [Script Mouse Events - RightClick]');

  const rightClickScript = {
    type: 'script',
    name: 'rclick-script',
    activationType: 'on_down',
    actions: [
      { type: 'key_down', keys: ['RightClick'] },
      { type: 'delay', durationMs: 100 },
      { type: 'key_up', keys: ['RightClick'] },
    ],
  };

  await sendConfigToPage(page, {
    type: 'CONFIG_CHANGED',
    name: 'test',
    gamepadConfig: {
      ...DEFAULT_CONFIG,
      keyboardConfig: {
        ...DEFAULT_CONFIG.keyboardConfig,
        Click: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
        RightClick: [{ type: 'action', gamepadIndex: 0, action: 'b' }],
        KeyG: [clickScript],
        KeyH: [rightClickScript],
      },
    },
  });
  await new Promise((r) => setTimeout(r, 100));

  await assert(
    'RightClick script dispatches button=2 pointerdown/mousedown',
    async () => {
      await page.evaluate(() => {
        window.__testMouseEvents = [];
        const handler = (e) => {
          window.__testMouseEvents.push({ type: e.type, button: e.button });
        };
        window.__testMouseHandler = handler;
        document.body.addEventListener('pointerdown', handler);
        document.body.addEventListener('mousedown', handler);
        document.body.addEventListener('pointerup', handler);
        document.body.addEventListener('mouseup', handler);
        document.body.addEventListener('click', handler);
      });

      await page.keyboard.down('h');
      await new Promise((r) => setTimeout(r, 200));

      const events = await page.evaluate(() => window.__testMouseEvents);
      const ptrDown = events.find(
        (e) => e.type === 'pointerdown' && e.button === 2
      );
      const mouseDown = events.find(
        (e) => e.type === 'mousedown' && e.button === 2
      );
      const ptrUp = events.find(
        (e) => e.type === 'pointerup' && e.button === 2
      );
      const mouseUp = events.find(
        (e) => e.type === 'mouseup' && e.button === 2
      );
      expect(ptrDown !== undefined).toBeTrue();
      expect(mouseDown !== undefined).toBeTrue();
      expect(ptrUp !== undefined).toBeTrue();
      expect(mouseUp !== undefined).toBeTrue();

      await page.keyboard.up('h');
      await new Promise((r) => setTimeout(r, 100));

      await page.evaluate(() => {
        document.body.removeEventListener('pointerdown', window.__testMouseHandler);
        document.body.removeEventListener('mousedown', window.__testMouseHandler);
        document.body.removeEventListener('pointerup', window.__testMouseHandler);
        document.body.removeEventListener('mouseup', window.__testMouseHandler);
        document.body.removeEventListener('click', window.__testMouseHandler);
      });
    }
  );

  await releaseAll(page);

  console.log('  [Script Hold - suppresses real mouse release]');

  // Script that holds Click indefinitely (held activation)
  const holdClickScript = {
    type: 'script',
    name: 'hold-click',
    activationType: 'held',
    actions: [
      { type: 'key_down', keys: ['Click'] },
      { type: 'delay', durationMs: 'infinite' },
    ],
  };

  await sendConfigToPage(page, {
    type: 'CONFIG_CHANGED',
    name: 'test',
    gamepadConfig: {
      ...DEFAULT_CONFIG,
      keyboardConfig: {
        ...DEFAULT_CONFIG.keyboardConfig,
        Click: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
        KeyG: [holdClickScript],
      },
    },
  });
  await new Promise((r) => setTimeout(r, 100));

  await assert(
    'real mouse click while script holds Click: real events suppressed, button unaffected',
    async () => {
      // Start script hold (KeyG down → script does key_down Click → pointerdown/mousedown to page)
      await page.keyboard.down('g');
      await new Promise((r) => setTimeout(r, 100));

      // Real mouse down — suppressed because script is holding button 0
      await page.mouse.down({ button: 'left' });
      await new Promise((r) => setTimeout(r, 50));

      // Button A should NOT be pressed (real pointerdown was suppressed)
      let buttons = await getButtonStates(page);
      expect(buttons[0]).toBeFalse();

      // Real mouse up — also suppressed
      await page.mouse.up({ button: 'left' });
      await new Promise((r) => setTimeout(r, 100));

      // Still no button A
      buttons = await getButtonStates(page);
      expect(buttons[0]).toBeFalse();

      // Release the script (KeyG up → cancels held script → key_up Click dispatches pointerup/mouseup/click)
      await page.keyboard.up('g');
      await new Promise((r) => setTimeout(r, 100));
    }
  );

  await releaseAll(page);

  await assert(
    'suppressed pointer/mouse events do not reach the page while script holds Click',
    async () => {
      // Start script hold first
      await page.keyboard.down('g');
      await new Promise((r) => setTimeout(r, 100));

      // Now set up listeners AFTER script's own events have already fired
      await page.evaluate(() => {
        window.__testEventsReached = [];
        window.__testHandler = (e) => {
          if (e.button === 0) {
            window.__testEventsReached.push(e.type);
          }
        };
        document.body.addEventListener('pointerdown', window.__testHandler);
        document.body.addEventListener('mousedown', window.__testHandler);
        document.body.addEventListener('pointerup', window.__testHandler);
        document.body.addEventListener('mouseup', window.__testHandler);
        document.body.addEventListener('click', window.__testHandler);
      });

      // Real mouse down + up — should be suppressed
      await page.mouse.down({ button: 'left' });
      await new Promise((r) => setTimeout(r, 50));
      await page.mouse.up({ button: 'left' });
      await new Promise((r) => setTimeout(r, 100));

      const reached = await page.evaluate(() => window.__testEventsReached);
      // None of these should have reached the page listener
      expect(reached.includes('pointerdown')).toBeFalse();
      expect(reached.includes('mousedown')).toBeFalse();
      expect(reached.includes('pointerup')).toBeFalse();
      expect(reached.includes('mouseup')).toBeFalse();
      expect(reached.includes('click')).toBeFalse();

      await page.keyboard.up('g');
      await new Promise((r) => setTimeout(r, 100));

      await page.evaluate(() => {
        document.body.removeEventListener('pointerdown', window.__testHandler);
        document.body.removeEventListener('mousedown', window.__testHandler);
        document.body.removeEventListener('pointerup', window.__testHandler);
        document.body.removeEventListener('mouseup', window.__testHandler);
        document.body.removeEventListener('click', window.__testHandler);
      });
    }
  );

  await releaseAll(page);

  console.log('  [Additive Mouse Button - real clicks]');

  // Config: Click maps to button A directly (no script)
  await sendConfigToPage(page, {
    type: 'CONFIG_CHANGED',
    name: 'test',
    gamepadConfig: {
      ...DEFAULT_CONFIG,
      keyboardConfig: {
        ...DEFAULT_CONFIG.keyboardConfig,
        Click: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
        Space: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
      },
    },
  });
  await new Promise((r) => setTimeout(r, 100));

  await assert(
    'mouse click and keyboard both mapped to same button: additive hold',
    async () => {
      // Press Space (holds button A)
      await page.keyboard.down('Space');
      await waitForButton(page, 0, true);

      // Press mouse (additive)
      await page.mouse.down({ button: 'left' });
      await new Promise((r) => setTimeout(r, 50));
      expect((await getButtonStates(page))[0]).toBeTrue();

      // Release Space — button should remain because mouse still held
      await page.keyboard.up('Space');
      await new Promise((r) => setTimeout(r, 100));
      expect((await getButtonStates(page))[0]).toBeTrue();

      // Release mouse — now button should release
      await page.mouse.up({ button: 'left' });
      await waitForButton(page, 0, false);
    }
  );

  await releaseAll(page);

  console.log('  [Keyboard Rebinds with Scripts]');

  // Rebind KeyZ → KeyG, where KeyG triggers a click script
  const tapClickScript = {
    type: 'script',
    name: 'tap-click',
    activationType: 'on_down',
    actions: [
      { type: 'key_down', keys: ['Click'] },
      { type: 'delay', durationMs: 80 },
      { type: 'key_up', keys: ['Click'] },
    ],
  };

  await sendConfigToPage(page, {
    type: 'CONFIG_CHANGED',
    name: 'test',
    gamepadConfig: {
      ...DEFAULT_CONFIG,
      keyboardConfig: {
        ...DEFAULT_CONFIG.keyboardConfig,
        KeyG: [tapClickScript],
      },
      keyboardRebinds: [{ from: 'KeyZ', to: ['KeyG'] }],
    },
  });
  await new Promise((r) => setTimeout(r, 100));

  await assert(
    'rebind KeyZ → KeyG triggers script that dispatches Click events',
    async () => {
      await page.evaluate(() => {
        window.__testMouseEvents = [];
        const handler = (e) => {
          window.__testMouseEvents.push({ type: e.type, button: e.button });
        };
        window.__testMouseHandler = handler;
        document.body.addEventListener('pointerdown', handler);
        document.body.addEventListener('mousedown', handler);
        document.body.addEventListener('pointerup', handler);
        document.body.addEventListener('mouseup', handler);
        document.body.addEventListener('click', handler);
      });

      await page.keyboard.down('z');
      await new Promise((r) => setTimeout(r, 200));

      const events = await page.evaluate(() => window.__testMouseEvents);
      const ptrDown = events.find(
        (e) => e.type === 'pointerdown' && e.button === 0
      );
      const mouseDown = events.find(
        (e) => e.type === 'mousedown' && e.button === 0
      );
      const ptrUp = events.find(
        (e) => e.type === 'pointerup' && e.button === 0
      );
      expect(ptrDown !== undefined).toBeTrue();
      expect(mouseDown !== undefined).toBeTrue();
      expect(ptrUp !== undefined).toBeTrue();

      await page.keyboard.up('z');
      await new Promise((r) => setTimeout(r, 100));

      await page.evaluate(() => {
        document.body.removeEventListener('pointerdown', window.__testMouseHandler);
        document.body.removeEventListener('mousedown', window.__testMouseHandler);
        document.body.removeEventListener('pointerup', window.__testMouseHandler);
        document.body.removeEventListener('mouseup', window.__testMouseHandler);
        document.body.removeEventListener('click', window.__testMouseHandler);
      });
    }
  );

  await releaseAll(page);

  // Rebind KeyZ → Click (rebind directly to a mouse code)
  await sendConfigToPage(page, {
    type: 'CONFIG_CHANGED',
    name: 'test',
    gamepadConfig: {
      ...DEFAULT_CONFIG,
      keyboardConfig: {
        ...DEFAULT_CONFIG.keyboardConfig,
        Click: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
      },
      keyboardRebinds: [{ from: 'KeyZ', to: ['Click'] }],
    },
  });
  await new Promise((r) => setTimeout(r, 100));

  await assert(
    'rebind KeyZ → Click triggers button A via pointerdown',
    async () => {
      await page.keyboard.down('z');
      await waitForButton(page, 0, true);
      await page.keyboard.up('z');
      await waitForButton(page, 0, false);
    }
  );

  await releaseAll(page);

  console.log('  [Keyboard Rebinds - full integration]');

  // Multiple rebinds with mixed targets
  await sendConfigToPage(page, {
    type: 'CONFIG_CHANGED',
    name: 'test',
    gamepadConfig: {
      ...DEFAULT_CONFIG,
      keyboardConfig: {
        ...DEFAULT_CONFIG.keyboardConfig,
        Click: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
        RightClick: [{ type: 'action', gamepadIndex: 0, action: 'b' }],
      },
      keyboardRebinds: [
        { from: 'KeyZ', to: ['Click'] },
        { from: 'KeyX', to: ['RightClick'] },
        { from: 'KeyC', to: ['Space'] },
      ],
    },
  });
  await new Promise((r) => setTimeout(r, 100));

  await assert('rebind KeyZ → Click triggers button A', async () => {
    await page.keyboard.down('z');
    await waitForButton(page, 0, true);
    await page.keyboard.up('z');
    await waitForButton(page, 0, false);
  });

  await assert('rebind KeyX → RightClick triggers button B', async () => {
    await page.keyboard.down('x');
    await waitForButton(page, 1, true);
    await page.keyboard.up('x');
    await waitForButton(page, 1, false);
  });

  await assert(
    'rebind KeyC → Space triggers button A (Space maps to A in DEFAULT_CONFIG)',
    async () => {
      await page.keyboard.down('c');
      await waitForButton(page, 0, true);
      await page.keyboard.up('c');
      await waitForButton(page, 0, false);
    }
  );

  await releaseAll(page);

  // Verify rebind suppresses original key
  await assert('rebound KeyZ does not pass through as KeyZ', async () => {
    await page.evaluate(() => {
      window.__testSeenCodes = [];
      window.__testKbListener = (e) => {
        window.__testSeenCodes.push(e.code);
      };
      document.addEventListener('keydown', window.__testKbListener);
    });
    await page.keyboard.down('z');
    await new Promise((r) => setTimeout(r, 100));
    const seen = await page.evaluate(() => {
      document.removeEventListener('keydown', window.__testKbListener);
      return window.__testSeenCodes;
    });
    expect(seen.includes('KeyZ')).toBe(false);
    await page.keyboard.up('z');
  });

  await releaseAll(page);

  console.log('  [Script trigger key suppression]');

  // KeyG triggers a script — the KeyG keydown/keyup should NOT reach the page
  const noopScript = {
    type: 'script',
    name: 'noop',
    activationType: 'on_down',
    actions: [{ type: 'delay', durationMs: 50 }],
  };

  await sendConfigToPage(page, {
    type: 'CONFIG_CHANGED',
    name: 'test',
    gamepadConfig: {
      ...DEFAULT_CONFIG,
      keyboardConfig: {
        ...DEFAULT_CONFIG.keyboardConfig,
        KeyG: [noopScript],
      },
    },
  });
  await new Promise((r) => setTimeout(r, 100));

  await assert(
    'key that triggers a script is suppressed (keydown does not reach page)',
    async () => {
      await page.evaluate(() => {
        window.__testSeenCodes = [];
        window.__testKbListener = (e) => {
          window.__testSeenCodes.push({ type: e.type, code: e.code });
        };
        document.addEventListener('keydown', window.__testKbListener);
        document.addEventListener('keyup', window.__testKbListener);
      });

      await page.keyboard.down('g');
      await new Promise((r) => setTimeout(r, 100));
      await page.keyboard.up('g');
      await new Promise((r) => setTimeout(r, 100));

      const events = await page.evaluate(() => {
        document.removeEventListener('keydown', window.__testKbListener);
        document.removeEventListener('keyup', window.__testKbListener);
        return window.__testSeenCodes;
      });

      const gDown = events.find((e) => e.type === 'keydown' && e.code === 'KeyG');
      const gUp = events.find((e) => e.type === 'keyup' && e.code === 'KeyG');
      expect(gDown === undefined).toBeTrue();
      expect(gUp === undefined).toBeTrue();
    }
  );

  await releaseAll(page);

  await assert(
    'mouse click that triggers a script is suppressed (pointerdown does not reach page)',
    async () => {
      // Click mapped to a script
      const clickNoopScript = {
        type: 'script',
        name: 'click-noop',
        activationType: 'on_down',
        actions: [{ type: 'delay', durationMs: 50 }],
      };

      await sendConfigToPage(page, {
        type: 'CONFIG_CHANGED',
        name: 'test',
        gamepadConfig: {
          ...DEFAULT_CONFIG,
          keyboardConfig: {
            ...DEFAULT_CONFIG.keyboardConfig,
            Click: [clickNoopScript],
          },
        },
      });
      await new Promise((r) => setTimeout(r, 100));

      await page.evaluate(() => {
        window.__testMouseReached = [];
        window.__testMouseListener = (e) => {
          if (e.button === 0) window.__testMouseReached.push(e.type);
        };
        document.body.addEventListener('pointerdown', window.__testMouseListener);
        document.body.addEventListener('mousedown', window.__testMouseListener);
        document.body.addEventListener('pointerup', window.__testMouseListener);
        document.body.addEventListener('mouseup', window.__testMouseListener);
        document.body.addEventListener('click', window.__testMouseListener);
      });

      await page.mouse.down({ button: 'left' });
      await new Promise((r) => setTimeout(r, 50));
      await page.mouse.up({ button: 'left' });
      await new Promise((r) => setTimeout(r, 100));

      const reached = await page.evaluate(() => {
        document.body.removeEventListener('pointerdown', window.__testMouseListener);
        document.body.removeEventListener('mousedown', window.__testMouseListener);
        document.body.removeEventListener('pointerup', window.__testMouseListener);
        document.body.removeEventListener('mouseup', window.__testMouseListener);
        document.body.removeEventListener('click', window.__testMouseListener);
        return window.__testMouseReached;
      });

      expect(reached.includes('pointerdown')).toBeFalse();
      expect(reached.includes('pointerup')).toBeFalse();
    }
  );

  await releaseAll(page);
};
