import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  exportPopupConfig,
  parseImportedConfig,
} from '../../src/popup/config.ts';
import { copyScriptForSlot } from '../../src/popup/script-helpers.ts';
import type { GamepadConfig, GameScript } from '../../src/types/gamepad.ts';
import type { PopupConfig, ScriptBinding } from '../../src/types/popup.ts';

const BASE_SCRIPT: GameScript = {
  type: 'script',
  name: 'combo',
  activationType: 'on_down',
  actions: [
    {
      type: 'down',
      buttons: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
    },
    { type: 'delay', durationMs: 100 },
    { type: 'up', buttons: [{ type: 'action', gamepadIndex: 0, action: 'a' }] },
  ],
};

/** Simulate what popupConfigToGamepadConfig produces for a script on two slots. */
function makeGameConfig(slot0Key: string, slot1Key: string): GamepadConfig {
  return {
    keyboardConfig: {
      [slot0Key]: [copyScriptForSlot(BASE_SCRIPT, 0)],
      [slot1Key]: [copyScriptForSlot(BASE_SCRIPT, 1)],
    },
    mouseConfig: { mouseControls: [] },
  };
}

function slotKeyCodes(popup: PopupConfig, slotIndex: 0 | 1 | 2 | 3): string[] {
  return popup.slots[slotIndex].scriptBindings.flatMap(
    (b: ScriptBinding) => b.keyCodes
  );
}

// ── Regression: same script on two gamepads, reload loses slot 0 binding ──

void test('reload: script on slot 0 (KeyQ) and slot 1 (KeyW) — slot 0 key preserved', () => {
  const popup = parseImportedConfig(
    makeGameConfig('KeyQ', 'KeyW')
  ) as PopupConfig;
  assert.deepEqual(slotKeyCodes(popup, 0), ['KeyQ']);
});

void test('reload: script on slot 0 (KeyQ) and slot 1 (KeyW) — slot 1 key preserved', () => {
  const popup = parseImportedConfig(
    makeGameConfig('KeyQ', 'KeyW')
  ) as PopupConfig;
  assert.deepEqual(slotKeyCodes(popup, 1), ['KeyW']);
});

void test('reload: script on slot 0 and slot 1 — only one script entry in scripts[]', () => {
  const popup = parseImportedConfig(
    makeGameConfig('KeyQ', 'KeyW')
  ) as PopupConfig;
  assert.equal(popup.scripts.length, 1);
});

void test('reload: full round-trip preserves both slot bindings', () => {
  const original = makeGameConfig('KeyQ', 'KeyW');
  const popup = parseImportedConfig(original) as PopupConfig;
  const back = JSON.parse(exportPopupConfig(popup)) as GamepadConfig;
  assert.deepEqual(
    back.keyboardConfig['KeyQ']?.[0],
    original.keyboardConfig['KeyQ']?.[0]
  );
  assert.deepEqual(
    back.keyboardConfig['KeyW']?.[0],
    original.keyboardConfig['KeyW']?.[0]
  );
});

// ── Simulate UI workflow: add script on slot 0, bind KeyQ, add slot 1, bind KeyW ──

/**
 * Simulate the UI state after:
 * 1. Script added on slot 0 with KeyQ bound
 * 2. Slot 1 activated
 * 3. KeyW bound to same script on slot 1
 * 4. Auto-saved → reloaded
 */
