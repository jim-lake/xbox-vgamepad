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

void test('firstInfiniteIndex: hold action → does not block same level', () => {
  assert.equal(firstInfiniteIndex([hold(btn('a'))]), -1);
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

// ── Lift: Hold detection with mixed actions ──────────────────────────────────

void test('lift: [down(A), down(B), delay("infinite")] → [hold(A), hold(B)]', () => {
  const input: ScriptAction[] = [
    { type: 'down', buttons: [btn('a')] },
    { type: 'down', buttons: [btn('b')] },
    { type: 'delay', durationMs: 'infinite' },
  ];
  assert.deepEqual(liftActions(input), [hold(btn('a')), hold(btn('b'))]);
});

void test('lift: down(A), delay(200), down(B), delay(300), down(X), delay("infinite") → hold(A), delay(200), hold(B), delay(300), hold(X)', () => {
  const input: ScriptAction[] = [
    { type: 'down', buttons: [btn('a')] },
    { type: 'delay', durationMs: 200 },
    { type: 'down', buttons: [btn('b')] },
    { type: 'delay', durationMs: 300 },
    { type: 'down', buttons: [btn('x')] },
    { type: 'delay', durationMs: 'infinite' },
  ];
  assert.deepEqual(liftActions(input), [
    hold(btn('a')),
    { type: 'delay', durationMs: 200 },
    hold(btn('b')),
    { type: 'delay', durationMs: 300 },
    hold(btn('x')),
  ]);
});

void test('lift: tap(A) then hold(B) — matched down/up stays as tap, unmatched becomes hold', () => {
  const input: ScriptAction[] = [
    { type: 'down', buttons: [btn('a')] },
    { type: 'delay', durationMs: 50 },
    { type: 'up', buttons: [btn('a')] },
    { type: 'down', buttons: [btn('b')] },
    { type: 'delay', durationMs: 'infinite' },
  ];
  assert.deepEqual(liftActions(input), [
    { type: 'tap', buttons: [btn('a')], durationMs: 50 },
    hold(btn('b')),
  ]);
});

void test('lift: two taps then hold — multiple matched pairs + unmatched', () => {
  const input: ScriptAction[] = [
    { type: 'down', buttons: [btn('a')] },
    { type: 'delay', durationMs: 50 },
    { type: 'up', buttons: [btn('a')] },
    { type: 'down', buttons: [btn('x')] },
    { type: 'delay', durationMs: 75 },
    { type: 'up', buttons: [btn('x')] },
    { type: 'down', buttons: [btn('y')] },
    { type: 'delay', durationMs: 'infinite' },
  ];
  assert.deepEqual(liftActions(input), [
    { type: 'tap', buttons: [btn('a')], durationMs: 50 },
    { type: 'tap', buttons: [btn('x')], durationMs: 75 },
    hold(btn('y')),
  ]);
});

void test('lift: hold then delay then matched pair — hold(A), delay, tap(B), suspend', () => {
  // down(A) is unmatched, down(B)/up(B) is matched, trailing infinite with no remaining unmatched → suspend
  // Wait — A IS unmatched so the trailing infinite is consumed by hold detection
  const input: ScriptAction[] = [
    { type: 'down', buttons: [btn('a')] },
    { type: 'delay', durationMs: 100 },
    { type: 'down', buttons: [btn('b')] },
    { type: 'delay', durationMs: 50 },
    { type: 'up', buttons: [btn('b')] },
    { type: 'delay', durationMs: 'infinite' },
  ];
  assert.deepEqual(liftActions(input), [
    hold(btn('a')),
    { type: 'delay', durationMs: 100 },
    { type: 'tap', buttons: [btn('b')], durationMs: 50 },
  ]);
});

void test('lift: all matched downs + delay("infinite") → all taps + suspend', () => {
  const input: ScriptAction[] = [
    { type: 'down', buttons: [btn('a')] },
    { type: 'delay', durationMs: 100 },
    { type: 'up', buttons: [btn('a')] },
    { type: 'down', buttons: [btn('b')] },
    { type: 'delay', durationMs: 200 },
    { type: 'up', buttons: [btn('b')] },
    { type: 'delay', durationMs: 'infinite' },
  ];
  const result = liftActions(input);
  assert.deepEqual(result, [
    { type: 'tap', buttons: [btn('a')], durationMs: 100 },
    { type: 'tap', buttons: [btn('b')], durationMs: 200 },
    suspend(),
  ]);
});

void test('round-trip: hold(A), hold(B) → flatten → lift = original', () => {
  const original = [hold(btn('a')), hold(btn('b'))];
  assert.deepEqual(liftActions(flattenActions(original)), original);
});

void test('round-trip: tap(A), tap(X), hold(Y) → flatten → lift = original', () => {
  const original = [
    { type: 'tap' as const, buttons: [btn('a')], durationMs: 50 },
    { type: 'tap' as const, buttons: [btn('x')], durationMs: 75 },
    hold(btn('y')),
  ];
  assert.deepEqual(liftActions(flattenActions(original)), original);
});

void test('round-trip: hold(A), delay(200), hold(B), delay(300), hold(X) → flatten → lift = original', () => {
  const original = [
    hold(btn('a')),
    { type: 'delay' as const, durationMs: 200 },
    hold(btn('b')),
    { type: 'delay' as const, durationMs: 300 },
    hold(btn('x')),
  ];
  assert.deepEqual(liftActions(flattenActions(original)), original);
});

// ── Hold inside loops ────────────────────────────────────────────────────────

void test('lift: finite loop containing [down(A), delay("infinite")] → loop with [hold(A)]', () => {
  const input: ScriptAction[] = [
    {
      type: 'loop',
      count: 3,
      actions: [
        { type: 'down', buttons: [btn('a')] },
        { type: 'delay', durationMs: 'infinite' },
      ],
    },
  ];
  assert.deepEqual(liftActions(input), [
    { type: 'loop', count: 3, actions: [hold(btn('a'))] },
  ]);
});

void test('lift: infinite loop containing [down(A), down(B), delay("infinite")] → loop with [hold(A), hold(B)]', () => {
  const input: ScriptAction[] = [
    {
      type: 'loop',
      count: 'infinite',
      actions: [
        { type: 'down', buttons: [btn('a')] },
        { type: 'down', buttons: [btn('b')] },
        { type: 'delay', durationMs: 'infinite' },
      ],
    },
  ];
  assert.deepEqual(liftActions(input), [
    {
      type: 'loop',
      count: 'infinite',
      actions: [hold(btn('a')), hold(btn('b'))],
    },
  ]);
});

void test('lift: finite loop with tap then hold inside', () => {
  const input: ScriptAction[] = [
    {
      type: 'loop',
      count: 2,
      actions: [
        { type: 'down', buttons: [btn('x')] },
        { type: 'delay', durationMs: 50 },
        { type: 'up', buttons: [btn('x')] },
        { type: 'down', buttons: [btn('y')] },
        { type: 'delay', durationMs: 'infinite' },
      ],
    },
  ];
  assert.deepEqual(liftActions(input), [
    {
      type: 'loop',
      count: 2,
      actions: [
        { type: 'tap', buttons: [btn('x')], durationMs: 50 },
        hold(btn('y')),
      ],
    },
  ]);
});

void test('round-trip: finite loop with hold(A) → flatten → lift = original', () => {
  const original = [
    { type: 'loop' as const, count: 3, actions: [hold(btn('a'))] },
  ];
  assert.deepEqual(liftActions(flattenActions(original)), original);
});

void test('round-trip: infinite loop with hold(A), hold(B) → flatten → lift = original', () => {
  const original = [
    {
      type: 'loop' as const,
      count: 'infinite' as const,
      actions: [hold(btn('a')), hold(btn('b'))],
    },
  ];
  assert.deepEqual(liftActions(flattenActions(original)), original);
});

void test('round-trip: finite loop with tap(X), hold(Y) → flatten → lift = original', () => {
  const original = [
    {
      type: 'loop' as const,
      count: 2,
      actions: [
        { type: 'tap' as const, buttons: [btn('x')], durationMs: 50 },
        hold(btn('y')),
      ],
    },
  ];
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
