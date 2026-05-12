import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  exportPopupConfig,
  parseImportedConfig,
} from '../../src/popup/config.ts';
import type {
  GamepadConfig,
  GameScript,
  ScriptAction,
} from '../../src/types/gamepad.ts';
import type { PopupConfig } from '../../src/types/popup.ts';

function roundTrip(cfg: GamepadConfig): GamepadConfig {
  const popup = parseImportedConfig(cfg) as PopupConfig;
  return JSON.parse(exportPopupConfig(popup)) as GamepadConfig;
}

function makeScript(slot: 0 | 1 | 2 | 3): GameScript {
  return {
    type: 'script',
    name: 'combo',
    activationType: 'on_down',
    actions: [
      {
        type: 'down',
        buttons: [{ type: 'action', gamepadIndex: slot, action: 'a' }],
      },
      { type: 'delay', durationMs: 100 },
      {
        type: 'up',
        buttons: [{ type: 'action', gamepadIndex: slot, action: 'a' }],
      },
    ],
  };
}

function downSlot(script: GameScript): number | undefined {
  const down = script.actions.find(
    (a): a is Extract<ScriptAction, { type: 'down' }> => a.type === 'down'
  );
  return down?.buttons[0]?.gamepadIndex;
}

void test('round-trip: simple action bindings preserve keyboardConfig', () => {
  const cfg: GamepadConfig = {
    keyboardConfig: {
      Space: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
      KeyB: [{ type: 'action', gamepadIndex: 1, action: 'b' }],
    },
    mouseConfig: { mouseControls: [] },
  };
  const result = roundTrip(cfg);
  assert.deepEqual(result.keyboardConfig['Space'], cfg.keyboardConfig['Space']);
  assert.deepEqual(result.keyboardConfig['KeyB'], cfg.keyboardConfig['KeyB']);
});

void test('round-trip: same script bound on gamepad 0 and gamepad 1 round-trips correctly', () => {
  const cfg: GamepadConfig = {
    keyboardConfig: { KeyQ: [makeScript(0)], KeyW: [makeScript(1)] },
    mouseConfig: { mouseControls: [] },
  };
  const result = roundTrip(cfg);

  const q = result.keyboardConfig['KeyQ']?.[0];
  const w = result.keyboardConfig['KeyW']?.[0];
  assert.equal(q?.type, 'script', 'KeyQ must be a script');
  assert.equal(w?.type, 'script', 'KeyW must be a script');
  assert.equal(downSlot(q), 0, 'KeyQ script must target gamepad 0');
  assert.equal(downSlot(w), 1, 'KeyW script must target gamepad 1');
});

void test('round-trip: same script bound on three different gamepads preserves all slots', () => {
  const cfg: GamepadConfig = {
    keyboardConfig: {
      KeyA: [makeScript(0)],
      KeyB: [makeScript(1)],
      KeyC: [makeScript(2)],
    },
    mouseConfig: { mouseControls: [] },
  };
  const result = roundTrip(cfg);

  for (const [key, expectedSlot] of [
    ['KeyA', 0],
    ['KeyB', 1],
    ['KeyC', 2],
  ] as [string, number][]) {
    const action = result.keyboardConfig[key]?.[0];
    assert.equal(action?.type, 'script', `${key} must be a script`);
    assert.equal(
      downSlot(action),
      expectedSlot,
      `${key} script must target gamepad ${String(expectedSlot)}`
    );
  }
});

void test('round-trip: mouse config is preserved', () => {
  const cfg: GamepadConfig = {
    keyboardConfig: {},
    mouseConfig: {
      mouseControls: [
        { stick: 'right', gamepadIndex: 0, sensitivity: 120 },
        { stick: 'left', gamepadIndex: 2, sensitivity: 80 },
      ],
    },
  };
  const result = roundTrip(cfg);
  assert.deepEqual(
    result.mouseConfig.mouseControls,
    cfg.mouseConfig.mouseControls
  );
});

void test('round-trip: otherGamepadMode is preserved', () => {
  const cfg: GamepadConfig = {
    keyboardConfig: {},
    mouseConfig: { mouseControls: [] },
    otherGamepadMode: 'combine',
  };
  const result = roundTrip(cfg);
  assert.equal(result.otherGamepadMode, 'combine');
});

void test('parseImportedConfig: returns null for invalid config', () => {
  assert.equal(parseImportedConfig(null), null);
  assert.equal(
    parseImportedConfig({
      keyboardConfig: { Escape: [] },
      mouseConfig: { mouseControls: [] },
    }),
    null
  );
  assert.equal(parseImportedConfig({ keyboardConfig: {} }), null);
});

void test('exportPopupConfig: produces valid JSON that parses back', () => {
  const cfg: GamepadConfig = {
    keyboardConfig: {
      Space: [{ type: 'action', gamepadIndex: 0, action: 'start' }],
    },
    mouseConfig: {
      mouseControls: [{ stick: 'right', gamepadIndex: 0, sensitivity: 101 }],
    },
  };
  const popup = parseImportedConfig(cfg) as PopupConfig;
  const back = JSON.parse(exportPopupConfig(popup)) as GamepadConfig;
  assert.deepEqual(back.keyboardConfig['Space'], cfg.keyboardConfig['Space']);
});
