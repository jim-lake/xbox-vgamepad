import { test } from 'node:test';
import assert from 'node:assert/strict';
import { liftActions, flattenActions } from '../../src/popup/script-helpers.ts';
import type { ScriptAction, GamepadAction } from '../../src/types/gamepad.ts';
import type { TurboAction } from '../../src/types/popup.ts';

// ── fixtures ─────────────────────────────────────────────────────────────────

function btn(
  action: GamepadAction['action'],
  gamepadIndex: 0 | 1 | 2 | 3 = 0
): GamepadAction {
  return { type: 'action', gamepadIndex, action };
}

function turbo(speed: number, ...btns: GamepadAction[]): TurboAction {
  return { type: 'turbo', buttons: btns, speed };
}

/** The canonical flattened form of a turbo with given speed and buttons. */
function turboLoop(speed: number, btns: GamepadAction[]): ScriptAction {
  const half = Math.round(speed / 2);
  return {
    type: 'loop',
    count: 'infinite',
    actions: [
      { type: 'down', buttons: btns },
      { type: 'delay', durationMs: half },
      { type: 'up', buttons: btns },
      { type: 'delay', durationMs: half },
    ],
  };
}

// ── flatten: turbo → infinite loop ───────────────────────────────────────────

void test('flatten turbo 1-button → infinite loop with down/delay/up/delay', () => {
  const t = turbo(100, btn('a'));
  const result = flattenActions([t]);
  assert.deepEqual(result, [turboLoop(100, t.buttons)]);
});

void test('flatten turbo 2-button → infinite loop', () => {
  const t = turbo(100, btn('a'), btn('b'));
  const result = flattenActions([t]);
  assert.deepEqual(result, [turboLoop(100, t.buttons)]);
});

void test('flatten turbo: speed/2 used for both delays (even speed)', () => {
  const t = turbo(128, btn('x'));
  const result = flattenActions([t]);
  const loop = result[0];
  assert.ok(loop?.type === 'loop');
  assert.equal((loop.actions[1] as { durationMs: number }).durationMs, 64);
  assert.equal((loop.actions[3] as { durationMs: number }).durationMs, 64);
});

void test('flatten turbo: speed/2 rounded for odd speed', () => {
  const t = turbo(101, btn('a'));
  const result = flattenActions([t]);
  const loop = result[0];
  assert.ok(loop?.type === 'loop');
  // Math.round(101/2) = 51
  assert.equal((loop.actions[1] as { durationMs: number }).durationMs, 51);
  assert.equal((loop.actions[3] as { durationMs: number }).durationMs, 51);
});

void test('flatten turbo: loop count is infinite', () => {
  const result = flattenActions([turbo(100, btn('a'))]);
  const loop = result[0];
  assert.ok(loop?.type === 'loop');
  assert.equal(loop.count, 'infinite');
});

void test('flatten turbo: loop has exactly 4 actions', () => {
  const result = flattenActions([turbo(100, btn('a'))]);
  const loop = result[0];
  assert.ok(loop?.type === 'loop');
  assert.equal(loop.actions.length, 4);
});

// ── lift: infinite loop → turbo ───────────────────────────────────────────────

void test('lift turbo 1-button: infinite loop → turbo', () => {
  const result = liftActions([turboLoop(100, [btn('a')])]);
  assert.equal(result.length, 1);
  const t = result[0] as TurboAction;
  assert.equal(t.type, 'turbo');
  assert.equal(t.buttons.length, 1);
  assert.equal(t.buttons[0]?.action, 'a');
  assert.equal(t.speed, 100);
});

void test('lift turbo 2-button: infinite loop → turbo', () => {
  const result = liftActions([turboLoop(100, [btn('a'), btn('b')])]);
  const t = result[0] as TurboAction;
  assert.equal(t.type, 'turbo');
  assert.equal(t.buttons.length, 2);
});

void test('lift turbo: speed reconstructed from delay*2', () => {
  const result = liftActions([turboLoop(128, [btn('x')])]);
  const t = result[0] as TurboAction;
  assert.equal(t.speed, 128);
});

// ── round-trips ───────────────────────────────────────────────────────────────

