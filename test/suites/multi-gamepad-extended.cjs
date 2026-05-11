// Tests: Multi-gamepad gaps
//   - One key targeting multiple gamepadIndex values simultaneously (spec §19)
//   - Physical gamepad separate mode: slot assignment, no conflict, events (spec §29-35)
//   - Physical gamepad combine mode: merging, non-virtual passthrough, event suppression (spec §36-39)
'use strict';

const { createGamepad, BTN_SOUTH, BTN_EAST, ABS_X, ABS_Y } = require('../uinput-gamepad.cjs');

module.exports = async function ({ page, assert, expect, helpers, releaseAll }) {
  if (process.platform === 'darwin') {
    console.log('  [Multi-Gamepad Extended - skipped on macOS]');
    return;
  }
  const {
    sendConfigToPage,
    getPadButtonStates,
    getPadAxesStates,
    waitForPadButton,
    waitForPadAxis,
    getEventCounts,
  } = helpers;

  await releaseAll(page);

  // ── §19: One key → multiple gamepadIndex values ───────────────────────────
  console.log('  [Multi-Gamepad Extended - one key multiple slots]');

  const multiSlotConfig = {
    mouseConfig: { mouseControls: [] },
    keyboardConfig: {
      // KeyZ maps to button A on both pad 0 and pad 1
      KeyZ: [
        { type: 'action', gamepadIndex: 0, action: 'a' },
        { type: 'action', gamepadIndex: 1, action: 'a' },
      ],
    },
  };

  await sendConfigToPage(page, {
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: 'multi-slot',
    gamepadConfig: multiSlotConfig,
  });
  await new Promise((r) => setTimeout(r, 500));

  await assert('one key activates button on both pad 0 and pad 1', async () => {
    await page.keyboard.down('z');
    await waitForPadButton(page, 0, 0, true);
    await waitForPadButton(page, 1, 0, true);
    await page.keyboard.up('z');
    await waitForPadButton(page, 0, 0, false);
    await waitForPadButton(page, 1, 0, false);
  });

  await assert('one key activates axis on both pad 0 and pad 2', async () => {
    const axisConfig = {
      mouseConfig: { mouseControls: [] },
      keyboardConfig: {
        KeyZ: [
          { type: 'action', gamepadIndex: 0, action: 'leftStickUp' },
          { type: 'action', gamepadIndex: 2, action: 'leftStickUp' },
        ],
      },
    };
    await sendConfigToPage(page, {
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: 'multi-slot-axis',
      gamepadConfig: axisConfig,
    });
    await new Promise((r) => setTimeout(r, 300));

    await page.keyboard.down('z');
    await waitForPadAxis(page, 0, 1, 'lt', -0.5);
    await waitForPadAxis(page, 2, 1, 'lt', -0.5);
    await page.keyboard.up('z');
  });

  // ── §29-35: Physical gamepad — separate mode ──────────────────────────────
  console.log('  [Multi-Gamepad Extended - separate mode]');

  // Restore a clean single-pad config at slot 0 with separate mode
  const separateConfig = {
    mouseConfig: { mouseControls: [] },
    otherGamepadMode: 'separate',
    keyboardConfig: {
      KeyZ: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
    },
  };

  await sendConfigToPage(page, {
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: 'separate',
    gamepadConfig: separateConfig,
  });
  await new Promise((r) => setTimeout(r, 300));

  let physicalPad = null;
  try {
    physicalPad = createGamepad('8BitDo Ultimate Wireless');
    // Press a button so Chromium detects the device
    physicalPad.pressButton(BTN_SOUTH);
    await new Promise((r) => setTimeout(r, 800));
    physicalPad.releaseButton(BTN_SOUTH);
    await new Promise((r) => setTimeout(r, 300));

    await assert('physical pad appears at slot 1 (not virtual slot 0)', async () => {
      // Virtual pad is at slot 0; physical must be at slot 1
      const pad0Buttons = await getPadButtonStates(page, 0);
      const pad1Buttons = await getPadButtonStates(page, 1);
      // pad-1 should have data (non-empty array from the physical pad)
      expect(pad1Buttons.length).toBeGreaterThan(0);
      // pad-0 is the virtual pad — its button 0 should be false (we released)
      expect(pad0Buttons[0]).toBeFalse();
    });

    await assert('physical pad button press visible at assigned slot 1', async () => {
      physicalPad.pressButton(BTN_SOUTH);
      await waitForPadButton(page, 1, 0, true);
      physicalPad.releaseButton(BTN_SOUTH);
      await waitForPadButton(page, 1, 0, false);
    });

    await assert('virtual pad slot 0 unaffected by physical pad input', async () => {
      physicalPad.pressButton(BTN_EAST);
      await new Promise((r) => setTimeout(r, 300));
      const pad0 = await getPadButtonStates(page, 0);
      expect(pad0[1]).toBeFalse(); // button B (index 1) on virtual pad
      physicalPad.releaseButton(BTN_EAST);
    });

    await assert('physical pad disconnect fires gamepaddisconnected', async () => {
      const before = await getEventCounts(page);
      physicalPad.destroy();
      physicalPad = null;
      await new Promise((r) => setTimeout(r, 800));
      const after = await getEventCounts(page);
      expect(after.disconnectCount).toBeGreaterThan(before.disconnectCount);
    });
  } finally {
    if (physicalPad) {
      physicalPad.destroy();
      physicalPad = null;
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  // ── §36-39: Physical gamepad — combine mode ───────────────────────────────
  console.log('  [Multi-Gamepad Extended - combine mode]');

  const combineConfig = {
    mouseConfig: { mouseControls: [] },
    otherGamepadMode: 'combine',
    keyboardConfig: {
      KeyZ: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
    },
  };

  await sendConfigToPage(page, {
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: 'combine',
    gamepadConfig: combineConfig,
  });
  await new Promise((r) => setTimeout(r, 300));

  let combinePad = null;
  try {
    combinePad = createGamepad('8BitDo Ultimate Wireless');
    combinePad.pressButton(BTN_SOUTH);
    await new Promise((r) => setTimeout(r, 800));
    combinePad.releaseButton(BTN_SOUTH);
    await new Promise((r) => setTimeout(r, 300));

    await assert('combine mode: physical button at virtual slot 0 merges with virtual pad', async () => {
      // Physical pad connects at slot 0 (same as virtual). Its button press
      // should be visible at slot 0 (merged output).
      combinePad.pressButton(BTN_SOUTH);
      await waitForPadButton(page, 0, 0, true);
      combinePad.releaseButton(BTN_SOUTH);
      await waitForPadButton(page, 0, 0, false);
    });

    await assert('combine mode: virtual key press at slot 0 still works', async () => {
      await page.keyboard.down('z');
      await waitForPadButton(page, 0, 0, true);
      await page.keyboard.up('z');
      await waitForPadButton(page, 0, 0, false);
    });

    await assert('combine mode: physical and virtual inputs OR together at slot 0', async () => {
      // Hold physical button, then press virtual key — both should show pressed
      combinePad.pressButton(BTN_EAST); // button B = index 1
      await new Promise((r) => setTimeout(r, 200));
      await page.keyboard.down('z'); // button A = index 0
      await waitForPadButton(page, 0, 0, true);
      await waitForPadButton(page, 0, 1, true);
      await page.keyboard.up('z');
      combinePad.releaseButton(BTN_EAST);
      await waitForPadButton(page, 0, 0, false);
      await waitForPadButton(page, 0, 1, false);
    });

    await assert('combine mode: physical pad at virtual slot does not appear at slot 1', async () => {
      // In combine mode the physical pad at a virtual slot is merged, not renumbered.
      // slot 1 should have no pad data.
      const raw = await page.evaluate(() =>
        document.getElementById('pad-1-buttons')?.getAttribute('data-buttons')
      );
      expect(raw === '' || raw === null).toBeTrue();
    });
  } finally {
    if (combinePad) {
      combinePad.destroy();
      await new Promise((r) => setTimeout(r, 300));
    }
  }
};
