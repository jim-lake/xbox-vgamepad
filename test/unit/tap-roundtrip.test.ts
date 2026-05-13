import { test } from 'node:test';
import assert from 'node:assert/strict';
import { liftActions, flattenActions } from '../../src/popup/script-helpers.ts';
import type { ScriptAction, GamepadAction } from '../../src/types/gamepad.ts';
import type { TapAction } from '../../src/types/popup.ts';

// ── fixtures ─────────────────────────────────────────────────────────────────

function btn(
  action: GamepadAction['action'],
  gamepadIndex: 0 | 1 | 2 | 3 = 0
): GamepadAction {
  return { type: 'action', gamepadIndex, action };
}
function down(...btns: GamepadAction[]): ScriptAction {
  return { type: 'down', buttons: btns };
}
function up(...btns: GamepadAction[]): ScriptAction {
  return { type: 'up', buttons: btns };
}
function delay(ms: number): ScriptAction {
  return { type: 'delay', durationMs: ms };
}
function tap(...btns: GamepadAction[]): TapAction {
  return { type: 'tap', buttons: btns, durationMs: 100 };
}

// ── positive: lift recognises 1, 2, 3 buttons ────────────────────────────────

void test('lift 1-button: down+delay+up → tap', () => {
  const result = liftActions([down(btn('a')), delay(100), up(btn('a'))]);
  assert.equal(result.length, 1);
  const t = result[0] as TapAction;
  assert.equal(t.type, 'tap');
  assert.equal(t.buttons.length, 1);
  assert.equal(t.buttons[0]?.action, 'a');
  assert.equal(t.durationMs, 100);
});

void test('lift 2-button: down+delay+up → tap', () => {
  const result = liftActions([
    down(btn('a'), btn('b')),
    delay(50),
    up(btn('a'), btn('b')),
  ]);
  assert.equal(result.length, 1);
  const t = result[0] as TapAction;
  assert.equal(t.type, 'tap');
  assert.equal(t.buttons.length, 2);
});

void test('lift 3-button: down+delay+up → tap', () => {
  const result = liftActions([
    down(btn('a'), btn('b'), btn('x')),
    delay(200),
    up(btn('a'), btn('b'), btn('x')),
  ]);
  assert.equal(result.length, 1);
  const t = result[0] as TapAction;
  assert.equal(t.type, 'tap');
  assert.equal(t.buttons.length, 3);
});

void test('lift: durationMs is preserved from delay node', () => {
  const result = liftActions([down(btn('y')), delay(250), up(btn('y'))]);
  const t = result[0] as TapAction;
  assert.equal(t.durationMs, 250);
});

void test('lift: two consecutive taps both lifted', () => {
  const result = liftActions([
    down(btn('a')),
    delay(100),
    up(btn('a')),
    down(btn('b')),
    delay(100),
    up(btn('b')),
  ]);
  assert.equal(result.length, 2);
  assert.equal(result[0]?.type, 'tap');
  assert.equal(result[1]?.type, 'tap');
});

void test('lift: tap inside loop is lifted', () => {
  const loop: ScriptAction = {
    type: 'loop',
    count: 3,
    actions: [down(btn('a')), delay(100), up(btn('a'))],
  };
  const result = liftActions([loop]);
  assert.equal(result.length, 1);
  const lifted = result[0];
  assert.ok(lifted?.type === 'loop');
  assert.equal(lifted.actions.length, 1);
  assert.equal(lifted.actions[0]?.type, 'tap');
});

// ── negative: should NOT lift ─────────────────────────────────────────────────

void test('no lift: empty buttons on down', () => {
  const result = liftActions([down(), delay(100), up(btn('a'))]);
  assert.equal(result.length, 3);
});

void test('no lift: empty buttons on up', () => {
  const result = liftActions([down(btn('a')), delay(100), up()]);
  assert.equal(result.length, 3);
});

void test('no lift: button action mismatch (a down, b up)', () => {
  const result = liftActions([down(btn('a')), delay(100), up(btn('b'))]);
  assert.equal(result.length, 3);
});