void test('round-trip: 1-button turbo → flatten → lift = original', () => {
  const t = turbo(100, btn('a'));
  assert.deepEqual(liftActions(flattenActions([t]))[0], t);
});

void test('round-trip: 2-button turbo → flatten → lift = original', () => {
  const t = turbo(100, btn('a'), btn('b'));
  assert.deepEqual(liftActions(flattenActions([t]))[0], t);
});

void test('round-trip: turbo speed 64 → flatten → lift = original', () => {
  const t = turbo(64, btn('y'));
  assert.deepEqual(liftActions(flattenActions([t]))[0], t);
});

void test('round-trip: turbo speed 150 → flatten → lift = original', () => {
  const t = turbo(150, btn('b'));
  assert.deepEqual(liftActions(flattenActions([t]))[0], t);
});

// ── negative: should NOT lift as turbo ───────────────────────────────────────

void test('no turbo lift: finite loop is kept as loop', () => {
  const loop: ScriptAction = {
    type: 'loop',
    count: 3,
    actions: [
      { type: 'down', buttons: [btn('a')] },
      { type: 'delay', durationMs: 50 },
      { type: 'up', buttons: [btn('a')] },
      { type: 'delay', durationMs: 50 },
    ],
  };
  const result = liftActions([loop]);
  assert.equal(result[0]?.type, 'loop');
});

void test('no turbo lift: infinite loop with 3 actions (missing trailing delay)', () => {
  const loop: ScriptAction = {
    type: 'loop',
    count: 'infinite',
    actions: [
      { type: 'down', buttons: [btn('a')] },
      { type: 'delay', durationMs: 50 },
      { type: 'up', buttons: [btn('a')] },
    ],
  };
  const result = liftActions([loop]);
  assert.equal(result[0]?.type, 'loop');
});

void test('no turbo lift: infinite loop with mismatched delays', () => {
  const loop: ScriptAction = {
    type: 'loop',
    count: 'infinite',
    actions: [
      { type: 'down', buttons: [btn('a')] },
      { type: 'delay', durationMs: 50 },
      { type: 'up', buttons: [btn('a')] },
      { type: 'delay', durationMs: 99 }, // different from first delay
    ],
  };
  const result = liftActions([loop]);
  assert.equal(result[0]?.type, 'loop');
});

void test('no turbo lift: infinite loop with button action mismatch', () => {
  const loop: ScriptAction = {
    type: 'loop',
    count: 'infinite',
    actions: [
      { type: 'down', buttons: [btn('a')] },
      { type: 'delay', durationMs: 50 },
      { type: 'up', buttons: [btn('b')] }, // different button
      { type: 'delay', durationMs: 50 },
    ],
  };
  const result = liftActions([loop]);
  assert.equal(result[0]?.type, 'loop');
});

void test('no turbo lift: infinite loop with gamepadIndex mismatch', () => {
  const loop: ScriptAction = {
    type: 'loop',
    count: 'infinite',
    actions: [
      { type: 'down', buttons: [btn('a', 0)] },
      { type: 'delay', durationMs: 50 },
      { type: 'up', buttons: [btn('a', 1)] }, // different slot
      { type: 'delay', durationMs: 50 },
    ],
  };
  const result = liftActions([loop]);
  assert.equal(result[0]?.type, 'loop');
});

void test('no turbo lift: infinite loop with empty buttons', () => {
  const loop: ScriptAction = {
    type: 'loop',
    count: 'infinite',
    actions: [
      { type: 'down', buttons: [] },
      { type: 'delay', durationMs: 50 },
      { type: 'up', buttons: [] },
      { type: 'delay', durationMs: 50 },
    ],
  };
  const result = liftActions([loop]);
  // empty buttons: down has no buttons, should not lift as turbo
  assert.equal(result[0]?.type, 'loop');
});

void test('no turbo lift: infinite loop with wrong action order (up before down)', () => {
  const loop: ScriptAction = {
    type: 'loop',
    count: 'infinite',
    actions: [
      { type: 'up', buttons: [btn('a')] },
      { type: 'delay', durationMs: 50 },
      { type: 'down', buttons: [btn('a')] },
      { type: 'delay', durationMs: 50 },
    ],
  };
  const result = liftActions([loop]);
  assert.equal(result[0]?.type, 'loop');
});