void test('ui workflow: add script on slot 0 (KeyQ), activate slot 1, bind KeyW — reload preserves both', () => {
  const scriptId = 'script_0';

  // After step 1+3: PopupConfig in memory
  const popup: PopupConfig = {
    scripts: [{ scriptId, script: BASE_SCRIPT }],
    globalBindings: {} as PopupConfig['globalBindings'],
    otherGamepadMode: 'separate',
    slots: [
      {
        gamepadIndex: 0,
        active: true,
        bindings: {} as PopupConfig['slots'][0]['bindings'],
        mouse: { stick: undefined, sensitivity: 101 },
        scriptBindings: [{ scriptId, keyCodes: ['KeyQ'] }],
      },
      {
        gamepadIndex: 1,
        active: true,
        bindings: {} as PopupConfig['slots'][0]['bindings'],
        mouse: { stick: undefined, sensitivity: 101 },
        scriptBindings: [{ scriptId, keyCodes: ['KeyW'] }],
      },
      {
        gamepadIndex: 2,
        active: false,
        bindings: {} as PopupConfig['slots'][0]['bindings'],
        mouse: { stick: undefined, sensitivity: 101 },
        scriptBindings: [{ scriptId, keyCodes: [] }],
      },
      {
        gamepadIndex: 3,
        active: false,
        bindings: {} as PopupConfig['slots'][0]['bindings'],
        mouse: { stick: undefined, sensitivity: 101 },
        scriptBindings: [{ scriptId, keyCodes: [] }],
      },
    ],
  };

  // Save → reload
  const saved = JSON.parse(exportPopupConfig(popup)) as GamepadConfig;
  const reloaded = parseImportedConfig(saved) as PopupConfig;

  assert.deepEqual(
    slotKeyCodes(reloaded, 0),
    ['KeyQ'],
    'slot 0 key after reload'
  );
  assert.deepEqual(
    slotKeyCodes(reloaded, 1),
    ['KeyW'],
    'slot 1 key after reload'
  );
  assert.equal(reloaded.scripts.length, 1, 'one script entry after reload');
});

/**
 * Regression: slots[0].gamepadIndex changed to 1 via handleChangeSlotIndex,
 * then slots[1] also has gamepadIndex 1 — both keys end up on gamepad 1 after reload.
 *
 * This simulates: user has slot 0 targeting gamepad 0 with KeyQ, changes it to
 * target gamepad 1, then slot 1 (also gamepadIndex 1) has KeyW.
 * popupConfigToGamepadConfig emits both as gamepadIndex 1 → reload puts both on slot 1.
 */
void test('regression: two slots with same gamepadIndex both emit to that gamepad', () => {
  const scriptId = 'script_0';

  // slots[0].gamepadIndex was changed from 0 to 1 via handleChangeSlotIndex
  const popup: PopupConfig = {
    scripts: [{ scriptId, script: BASE_SCRIPT }],
    globalBindings: {} as PopupConfig['globalBindings'],
    otherGamepadMode: 'separate',
    slots: [
      {
        gamepadIndex: 1, // ← changed from 0 to 1
        active: true,
        bindings: {} as PopupConfig['slots'][0]['bindings'],
        mouse: { stick: undefined, sensitivity: 101 },
        scriptBindings: [{ scriptId, keyCodes: ['KeyQ'] }],
      },
      {
        gamepadIndex: 1, // ← also 1 — duplicate!
        active: true,
        bindings: {} as PopupConfig['slots'][0]['bindings'],
        mouse: { stick: undefined, sensitivity: 101 },
        scriptBindings: [{ scriptId, keyCodes: ['KeyW'] }],
      },
      {
        gamepadIndex: 2,
        active: false,
        bindings: {} as PopupConfig['slots'][0]['bindings'],
        mouse: { stick: undefined, sensitivity: 101 },
        scriptBindings: [],
      },
      {
        gamepadIndex: 3,
        active: false,
        bindings: {} as PopupConfig['slots'][0]['bindings'],
        mouse: { stick: undefined, sensitivity: 101 },
        scriptBindings: [],
      },
    ],
  };

  const saved = JSON.parse(exportPopupConfig(popup)) as GamepadConfig;
  const reloaded = parseImportedConfig(saved) as PopupConfig;

  // Both keys targeted gamepad 1 — after reload both end up on slot 1
  // This documents the current (broken) behavior caused by duplicate gamepadIndex
  const slot1Keys = slotKeyCodes(reloaded, 1);
  assert.ok(
    slot1Keys.includes('KeyQ'),
    'KeyQ on slot 1 (both collapsed to gamepad 1)'
  );
  assert.ok(
    slot1Keys.includes('KeyW'),
    'KeyW on slot 1 (both collapsed to gamepad 1)'
  );
  assert.deepEqual(
    slotKeyCodes(reloaded, 0),
    [],
    'slot 0 has no keys (gamepadIndex 0 was vacated)'
  );
});
