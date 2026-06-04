// Tests: GameScript hold (delay "infinite") — button stays pressed until cancel
module.exports = async function ({
  page,
  assert,
  expect,
  helpers,
  releaseAll,
}) {
  const { getButtonStates, waitForButton, sendConfigToPage } = helpers;

  await releaseAll(page);

  function scriptConfig(keyCode, script) {
    return {
      mouseConfig: { mouseControls: [] },
      keyboardConfig: { [keyCode]: [script] },
    };
  }

  function holdScript(actions, activationType) {
    return { type: 'script', name: 'hold-test', activationType, actions };
  }

  console.log('  [GameScript Hold - basic held activation]');

  await assert(
    'hold: button stays pressed until key up (held activation)',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'hold-test',
        gamepadConfig: scriptConfig(
          'KeyH',
          holdScript(
            [
              {
                type: 'down',
                buttons: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
              },
              { type: 'delay', durationMs: 'infinite' },
            ],
            'held'
          )
        ),
      });
      await new Promise((r) => setTimeout(r, 200));

      await page.keyboard.down('h');
      await waitForButton(page, 0, true);

      // Button stays pressed
      await new Promise((r) => setTimeout(r, 100));
      expect((await getButtonStates(page))[0]).toBeTrue();

      // Key up cancels — button released
      await page.keyboard.up('h');
      await waitForButton(page, 0, false);
    }
  );

  console.log('  [GameScript Hold - work before suspend]');

  await assert(
    'hold: actions execute before infinite delay holds',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'hold-test',
        gamepadConfig: scriptConfig(
          'KeyH',
          holdScript(
            [
              {
                type: 'down',
                buttons: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
              },
              { type: 'delay', durationMs: 50 },
              {
                type: 'down',
                buttons: [{ type: 'action', gamepadIndex: 0, action: 'b' }],
              },
              { type: 'delay', durationMs: 'infinite' },
            ],
            'held'
          )
        ),
      });
      await new Promise((r) => setTimeout(r, 200));

      await page.keyboard.down('h');
      // After 50ms both A and B should be pressed
      await waitForButton(page, 0, true); // A
      await waitForButton(page, 1, true); // B

      await page.keyboard.up('h');
      await waitForButton(page, 0, false);
      await waitForButton(page, 1, false);
    }
  );

  console.log('  [GameScript Hold - mixed matched/unmatched]');

  await assert(
    'hold: matched down/up executes normally, unmatched stays held',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'hold-test',
        gamepadConfig: scriptConfig(
          'KeyH',
          holdScript(
            [
              {
                type: 'down',
                buttons: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
              },
              { type: 'delay', durationMs: 50 },
              {
                type: 'up',
                buttons: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
              },
              {
                type: 'down',
                buttons: [{ type: 'action', gamepadIndex: 0, action: 'b' }],
              },
              { type: 'delay', durationMs: 'infinite' },
            ],
            'held'
          )
        ),
      });
      await new Promise((r) => setTimeout(r, 200));

      await page.keyboard.down('h');
      // A presses then releases, B stays held
      await waitForButton(page, 1, true); // B
      // A should have been released by the script
      await new Promise((r) => setTimeout(r, 100));
      expect((await getButtonStates(page))[0]).toBeFalse(); // A released
      expect((await getButtonStates(page))[1]).toBeTrue(); // B still held

      await page.keyboard.up('h');
      await waitForButton(page, 1, false);
    }
  );

  console.log('  [GameScript Hold - toggle activation]');

  await assert(
    'hold with toggle: first press holds, second press releases',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'hold-test',
        gamepadConfig: scriptConfig(
          'KeyH',
          holdScript(
            [
              {
                type: 'down',
                buttons: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
              },
              { type: 'delay', durationMs: 'infinite' },
            ],
            'toggle'
          )
        ),
      });
      await new Promise((r) => setTimeout(r, 200));

      // First press → A held
      await page.keyboard.down('h');
      await page.keyboard.up('h');
      await waitForButton(page, 0, true);

      await new Promise((r) => setTimeout(r, 100));
      expect((await getButtonStates(page))[0]).toBeTrue();

      // Second press → cancel → A released
      await page.keyboard.down('h');
      await page.keyboard.up('h');
      await waitForButton(page, 0, false);
    }
  );

  console.log('  [GameScript Hold - on_down restart]');

  await assert('hold with on_down: key down cancels and restarts', async () => {
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'hold-test',
      gamepadConfig: scriptConfig(
        'KeyH',
        holdScript(
          [
            {
              type: 'down',
              buttons: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
            },
            { type: 'delay', durationMs: 'infinite' },
          ],
          'on_down'
        )
      ),
    });
    await new Promise((r) => setTimeout(r, 200));

    // First key down → A pressed
    await page.keyboard.down('h');
    await waitForButton(page, 0, true);
    await page.keyboard.up('h');

    // A still held (delay infinite)
    await new Promise((r) => setTimeout(r, 50));
    expect((await getButtonStates(page))[0]).toBeTrue();

    // Second key down → cancel + restart → A still pressed
    await page.keyboard.down('h');
    await new Promise((r) => setTimeout(r, 50));
    expect((await getButtonStates(page))[0]).toBeTrue();
    await page.keyboard.up('h');
  });

  console.log('  [GameScript Hold - immediate cancel]');

  await assert(
    'hold: immediate key up releases buttons (delay infinite never blocks cancel)',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'hold-test',
        gamepadConfig: scriptConfig(
          'KeyH',
          holdScript(
            [
              {
                type: 'down',
                buttons: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
              },
              { type: 'delay', durationMs: 'infinite' },
            ],
            'held'
          )
        ),
      });
      await new Promise((r) => setTimeout(r, 200));

      await page.keyboard.down('h');
      await waitForButton(page, 0, true);
      await page.keyboard.up('h');
      await waitForButton(page, 0, false);
    }
  );

  console.log('  [GameScript Hold - multiple buttons]');

  await assert(
    'hold: multiple buttons in single down all stay pressed',
    async () => {
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'hold-test',
        gamepadConfig: scriptConfig(
          'KeyH',
          holdScript(
            [
              {
                type: 'down',
                buttons: [
                  { type: 'action', gamepadIndex: 0, action: 'a' },
                  { type: 'action', gamepadIndex: 0, action: 'b' },
                  { type: 'action', gamepadIndex: 0, action: 'x' },
                ],
              },
              { type: 'delay', durationMs: 'infinite' },
            ],
            'held'
          )
        ),
      });
      await new Promise((r) => setTimeout(r, 200));

      await page.keyboard.down('h');
      await waitForButton(page, 0, true); // A
      await waitForButton(page, 1, true); // B
      await waitForButton(page, 2, true); // X

      await page.keyboard.up('h');
      await waitForButton(page, 0, false);
      await waitForButton(page, 1, false);
      await waitForButton(page, 2, false);
    }
  );

  console.log('  [GameScript Hold - non-zero gamepad index]');

  await assert('hold: works on non-zero gamepad index', async () => {
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'hold-test',
      gamepadConfig: scriptConfig(
        'KeyH',
        holdScript(
          [
            {
              type: 'down',
              buttons: [{ type: 'action', gamepadIndex: 1, action: 'a' }],
            },
            { type: 'delay', durationMs: 'infinite' },
          ],
          'held'
        )
      ),
    });
    await new Promise((r) => setTimeout(r, 200));

    await page.keyboard.down('h');
    // Button 0 on gamepad index 1 should be pressed
    // We can verify by checking the gamepad at index 1
    await page.waitForFunction(
      () => {
        const gp = navigator.getGamepads()[1];
        return gp?.buttons[0]?.pressed === true;
      },
      { timeout: 3000 }
    );

    await page.keyboard.up('h');
    await page.waitForFunction(
      () => {
        const gp = navigator.getGamepads()[1];
        return !gp || gp.buttons[0]?.pressed === false;
      },
      { timeout: 3000 }
    );
  });
};
