import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  liftActions,
  flattenActions,
  firstInfiniteIndex,
} from '../../src/popup/script-helpers.ts';
import type { ScriptAction, GamepadAction } from '../../src/types/gamepad.ts';
import type { HoldAction, SuspendAction } from '../../src/types/popup.ts';

// ── fixtures ─────────────────────────────────────────────────────────────────

function btn(
  action: GamepadAction['action'],
  gamepadIndex: 0 | 1 | 2 | 3 = 0
): GamepadAction {
  return { type: 'action', gamepadIndex, action };
}

function hold(...btns: GamepadAction[]): HoldAction {
  return { type: 'hold', buttons: btns };
}

function suspend(): SuspendAction {
  return { type: 'suspend' };
}

// ── firstInfiniteIndex detection ─────────────────────────────────────────────

void test('firstInfiniteIndex: delay "infinite" as only action → returns 0', () => {
  assert.equal(
    firstInfiniteIndex([{ type: 'delay', durationMs: 'infinite' }]),
    0
  );
});

void test('firstInfiniteIndex: delay "infinite" at end after other actions → returns its index', () => {
  assert.equal(
    firstInfiniteIndex([
      { type: 'down', buttons: [btn('a')] },
      { type: 'delay', durationMs: 'infinite' },
    ]),
    1
  );
});

void test('firstInfiniteIndex: delay "infinite" in the middle → returns its index', () => {
  assert.equal(
    firstInfiniteIndex([
      { type: 'down', buttons: [btn('a')] },
      { type: 'delay', durationMs: 'infinite' },
      { type: 'down', buttons: [btn('b')] },
    ]),
    1
  );
});

void test('firstInfiniteIndex: no delay "infinite" (just normal delays) → returns -1', () => {
  assert.equal(
    firstInfiniteIndex([
      { type: 'down', buttons: [btn('a')] },
      { type: 'delay', durationMs: 100 },
    ]),
    -1
  );
});

void test('firstInfiniteIndex: delay "infinite" inside a loop (not at top level) → returns -1', () => {
  assert.equal(
    firstInfiniteIndex([
      {
        type: 'loop',
        count: 3,
        actions: [{ type: 'delay', durationMs: 'infinite' }],
      },
    ]),
    -1
  );
});

void test('firstInfiniteIndex: hold action → returns its index', () => {
  assert.equal(firstInfiniteIndex([hold(btn('a'))]), 0);
});

void test('firstInfiniteIndex: suspend action → returns its index', () => {
  assert.equal(firstInfiniteIndex([suspend()]), 0);
});

// ── Lift (deserialization): Hold detection ───────────────────────────────────

void test('lift: [down(A), delay("infinite")] → [hold(A)]', () => {
  const input: ScriptAction[] = [
    { type: 'down', buttons: [btn('a')] },
    { type: 'delay', durationMs: 'infinite' },
  ];
  assert.deepEqual(liftActions(input), [hold(btn('a'))]);
});

void test('lift: [down(A), delay(100), down(B), delay("infinite")] → both Hold (hard case)', () => {
  const input: ScriptAction[] = [
    { type: 'down', buttons: [btn('a')] },
    { type: 'delay', durationMs: 100 },
    { type: 'down', buttons: [btn('b')] },
    { type: 'delay', durationMs: 'infinite' },
  ];
  const result = liftActions(input);
  assert.deepEqual(result, [
    hold(btn('a')),
    { type: 'delay', durationMs: 100 },
    hold(btn('b')),
  ]);
});

void test('lift: [down(A), delay(100), up(A), down(B), delay("infinite")] → A matched, B hold', () => {
  const input: ScriptAction[] = [
    { type: 'down', buttons: [btn('a')] },
    { type: 'delay', durationMs: 100 },
    { type: 'up', buttons: [btn('a')] },
    { type: 'down', buttons: [btn('b')] },
    { type: 'delay', durationMs: 'infinite' },
  ];
  const result = liftActions(input);
  assert.deepEqual(result, [
    { type: 'tap', buttons: [btn('a')], durationMs: 100 },
    hold(btn('b')),
  ]);
});

