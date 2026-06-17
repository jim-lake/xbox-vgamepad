// Tests: GameScript keyboard actions — key_down/key_up dispatch real KeyboardEvents,
// script cancellation releases held keys, synthesized keys don't trigger gamepad bindings.
module.exports = async function ({
  page,
  assert,
  expect,
  helpers,
  releaseAll,
  DEFAULT_CONFIG,
}) {
  const { sendConfigToPage, waitForStatus, waitForButton } = helpers;

  await releaseAll(page);

  console.log('  [GameScript Keyboard - key_down/key_up actions]');

  // Config: KeyG triggers a script that taps Enter (key_down, delay, key_up)
  // Enter is bound to 'start' (button 9) in DEFAULT_CONFIG
  // We want to verify the synthesized Enter does NOT trigger button 9
  const tapEnterScript = {
    type: 'script',
    name: 'tap-enter',
    activationType: 'on_down',
    actions: [
      { type: 'key_down', keys: ['Enter'] },
      { type: 'delay', durationMs: 50 },
      { type: 'key_up', keys: ['Enter'] },
    ],
  };

  await sendConfigToPage(page, {
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: 'test',
    gamepadConfig: {
      ...DEFAULT_CONFIG,
      keyboardConfig: {
        ...DEFAULT_CONFIG.keyboardConfig,
        KeyG: [tapEnterScript],
      },
    },
  });
  await waitForStatus(page, 'connected', 5000);

  await assert(
    'script key_down dispatches a KeyboardEvent on the page',
    async () => {
      // Set up listener to capture keydown events
      await page.evaluate(() => {
        window.__testKeyEvents = [];
        window.__testKeyListener = (e) => {
          window.__testKeyEvents.push({
            type: e.type,
            code: e.code,
            key: e.key,
          });
        };
        document.addEventListener('keydown', window.__testKeyListener);
        document.addEventListener('keyup', window.__testKeyListener);
      });

      await page.keyboard.down('g');
      await new Promise((r) => setTimeout(r, 150));
      await page.keyboard.up('g');

      const events = await page.evaluate(() => {
        document.removeEventListener('keydown', window.__testKeyListener);
        document.removeEventListener('keyup', window.__testKeyListener);
        return window.__testKeyEvents;
      });

      // Should have keydown and keyup for Enter from the script
      const enterDown = events.find(
        (e) => e.type === 'keydown' && e.code === 'Enter'
      );
      const enterUp = events.find(
        (e) => e.type === 'keyup' && e.code === 'Enter'
      );
      expect(enterDown !== undefined).toBeTrue();
      expect(enterUp !== undefined).toBeTrue();
      expect(enterDown.key).toBe('Enter');
    }
  );

  await releaseAll(page);

  await assert(
    'script-synthesized Enter does NOT trigger gamepad start button',
    async () => {
      // Enter is mapped to 'start' (button 9) in DEFAULT_CONFIG
      // But script-dispatched keys should be ignored by the input processor
      await page.keyboard.down('g');
      await new Promise((r) => setTimeout(r, 150));

      // Check button 9 is NOT pressed
      const buttons = await helpers.getButtonStates(page);
      expect(buttons[9]).toBeFalse();

      await page.keyboard.up('g');
    }
  );

  await releaseAll(page);

  // Test script cancellation releases held keys
  const holdKeyScript = {
    type: 'script',
    name: 'hold-key',
    activationType: 'held',
    actions: [
      { type: 'key_down', keys: ['KeyJ'] },
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
        KeyG: [holdKeyScript],
      },
    },
  });
  await new Promise((r) => setTimeout(r, 100));

  await assert(
    'held key script: keydown fires on press, keyup fires on release (cancel)',
    async () => {
      await page.evaluate(() => {
        window.__testKeyEvents = [];
        window.__testKeyListener = (e) => {
          window.__testKeyEvents.push({ type: e.type, code: e.code });
        };
        document.addEventListener('keydown', window.__testKeyListener);
        document.addEventListener('keyup', window.__testKeyListener);
      });

      // Press G to start hold script
      await page.keyboard.down('g');
      await new Promise((r) => setTimeout(r, 100));

      // Release G to cancel held script — should dispatch keyup for KeyJ
      await page.keyboard.up('g');
      await new Promise((r) => setTimeout(r, 100));

      const events = await page.evaluate(() => {
        document.removeEventListener('keydown', window.__testKeyListener);
        document.removeEventListener('keyup', window.__testKeyListener);
        return window.__testKeyEvents;
      });

      const jDown = events.find(
        (e) => e.type === 'keydown' && e.code === 'KeyJ'
      );
      const jUp = events.find((e) => e.type === 'keyup' && e.code === 'KeyJ');
      expect(jDown !== undefined).toBeTrue();
      expect(jUp !== undefined).toBeTrue();
    }
  );

  await releaseAll(page);

  // Test mixing gamepad and keyboard actions in one script
  const comboScript = {
    type: 'script',
    name: 'combo',
    activationType: 'on_down',
    actions: [
      {
        type: 'down',
        buttons: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
      },
      { type: 'delay', durationMs: 50 },
      { type: 'key_down', keys: ['KeyJ'] },
      { type: 'delay', durationMs: 50 },
      { type: 'key_up', keys: ['KeyJ'] },
      {
        type: 'up',
        buttons: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
      },
    ],
  };

  await sendConfigToPage(page, {
    type: 'CONFIG_CHANGED',
    name: 'test',
    gamepadConfig: {
      ...DEFAULT_CONFIG,
      keyboardConfig: { ...DEFAULT_CONFIG.keyboardConfig, KeyG: [comboScript] },
    },
  });
  await new Promise((r) => setTimeout(r, 100));

  await assert(
    'combo script: gamepad button A pressed AND KeyJ event fires',
    async () => {
      await page.evaluate(() => {
        window.__testKeyEvents = [];
        window.__testKeyListener = (e) => {
          window.__testKeyEvents.push({ type: e.type, code: e.code });
        };
        document.addEventListener('keydown', window.__testKeyListener);
        document.addEventListener('keyup', window.__testKeyListener);
      });

      await page.keyboard.down('g');
      // Button A should fire
      await waitForButton(page, 0, true);
      await new Promise((r) => setTimeout(r, 200));

      const events = await page.evaluate(() => {
        document.removeEventListener('keydown', window.__testKeyListener);
        document.removeEventListener('keyup', window.__testKeyListener);
        return window.__testKeyEvents;
      });

      const jDown = events.find(
        (e) => e.type === 'keydown' && e.code === 'KeyJ'
      );
      expect(jDown !== undefined).toBeTrue();

      await page.keyboard.up('g');
      await new Promise((r) => setTimeout(r, 100));
    }
  );

  await releaseAll(page);
};
