import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  exportPopupConfig,
  parseImportedConfig,
} from '../../src/popup/config.ts';
import {
  copyScriptForSlot,
  flattenActions,
  liftActions,
} from '../../src/popup/script-helpers.ts';
import type {
  GamepadConfig,
  GameScript,
  ScriptAction,
} from '../../src/types/gamepad.ts';
import type { PopupConfig, PopupScriptAction } from '../../src/types/popup.ts';

function roundTrip(cfg: GamepadConfig): GamepadConfig {
  const popup = parseImportedConfig(cfg) as PopupConfig;
  return JSON.parse(exportPopupConfig(popup)) as GamepadConfig;
}

// ── point flatten/lift roundtrip ──

void test('point: flattenActions passes through unchanged', () => {
  const actions: PopupScriptAction[] = [
    { type: 'point', gamepadIndex: 0, stick: 'left', x: 0.5, y: -0.7 },
  ];
  const flat = flattenActions(actions);
  assert.deepEqual(flat, [
    { type: 'point', gamepadIndex: 0, stick: 'left', x: 0.5, y: -0.7 },
  ]);
});

void test('point: liftActions passes through unchanged', () => {
  const actions: ScriptAction[] = [
    { type: 'point', gamepadIndex: 0, stick: 'right', x: -1, y: 1 },
  ];
  const lifted = liftActions(actions);
  assert.deepEqual(lifted, [
    { type: 'point', gamepadIndex: 0, stick: 'right', x: -1, y: 1 },
  ]);
});

// ── rotate flatten/lift roundtrip ──

void test('rotate: flattenActions passes through unchanged', () => {
  const actions: PopupScriptAction[] = [
    {
      type: 'rotate',
      gamepadIndex: 0,
      stick: 'left',
      startX: 0,
      startY: 1,
      endX: 0,
      endY: 1,
      directions: 8,
      rotateMs: 500,
      clockwise: true,
    },
  ];
  const flat = flattenActions(actions);
  assert.deepEqual(flat, actions);
});

void test('rotate: liftActions passes through unchanged', () => {
  const actions: ScriptAction[] = [
    {
      type: 'rotate',
      gamepadIndex: 1,
      stick: 'right',
      startX: 1,
      startY: 0,
      endX: -1,
      endY: 0,
      directions: 4,
      rotateMs: 1000,
      clockwise: false,
    },
  ];
  const lifted = liftActions(actions);
  assert.deepEqual(lifted, actions);
});

// ── remapActions via copyScriptForSlot ──

void test('copyScriptForSlot remaps gamepadIndex on point actions', () => {
  const script: GameScript = {
    type: 'script',
    name: 'test',
    activationType: 'on_down',
    actions: [
      { type: 'point', gamepadIndex: 0, stick: 'left', x: 0.5, y: 0.5 },
    ],
  };
  const remapped = copyScriptForSlot(script, 2);
  const action = remapped.actions[0];
  assert.equal(action?.type, 'point');
  assert.equal(action.gamepadIndex, 2);
  assert.equal(action.x, 0.5);
});

void test('copyScriptForSlot remaps gamepadIndex on rotate actions', () => {
  const script: GameScript = {
    type: 'script',
    name: 'test',
    activationType: 'on_down',
    actions: [
      {
        type: 'rotate',
        gamepadIndex: 0,
        stick: 'right',
        startX: 0,
        startY: 1,
        endX: 0,
        endY: 1,
        directions: 'infinite',
        rotateMs: 300,
        clockwise: true,
      },
    ],
  };
  const remapped = copyScriptForSlot(script, 3);
  const action = remapped.actions[0];
  assert.equal(action?.type, 'rotate');
  assert.equal(action.gamepadIndex, 3);
  assert.equal(action.rotateMs, 300);
});

// ── config round-trip with point and rotate ──

void test('round-trip: config with point action survives round-trip', () => {
  const cfg: GamepadConfig = {
    keyboardConfig: {
      KeyP: [
        {
          type: 'script',
          name: 'point-test',
          activationType: 'on_down',
          actions: [
            { type: 'point', gamepadIndex: 0, stick: 'left', x: 1, y: -0.5 },
            { type: 'delay', durationMs: 200 },
          ],
        },
      ],
    },
    mouseConfig: { mouseControls: [] },
  };
  const result = roundTrip(cfg);
  const entries = result.keyboardConfig['KeyP'];
  assert.ok(entries);
  const script = entries[0] as GameScript;
  assert.equal(script.type, 'script');
  const action = script.actions[0];
  assert.deepEqual(action, {
    type: 'point',
    gamepadIndex: 0,
    stick: 'left',
    x: 1,
    y: -0.5,
  });
});

void test('round-trip: config with rotate action survives round-trip', () => {
  const cfg: GamepadConfig = {
    keyboardConfig: {
      KeyR: [
        {
          type: 'script',
          name: 'rotate-test',
          activationType: 'on_down',
          actions: [
            {
              type: 'rotate',
              gamepadIndex: 0,
              stick: 'left',
              startX: 0,
              startY: 1,
              endX: 0,
              endY: 1,
              directions: 8,
              rotateMs: 500,
              clockwise: true,
            },
            { type: 'delay', durationMs: 600 },
          ],
        },
      ],
    },
    mouseConfig: { mouseControls: [] },
  };
  const result = roundTrip(cfg);
  const entries = result.keyboardConfig['KeyR'];
  assert.ok(entries);
  const script = entries[0] as GameScript;
  assert.equal(script.type, 'script');
  const action = script.actions[0];
  assert.deepEqual(action, {
    type: 'rotate',
    gamepadIndex: 0,
    stick: 'left',
    startX: 0,
    startY: 1,
    endX: 0,
    endY: 1,
    directions: 8,
    rotateMs: 500,
    clockwise: true,
  });
});
