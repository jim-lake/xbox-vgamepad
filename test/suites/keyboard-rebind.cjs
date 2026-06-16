// Tests: keyboard rebinds intercept keys and fire rebound events
module.exports = async function ({
  page,
  assert,
  expect,
  helpers,
  releaseAll,
  DEFAULT_CONFIG,
}) {
  const { sendConfigToPage, waitForStatus, waitForButton } = helpers;

  console.log('  [Keyboard Rebinds - intercept and remap keys]');

  // Rebind KeyZ → Space (Space maps to button A / index 0 in DEFAULT_CONFIG)
  await sendConfigToPage(page, {
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: 'test',
    gamepadConfig: {
      ...DEFAULT_CONFIG,
      keyboardRebinds: [{ from: 'KeyZ', to: ['Space'] }],
    },
  });
  await waitForStatus(page, 'connected', 5000);

  await assert(
    'rebound key triggers the target action (KeyZ → Space → button A)',
    async () => {
      await page.keyboard.down('z');
      await waitForButton(page, 0, true);
      await page.keyboard.up('z');
      await waitForButton(page, 0, false);
    }
  );

  await releaseAll(page);

  // Verify original event is suppressed: KeyZ should NOT fire its own code
  await assert(
    'original KeyZ event is suppressed (no KeyZ reaches input processor)',
    async () => {
      await page.evaluate(() => {
        window.__testSeenCodes = [];
        window.__testListener = (e) => {
          window.__testSeenCodes.push(e.code);
        };
        document.addEventListener('keydown', window.__testListener);
      });
      await page.keyboard.down('z');
      await new Promise((r) => setTimeout(r, 100));
      const seen = await page.evaluate(() => {
        document.removeEventListener('keydown', window.__testListener);
        return window.__testSeenCodes;
      });
      expect(seen.includes('KeyZ')).toBe(false);
      expect(seen.includes('Space')).toBe(true);
      await page.keyboard.up('z');
    }
  );

  await releaseAll(page);

  // Test rebind to a key NOT bound to any gamepad action (pure keyboard remap)
  await sendConfigToPage(page, {
    type: 'CONFIG_CHANGED',
    name: 'test',
    gamepadConfig: {
      ...DEFAULT_CONFIG,
      keyboardRebinds: [{ from: 'KeyZ', to: ['KeyJ'] }],
    },
  });
  await new Promise((r) => setTimeout(r, 100));

  await assert(
    'rebind to non-gamepad key: synthetic KeyJ fires, KeyZ suppressed',
    async () => {
      await page.evaluate(() => {
        window.__testSeenCodes = [];
        window.__testListener = (e) => {
          window.__testSeenCodes.push(e.code);
        };
        document.addEventListener('keydown', window.__testListener);
      });
      await page.keyboard.down('z');
      await new Promise((r) => setTimeout(r, 100));
      const seen = await page.evaluate(() => {
        document.removeEventListener('keydown', window.__testListener);
        return window.__testSeenCodes;
      });
      expect(seen.includes('KeyZ')).toBe(false);
      expect(seen.includes('KeyJ')).toBe(true);
      await page.keyboard.up('z');
    }
  );

  await releaseAll(page);

  // Test multiple targets: Space → [Space, KeyU]
  // Space is bound to button A in DEFAULT_CONFIG, KeyU is not
  await sendConfigToPage(page, {
    type: 'CONFIG_CHANGED',
    name: 'test',
    gamepadConfig: {
      ...DEFAULT_CONFIG,
      keyboardRebinds: [{ from: 'Space', to: ['Space', 'KeyU'] }],
    },
  });
  await new Promise((r) => setTimeout(r, 100));

  await assert(
    'multiple targets: Space → [Space, KeyU] fires both synthetic events',
    async () => {
      // Set up a listener to capture what codes arrive
      await page.evaluate(() => {
        window.__testSeenCodes = [];
        window.__testListener = (e) => {
          window.__testSeenCodes.push(e.code);
        };
        document.addEventListener('keydown', window.__testListener);
      });
      await page.keyboard.down('Space');
      await new Promise((r) => setTimeout(r, 100));
      const seen = await page.evaluate(() => {
        document.removeEventListener('keydown', window.__testListener);
        return window.__testSeenCodes;
      });
      expect(seen.includes('Space')).toBe(true);
      expect(seen.includes('KeyU')).toBe(true);
      await page.keyboard.up('Space');
    }
  );

  await assert(
    'multiple targets: Space still triggers button A via synthetic Space',
    async () => {
      await page.keyboard.down('Space');
      await waitForButton(page, 0, true);
      await page.keyboard.up('Space');
      await waitForButton(page, 0, false);
    }
  );

  await releaseAll(page);

  // Test multiple independent rebinds
  await sendConfigToPage(page, {
    type: 'CONFIG_CHANGED',
    name: 'test',
    gamepadConfig: {
      ...DEFAULT_CONFIG,
      keyboardRebinds: [
        { from: 'KeyZ', to: ['Space'] },
        { from: 'KeyX', to: ['KeyB'] },
      ],
    },
  });
  await new Promise((r) => setTimeout(r, 100));

  await assert(
    'multiple rebinds: KeyZ → Space triggers button A',
    async () => {
      await page.keyboard.down('z');
      await waitForButton(page, 0, true);
      await page.keyboard.up('z');
      await waitForButton(page, 0, false);
    }
  );

  await assert(
    'multiple rebinds: KeyX → KeyB triggers button B',
    async () => {
      await page.keyboard.down('x');
      await waitForButton(page, 1, true);
      await page.keyboard.up('x');
      await waitForButton(page, 1, false);
    }
  );

  await releaseAll(page);

  // Test DISABLE_GAMEPAD removes rebinds
  await sendConfigToPage(page, {
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: 'test',
    gamepadConfig: {
      ...DEFAULT_CONFIG,
      keyboardRebinds: [{ from: 'KeyZ', to: ['Space'] }],
    },
  });
  await waitForStatus(page, 'connected', 5000);

  await sendConfigToPage(page, { type: 'DISABLE_GAMEPAD' });
  await waitForStatus(page, 'disconnected', 5000);

  await assert(
    'after DISABLE_GAMEPAD, rebinds are removed',
    async () => {
      await page.evaluate(() => {
        window.__testSeenCodes = [];
        window.__testListener = (e) => {
          window.__testSeenCodes.push(e.code);
        };
        document.addEventListener('keydown', window.__testListener);
      });
      await page.keyboard.down('z');
      await new Promise((r) => setTimeout(r, 100));
      const seen = await page.evaluate(() => {
        document.removeEventListener('keydown', window.__testListener);
        return window.__testSeenCodes;
      });
      // KeyZ passes through unmodified — no rebind active
      expect(seen.includes('KeyZ')).toBe(true);
      expect(seen.includes('Space')).toBe(false);
      await page.keyboard.up('z');
    }
  );
};
