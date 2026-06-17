import { test } from 'node:test';
import assert from 'node:assert/strict';
import { liftActions, flattenActions } from '../../src/popup/script-helpers.ts';
import type { ScriptAction } from '../../src/types/gamepad.ts';
import type {
  KeyTapAction,
  KeyTurboAction,
  KeyHoldAction,
} from '../../src/types/popup.ts';

// ── helpers ──────────────────────────────────────────────────────────────────

function keyDown(...keys: string[]): ScriptAction {
  return { type: 'key_down', keys };
}
function keyUp(...keys: string[]): ScriptAction {
  return { type: 'key_up', keys };
}
function delay(ms: number | 'infinite'): ScriptAction {
  return { type: 'delay', durationMs: ms };
}

// ── flatten key_tap ──────────────────────────────────────────────────────────

void test('flatten key_tap → key_down + delay + key_up', () => {
  const action: KeyTapAction = {
    type: 'key_tap',
    keys: ['Enter'],
    durationMs: 50,
  };
  const result = flattenActions([action]);
  assert.deepEqual(result, [
    { type: 'key_down', keys: ['Enter'] },
    { type: 'delay', durationMs: 50 },
    { type: 'key_up', keys: ['Enter'] },
  ]);
});

void test('flatten key_tap multi-key', () => {
  const action: KeyTapAction = {
    type: 'key_tap',
    keys: ['ShiftLeft', 'Space'],
    durationMs: 30,
  };
  const result = flattenActions([action]);
  assert.deepEqual(result, [
    { type: 'key_down', keys: ['ShiftLeft', 'Space'] },
    { type: 'delay', durationMs: 30 },
    { type: 'key_up', keys: ['ShiftLeft', 'Space'] },
  ]);
});

// ── flatten key_turbo ────────────────────────────────────────────────────────

void test('flatten key_turbo → infinite loop with key_down/key_up', () => {
  const action: KeyTurboAction = {
    type: 'key_turbo',
    keys: ['Space'],
    speed: 100,
  };
  const result = flattenActions([action]);
  assert.deepEqual(result, [
    {
      type: 'loop',
      count: 'infinite',
      actions: [
        { type: 'key_down', keys: ['Space'] },
        { type: 'delay', durationMs: 50 },
        { type: 'key_up', keys: ['Space'] },
        { type: 'delay', durationMs: 50 },
      ],
    },
  ]);
});

// ── flatten key_hold ─────────────────────────────────────────────────────────

void test('flatten key_hold → key_down + trailing delay infinite', () => {
  const action: KeyHoldAction = { type: 'key_hold', keys: ['KeyW'] };
  const result = flattenActions([action]);
  assert.deepEqual(result, [
    { type: 'key_down', keys: ['KeyW'] },
    { type: 'delay', durationMs: 'infinite' },
  ]);
});

// ── lift key_tap ─────────────────────────────────────────────────────────────

void test('lift: key_down + delay + key_up → key_tap', () => {
  const result = liftActions([keyDown('Enter'), delay(50), keyUp('Enter')]);
  assert.equal(result.length, 1);
  const t = result[0] as KeyTapAction;
  assert.equal(t.type, 'key_tap');
  assert.deepEqual(t.keys, ['Enter']);
  assert.equal(t.durationMs, 50);
});

void test('lift: multi-key key_down + delay + key_up → key_tap', () => {
  const result = liftActions([
    keyDown('ShiftLeft', 'Space'),
    delay(30),
    keyUp('ShiftLeft', 'Space'),
  ]);
  assert.equal(result.length, 1);
  const t = result[0] as KeyTapAction;
  assert.equal(t.type, 'key_tap');
  assert.deepEqual(t.keys, ['ShiftLeft', 'Space']);
});

// ── lift key_turbo ───────────────────────────────────────────────────────────

void test('lift: infinite loop [key_down, delay, key_up, delay] → key_turbo', () => {
  const actions: ScriptAction[] = [
    {
      type: 'loop',
      count: 'infinite',
      actions: [keyDown('Space'), delay(50), keyUp('Space'), delay(50)],
    },
  ];
  const result = liftActions(actions);
  assert.equal(result.length, 1);
  const t = result[0] as KeyTurboAction;
  assert.equal(t.type, 'key_turbo');
  assert.deepEqual(t.keys, ['Space']);
  assert.equal(t.speed, 100);
});

// ── lift key_hold ────────────────────────────────────────────────────────────

void test('lift: key_down + trailing delay infinite → key_hold', () => {
  const result = liftActions([keyDown('KeyW'), delay('infinite')]);
  assert.equal(result.length, 1);
  const t = result[0] as KeyHoldAction;
  assert.equal(t.type, 'key_hold');
  assert.deepEqual(t.keys, ['KeyW']);
});

// ── no lift (negative cases) ─────────────────────────────────────────────────

void test('no lift: key mismatch (A down, B up)', () => {
  const result = liftActions([keyDown('KeyA'), delay(50), keyUp('KeyB')]);
  assert.equal(result.length, 3);
});

void test('no lift: key count mismatch', () => {
  const result = liftActions([
    keyDown('KeyA', 'KeyB'),
    delay(50),
    keyUp('KeyA'),
  ]);
  assert.equal(result.length, 3);
});

// ── round-trips ──────────────────────────────────────────────────────────────

void test('round-trip: key_tap → flatten → lift', () => {
  const original: KeyTapAction = {
    type: 'key_tap',
    keys: ['Enter'],
    durationMs: 50,
  };
  const lifted = liftActions(flattenActions([original]));
  assert.deepEqual(lifted[0], original);
});

void test('round-trip: key_turbo → flatten → lift', () => {
  const original: KeyTurboAction = {
    type: 'key_turbo',
    keys: ['Space'],
    speed: 100,
  };
  const lifted = liftActions(flattenActions([original]));
  assert.deepEqual(lifted[0], original);
});

void test('round-trip: key_hold → flatten → lift', () => {
  const original: KeyHoldAction = { type: 'key_hold', keys: ['KeyW'] };
  const lifted = liftActions(flattenActions([original]));
  assert.deepEqual(lifted[0], original);
});

void test('round-trip: raw key_down + delay + key_up survives lift+flatten', () => {
  const original: ScriptAction[] = [
    keyDown('Enter'),
    delay(50),
    keyUp('Enter'),
  ];
  assert.deepEqual(flattenActions(liftActions(original)), original);
});

// ── pass-through of raw key_down/key_up ──────────────────────────────────────

void test('flatten passes through raw key_down', () => {
  const result = flattenActions([{ type: 'key_down', keys: ['Enter'] }]);
  assert.deepEqual(result, [{ type: 'key_down', keys: ['Enter'] }]);
});

void test('flatten passes through raw key_up', () => {
  const result = flattenActions([{ type: 'key_up', keys: ['Enter'] }]);
  assert.deepEqual(result, [{ type: 'key_up', keys: ['Enter'] }]);
});