void test('no lift: button count mismatch (2 down, 1 up)', () => {
  const result = liftActions([
    down(btn('a'), btn('b')),
    delay(100),
    up(btn('a')),
  ]);
  assert.equal(result.length, 3);
});

void test('no lift: button count mismatch (1 down, 2 up)', () => {
  const result = liftActions([
    down(btn('a')),
    delay(100),
    up(btn('a'), btn('b')),
  ]);
  assert.equal(result.length, 3);
});

void test('no lift: button order mismatch (a,b down vs b,a up)', () => {
  const result = liftActions([
    down(btn('a'), btn('b')),
    delay(100),
    up(btn('b'), btn('a')),
  ]);
  assert.equal(result.length, 3);
});

void test('no lift: gamepadIndex mismatch', () => {
  const result = liftActions([down(btn('a', 0)), delay(100), up(btn('a', 1))]);
  assert.equal(result.length, 3);
});

void test('no lift: middle node is not a delay (it is a down)', () => {
  const result = liftActions([down(btn('a')), down(btn('b')), up(btn('a'))]);
  assert.equal(result.length, 3);
});

void test('no lift: up before down', () => {
  const result = liftActions([up(btn('a')), delay(100), down(btn('a'))]);
  assert.equal(result.length, 3);
  assert.equal(result[0]?.type, 'up');
});

void test('no lift: down+delay at end with no up', () => {
  const result = liftActions([down(btn('a')), delay(100)]);
  assert.equal(result.length, 2);
});

void test('no lift: down alone', () => {
  const result = liftActions([down(btn('a'))]);
  assert.equal(result.length, 1);
  assert.equal(result[0]?.type, 'down');
});

// ── flatten ───────────────────────────────────────────────────────────────────

void test('flatten 1-button tap → down+delay+up', () => {
  const t = tap(btn('x'));
  const result = flattenActions([t]);
  assert.deepEqual(result, [
    { type: 'down', buttons: t.buttons },
    { type: 'delay', durationMs: 100 },
    { type: 'up', buttons: t.buttons },
  ]);
});

void test('flatten 2-button tap → down+delay+up', () => {
  const t = tap(btn('a'), btn('b'));
  const result = flattenActions([t]);
  assert.equal(result.length, 3);
  assert.deepEqual(
    (result[0] as { buttons: GamepadAction[] }).buttons,
    t.buttons
  );
  assert.deepEqual(
    (result[2] as { buttons: GamepadAction[] }).buttons,
    t.buttons
  );
});

void test('flatten 3-button tap → down+delay+up', () => {
  const t = tap(btn('a'), btn('b'), btn('x'));
  const result = flattenActions([t]);
  assert.equal(result.length, 3);
  assert.equal((result[0] as { buttons: GamepadAction[] }).buttons.length, 3);
});

void test('flatten: tap inside loop is expanded', () => {
  const t = tap(btn('b'));
  const result = flattenActions([{ type: 'loop', count: 2, actions: [t] }]);
  const loop = result[0];
  assert.ok(loop?.type === 'loop');
  assert.equal(loop.actions.length, 3);
});

// ── round-trips ───────────────────────────────────────────────────────────────

void test('round-trip: 1-button tap → flatten → lift = original', () => {
  const t = tap(btn('a'));
  assert.deepEqual(liftActions(flattenActions([t]))[0], t);
});

void test('round-trip: 2-button tap → flatten → lift = original', () => {
  const t = tap(btn('a'), btn('b'));
  assert.deepEqual(liftActions(flattenActions([t]))[0], t);
});

void test('round-trip: 3-button tap → flatten → lift = original', () => {
  const t = tap(btn('a'), btn('b'), btn('x'));
  assert.deepEqual(liftActions(flattenActions([t]))[0], t);
});

void test('round-trip: mismatched down+delay+up survives lift+flatten unchanged', () => {
  const original: ScriptAction[] = [down(btn('a')), delay(100), up(btn('b'))];
  assert.deepEqual(flattenActions(liftActions(original)), original);
});

void test('round-trip: plain matching down+delay+up → lift → flatten = original', () => {
  const original: ScriptAction[] = [down(btn('a')), delay(100), up(btn('a'))];
  assert.deepEqual(flattenActions(liftActions(original)), original);
});