void test('lift: [down(A), down(B), delay("infinite")] → both Hold', () => {
  const input: ScriptAction[] = [
    { type: 'down', buttons: [btn('a')] },
    { type: 'down', buttons: [btn('b')] },
    { type: 'delay', durationMs: 'infinite' },
  ];
  assert.deepEqual(liftActions(input), [hold(btn('a')), hold(btn('b'))]);
});

void test('lift: [delay("infinite")] alone → suspend', () => {
  const input: ScriptAction[] = [{ type: 'delay', durationMs: 'infinite' }];
  assert.deepEqual(liftActions(input), [suspend()]);
});

void test('lift: [down(A), up(A), delay("infinite")] → A matched → suspend', () => {
  const input: ScriptAction[] = [
    { type: 'down', buttons: [btn('a')] },
    { type: 'up', buttons: [btn('a')] },
    { type: 'delay', durationMs: 'infinite' },
  ];
  const result = liftActions(input);
  assert.equal(result[result.length - 1]?.type, 'suspend');
});

// ── Flatten (serialization): Hold → storage format ───────────────────────────

void test('flatten: Hold(A) → [down(A), delay("infinite")]', () => {
  const result = flattenActions([hold(btn('a'))]);
  assert.deepEqual(result, [
    { type: 'down', buttons: [btn('a')] },
    { type: 'delay', durationMs: 'infinite' },
  ]);
});

void test('flatten: Hold(A), delay(100), Hold(B) → [down(A), delay(100), down(B), delay("infinite")]', () => {
  const result = flattenActions([
    hold(btn('a')),
    { type: 'delay', durationMs: 100 },
    hold(btn('b')),
  ]);
  assert.deepEqual(result, [
    { type: 'down', buttons: [btn('a')] },
    { type: 'delay', durationMs: 100 },
    { type: 'down', buttons: [btn('b')] },
    { type: 'delay', durationMs: 'infinite' },
  ]);
});

void test('flatten: Suspend → [delay("infinite")]', () => {
  const result = flattenActions([suspend()]);
  assert.deepEqual(result, [{ type: 'delay', durationMs: 'infinite' }]);
});

// ── Round-trips ──────────────────────────────────────────────────────────────

void test('round-trip: hold(A) → flatten → lift = original', () => {
  const original = [hold(btn('a'))];
  assert.deepEqual(liftActions(flattenActions(original)), original);
});

void test('round-trip: hold(A), delay(100), hold(B) → flatten → lift = original (hard case)', () => {
  const original = [
    hold(btn('a')),
    { type: 'delay' as const, durationMs: 100 },
    hold(btn('b')),
  ];
  assert.deepEqual(liftActions(flattenActions(original)), original);
});

void test('round-trip: tap(A), hold(B) → flatten → lift = original (mixed)', () => {
  const original = [
    { type: 'tap' as const, buttons: [btn('a')], durationMs: 100 },
    hold(btn('b')),
  ];
  assert.deepEqual(liftActions(flattenActions(original)), original);
});

void test('round-trip: suspend → flatten → lift = original', () => {
  const original = [suspend()];
  assert.deepEqual(liftActions(flattenActions(original)), original);
});

// ── Negative: should NOT lift as Hold ────────────────────────────────────────

void test('no hold lift: [down(A), delay(100)] — trailing delay is finite', () => {
  const input: ScriptAction[] = [
    { type: 'down', buttons: [btn('a')] },
    { type: 'delay', durationMs: 100 },
  ];
  const result = liftActions(input);
  assert.equal(result[0]?.type, 'down');
});

void test('no hold lift: [down(A), delay("infinite"), down(B)] — delay not at end', () => {
  const input: ScriptAction[] = [
    { type: 'down', buttons: [btn('a')] },
    { type: 'delay', durationMs: 'infinite' },
    { type: 'down', buttons: [btn('b')] },
  ];
  const result = liftActions(input);
  // delay "infinite" is not at end, so no hold detection
  assert.notEqual(result[0]?.type, 'hold');
});

void test('no hold lift: [down(A)] alone — no trailing delay "infinite"', () => {
  const input: ScriptAction[] = [{ type: 'down', buttons: [btn('a')] }];
  const result = liftActions(input);
  assert.equal(result[0]?.type, 'down');
});
