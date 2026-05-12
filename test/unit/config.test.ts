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
import type {
  PopupConfig,
  PopupScript,
  ScriptBinding,
} from '../../src/types/popup.ts';
import { copyScriptForSlot } from '../../src/popup/script-helpers.ts';

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

// ── PopupConfig → GamepadConfig → PopupConfig round-trips ──────────────────

function makePopupScript(id: string): PopupScript {
  return {
    scriptId: id,
    script: {
      type: 'script',
      name: 'combo',
      activationType: 'on_down',
      actions: [
        {
          type: 'down',
          buttons: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
        },
        { type: 'delay', durationMs: 100 },
        {
          type: 'up',
          buttons: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
        },
      ],
    },
  };
}

function emptySlotBindings(): PopupConfig['slots'][0]['bindings'] {
  return Object.fromEntries(
    [
      'a',
      'b',
      'x',
      'y',
      'leftShoulder',
      'rightShoulder',
      'leftTrigger',
      'rightTrigger',
      'select',
      'start',
      'leftStickPressed',
      'rightStickPressed',
      'dpadUp',
      'dpadDown',
      'dpadLeft',
      'dpadRight',
      'home',
      'leftStickUp',
      'leftStickDown',
      'leftStickLeft',
      'leftStickRight',
      'rightStickUp',
      'rightStickDown',
      'rightStickLeft',
      'rightStickRight',
      'toggleGamepad',
      'toggleAllGamepads',
      'toggleExtension',
    ].map((a) => [a, []])
  ) as unknown as PopupConfig['slots'][0]['bindings'];
}

function makePopupConfig(
  scriptBindingsBySlot: [string[], string[], string[], string[]]
): PopupConfig {
  const ps = makePopupScript('script_0');
  return {
    scripts: [ps],
    globalBindings: emptySlotBindings(),
    otherGamepadMode: 'separate',
    slots: [0, 1, 2, 3].map((i) => {
      const keyCodes = scriptBindingsBySlot[i as 0 | 1 | 2 | 3];
      return {
        gamepadIndex: i as 0 | 1 | 2 | 3,
        active: keyCodes.length > 0,
        bindings: emptySlotBindings(),
        mouse: { stick: undefined, sensitivity: 101 },
        scriptBindings: [{ scriptId: 'script_0', keyCodes }],
      };
    }) as PopupConfig['slots'],
  };
}

function popupRoundTrip(popup: PopupConfig): PopupConfig {
  const gameConfig = JSON.parse(exportPopupConfig(popup)) as GamepadConfig;
  return parseImportedConfig(gameConfig) as PopupConfig;
}

void test('popup→game→popup: script on two gamepads preserves both slot bindings', () => {
  // Script bound on slot 0 (KeyQ) and slot 1 (KeyW)
  const popup = makePopupConfig([['KeyQ'], ['KeyW'], [], []]);
  const result = popupRoundTrip(popup);

  const s0 = result.slots[0].scriptBindings.find(
    (b: ScriptBinding) => b.keyCodes.length > 0
  );
  const s1 = result.slots[1].scriptBindings.find(
    (b: ScriptBinding) => b.keyCodes.length > 0
  );
  assert.ok(s0, 'slot 0 should have a script binding');
  assert.ok(s1, 'slot 1 should have a script binding');
  assert.deepEqual(s0.keyCodes, ['KeyQ'], 'slot 0 key code preserved');
  assert.deepEqual(s1.keyCodes, ['KeyW'], 'slot 1 key code preserved');
});

void test('popup→game→popup: script on three gamepads preserves all slot bindings', () => {
  const popup = makePopupConfig([['KeyA'], ['KeyB'], ['KeyC'], []]);
  const result = popupRoundTrip(popup);

  for (const [slot, expectedKey] of [
    [result.slots[0], 'KeyA'],
    [result.slots[1], 'KeyB'],
    [result.slots[2], 'KeyC'],
  ] as [PopupConfig['slots'][0], string][]) {
    const binding = slot.scriptBindings.find(
      (b: ScriptBinding) => b.keyCodes.length > 0
    );
    assert.ok(
      binding,
      `slot ${String(slot.gamepadIndex)} should have a script binding`
    );
    assert.deepEqual(
      binding.keyCodes,
      [expectedKey],
      `slot ${String(slot.gamepadIndex)} key code preserved`
    );
  }
  assert.equal(
    result.slots[3].scriptBindings.every(
      (b: ScriptBinding) => b.keyCodes.length === 0
    ),
    true,
    'slot 3 should have no script bindings'
  );
});

void test('popup→game→popup: script on all four gamepads round-trips correctly', () => {
  const popup = makePopupConfig([['KeyA'], ['KeyB'], ['KeyC'], ['KeyD']]);
  const result = popupRoundTrip(popup);

  for (const [slot, expectedKey] of [
    [result.slots[0], 'KeyA'],
    [result.slots[1], 'KeyB'],
    [result.slots[2], 'KeyC'],
    [result.slots[3], 'KeyD'],
  ] as [PopupConfig['slots'][0], string][]) {
    const binding = slot.scriptBindings.find(
      (b: ScriptBinding) => b.keyCodes.length > 0
    );
    assert.ok(
      binding,
      `slot ${String(slot.gamepadIndex)} should have a script binding`
    );
    assert.deepEqual(binding.keyCodes, [expectedKey]);
  }
});

void test('popup→game→popup: script normalized to slot 0 in scripts array', () => {
  const popup = makePopupConfig([['KeyQ'], ['KeyW'], [], []]);
  const result = popupRoundTrip(popup);

  assert.equal(
    result.scripts.length,
    1,
    'should have exactly one script entry'
  );
  const first = result.scripts[0];
  assert.ok(first, 'scripts[0] must exist');
  const normalized = copyScriptForSlot(first.script, 0);
  assert.deepEqual(
    first.script,
    normalized,
    'stored script must be normalized to slot 0'
  );
});

void test('popup→game→popup: slot active flags reflect script bindings', () => {
  const popup = makePopupConfig([['KeyQ'], ['KeyW'], [], []]);
  const result = popupRoundTrip(popup);

  assert.equal(result.slots[0].active, true, 'slot 0 active');
  assert.equal(result.slots[1].active, true, 'slot 1 active');
  assert.equal(result.slots[2].active, false, 'slot 2 inactive');
  assert.equal(result.slots[3].active, false, 'slot 3 inactive');
});
