// Tests: auto-suspend input when visible text input appears, resume on removal
module.exports = async function ({
  page,
  browser,
  assert,
  expect,
  helpers,
  releaseAll,
  DEFAULT_CONFIG,
}) {
  const { sendConfigToPage, waitForStatus, waitForButton } = helpers;

  async function activate() {
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'default',
      gamepadConfig: DEFAULT_CONFIG,
    });
    await waitForStatus(page, 'connected', 5000);
  }

  async function addTextInput() {
    await page.evaluate(() => {
      const input = document.createElement('input');
      input.type = 'text';
      input.id = 'test-text-input';
      document.body.appendChild(input);
    });
    await new Promise((r) => setTimeout(r, 150));
  }

  async function removeTextInput() {
    await page.evaluate(() => {
      document.getElementById('test-text-input')?.remove();
    });
    await new Promise((r) => setTimeout(r, 150));
  }

  async function addHiddenTextInput() {
    await page.evaluate(() => {
      const input = document.createElement('input');
      input.type = 'text';
      input.id = 'test-text-input';
      input.style.display = 'none';
      document.body.appendChild(input);
    });
    await new Promise((r) => setTimeout(r, 150));
  }

  async function showTextInput() {
    await page.evaluate(() => {
      const el = document.getElementById('test-text-input');
      if (el) el.style.display = '';
    });
    await new Promise((r) => setTimeout(r, 150));
  }

  async function hideTextInput() {
    await page.evaluate(() => {
      const el = document.getElementById('test-text-input');
      if (el) el.style.display = 'none';
    });
    await new Promise((r) => setTimeout(r, 150));
  }

  /** Check that keyboard input does NOT register on the gamepad. */
  async function expectInputSuspended() {
    await page.keyboard.press('Space');
    await new Promise((r) => setTimeout(r, 100));
    const btn = await page.evaluate(
      () => navigator.getGamepads()[0]?.buttons[0]?.pressed
    );
    expect(btn).toBe(false);
  }

  /** Check that keyboard input DOES register on the gamepad. */
  async function expectInputActive() {
    await page.keyboard.down('Space');
    await waitForButton(page, 0, true, 2000);
    const btn = await page.evaluate(
      () => navigator.getGamepads()[0]?.buttons[0]?.pressed
    );
    expect(btn).toBe(true);
    await page.keyboard.up('Space');
    await waitForButton(page, 0, false, 2000);
  }

  console.log('  [Text Input Auto-Suspend]');

  // ─── Enabled first: adding input suspends input but keeps gamepad connected

  await activate();

  await assert(
    'adding visible text input suspends input without disconnecting',
    async () => {
      await addTextInput();
      // Gamepad should still be connected
      expect(await helpers.getConnectionStatus(page)).toBe('connected');
      // But input should not work
      await expectInputSuspended();
    }
  );

  await assert('removing text input resumes input after suspend', async () => {
    await removeTextInput();
    expect(await helpers.getConnectionStatus(page)).toBe('connected');
    await expectInputActive();
  });

  // ─── Disabled first: adding input does NOT set auto-disable flag ──────────

  await assert(
    'adding text input while disabled does not auto-resume on removal',
    async () => {
      // Disable gamepad manually
      await sendConfigToPage(page, { type: 'DISABLE_GAMEPAD' });
      await waitForStatus(page, 'disconnected', 3000);

      // Add and remove text input while disabled
      await addTextInput();
      await new Promise((r) => setTimeout(r, 200));
      await removeTextInput();
      await new Promise((r) => setTimeout(r, 200));

      // Should still be disconnected — no auto-re-enable
      expect(await helpers.getConnectionStatus(page)).toBe('disconnected');
    }
  );

  // ─── Enabled while input already showing (hidden→visible) ─────────────────

  await activate();

  await assert('showing a hidden text input suspends input', async () => {
    await addHiddenTextInput();
    // Hidden input should not suspend
    await expectInputActive();

    await showTextInput();
    // Gamepad stays connected but input suspended
    expect(await helpers.getConnectionStatus(page)).toBe('connected');
    await expectInputSuspended();
  });

  await assert('hiding text input resumes input after suspend', async () => {
    await hideTextInput();
    expect(await helpers.getConnectionStatus(page)).toBe('connected');
    await expectInputActive();
  });

  // Cleanup
  await page.evaluate(() => {
    document.getElementById('test-text-input')?.remove();
  });

  // ─── Textarea variant ─────────────────────────────────────────────────────

  await assert('textarea also triggers input suspend', async () => {
    await activate();
    await page.evaluate(() => {
      const ta = document.createElement('textarea');
      ta.id = 'test-text-input';
      document.body.appendChild(ta);
    });
    await new Promise((r) => setTimeout(r, 150));
    expect(await helpers.getConnectionStatus(page)).toBe('connected');
    await expectInputSuspended();

    await removeTextInput();
    await expectInputActive();
  });

  // ─── contenteditable variant ──────────────────────────────────────────────

  await assert('contenteditable div triggers input suspend', async () => {
    await page.evaluate(() => {
      const div = document.createElement('div');
      div.id = 'test-text-input';
      div.setAttribute('contenteditable', 'true');
      div.style.width = '100px';
      div.style.height = '20px';
      document.body.appendChild(div);
    });
    await new Promise((r) => setTimeout(r, 150));
    expect(await helpers.getConnectionStatus(page)).toBe('connected');
    await expectInputSuspended();

    await removeTextInput();
    await expectInputActive();
  });

  // ─── Non-text inputs should NOT trigger ───────────────────────────────────

  await assert('checkbox input does not trigger suspend', async () => {
    await page.evaluate(() => {
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = 'test-text-input';
      document.body.appendChild(input);
    });
    await new Promise((r) => setTimeout(r, 200));
    await expectInputActive();
    await removeTextInput();
  });

  // ─── Popup re-enables after auto-suspend ──────────────────────────────────

  await assert('popup opened resumes input when auto-suspended', async () => {
    await addTextInput();
    await expectInputSuspended();

    // Simulate popup opened
    await sendConfigToPage(page, { type: 'POPUP_OPENED' });
    await new Promise((r) => setTimeout(r, 150));

    // Input should be resumed even though text input is still present
    await expectInputActive();

    await removeTextInput();
  });

  // ─── No disconnect/reconnect events during suspend/resume ─────────────────

  await assert(
    'suspend and resume do not fire gamepad connect/disconnect events',
    async () => {
      // Get current event counts
      const before = await page.evaluate(() => {
        const el = document.getElementById('event-log');
        return {
          connect: Number(el?.getAttribute('data-connect-count') ?? '0'),
          disconnect: Number(el?.getAttribute('data-disconnect-count') ?? '0'),
        };
      });

      await addTextInput();
      await new Promise((r) => setTimeout(r, 150));
      await removeTextInput();
      await new Promise((r) => setTimeout(r, 150));

      const after = await page.evaluate(() => {
        const el = document.getElementById('event-log');
        return {
          connect: Number(el?.getAttribute('data-connect-count') ?? '0'),
          disconnect: Number(el?.getAttribute('data-disconnect-count') ?? '0'),
        };
      });

      expect(after.connect).toBe(before.connect);
      expect(after.disconnect).toBe(before.disconnect);
    }
  );

  await releaseAll(page);
};
