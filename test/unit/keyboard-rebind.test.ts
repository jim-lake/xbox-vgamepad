import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Stub window and KeyboardEvent for the module
type Fn = (...args: unknown[]) => void;
const listeners: { type: string; fn: Fn; capture: boolean }[] = [];
const fakeWindow = {
  addEventListener(type: string, fn: Fn, capture?: boolean) {
    listeners.push({ type, fn, capture: capture === true });
  },
  removeEventListener(type: string, fn: Fn, _capture?: boolean) {
    const idx = listeners.findIndex((l) => l.type === type && l.fn === fn);
    if (idx !== -1) {
      listeners.splice(idx, 1);
    }
  },
};
Object.defineProperty(globalThis, 'window', {
  value: fakeWindow,
  configurable: true,
});

class FakeKeyboardEvent {
  type: string;
  code: string;
  key: string;
  constructor(type: string, init: Record<string, unknown>) {
    this.type = type;
    this.code = init['code'] as string;
    this.key = init['key'] as string;
  }
}
Object.defineProperty(globalThis, 'KeyboardEvent', {
  value: FakeKeyboardEvent,
  configurable: true,
});

const { installRebinds, removeRebinds } =
  await import('../../src/injected/keyboard-rebind.ts');

function fireKeyEvent(type: 'keydown' | 'keyup', code: string) {
  let stopped = false;
  const dispatched: Array<{ code: string; key: string; type: string }> = [];
  const event = {
    type,
    code,
    key: code,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    repeat: false,
    target: {
      dispatchEvent(e: unknown) {
        const ke = e as { code: string; key: string; type: string };
        dispatched.push(ke);
        return true;
      },
    },
    stopImmediatePropagation() {
      stopped = true;
    },
    preventDefault() {},
  };

  const handler = listeners.find((l) => l.type === type);
  if (handler) {
    handler.fn(event);
  }
  return { stopped, dispatched };
}

beforeEach(() => {
  removeRebinds();
  listeners.length = 0;
});

void test('installRebinds: rebound key dispatches synthetic event', () => {
  installRebinds([{ from: 'KeyZ', to: ['Space'] }]);
  const { stopped, dispatched } = fireKeyEvent('keydown', 'KeyZ');
  assert.equal(stopped, true);
  assert.equal(dispatched.length, 1);
  const first = dispatched[0];
  assert.ok(first);
  assert.equal(first.code, 'Space');
  assert.equal(first.key, ' ');
});

void test('installRebinds: multiple targets fires multiple events', () => {
  installRebinds([{ from: 'Space', to: ['Space', 'KeyU'] }]);
  const { stopped, dispatched } = fireKeyEvent('keydown', 'Space');
  assert.equal(stopped, true);
  assert.equal(dispatched.length, 2);
  const first = dispatched[0];
  const second = dispatched[1];
  assert.ok(first);
  assert.ok(second);
  assert.equal(first.code, 'Space');
  assert.equal(second.code, 'KeyU');
});

void test('installRebinds: non-rebound key is not intercepted', () => {
  installRebinds([{ from: 'KeyZ', to: ['Space'] }]);
  const { stopped, dispatched } = fireKeyEvent('keydown', 'KeyA');
  assert.equal(stopped, false);
  assert.equal(dispatched.length, 0);
});

void test('installRebinds: keyup for held key dispatches synthetic keyup', () => {
  installRebinds([{ from: 'KeyZ', to: ['Space'] }]);
  fireKeyEvent('keydown', 'KeyZ');
  const { stopped, dispatched } = fireKeyEvent('keyup', 'KeyZ');
  assert.equal(stopped, true);
  assert.equal(dispatched.length, 1);
  const first = dispatched[0];
  assert.ok(first);
  assert.equal(first.code, 'Space');
  assert.equal(first.type, 'keyup');
});

void test('installRebinds: keyup with multiple targets fires all', () => {
  installRebinds([{ from: 'Space', to: ['Space', 'KeyU'] }]);
  fireKeyEvent('keydown', 'Space');
  const { dispatched } = fireKeyEvent('keyup', 'Space');
  assert.equal(dispatched.length, 2);
  const first = dispatched[0];
  const second = dispatched[1];
  assert.ok(first);
  assert.ok(second);
  assert.equal(first.code, 'Space');
  assert.equal(first.type, 'keyup');
  assert.equal(second.code, 'KeyU');
  assert.equal(second.type, 'keyup');
});

void test('removeRebinds: after removal, keys are not intercepted', () => {
  installRebinds([{ from: 'KeyZ', to: ['Space'] }]);
  removeRebinds();
  const { stopped } = fireKeyEvent('keydown', 'KeyZ');
  assert.equal(stopped, false);
});

void test('installRebinds: empty to array has no runtime effect', () => {
  installRebinds([{ from: 'KeyZ', to: [] }]);
  const { stopped } = fireKeyEvent('keydown', 'KeyZ');
  assert.equal(stopped, false);
});

void test('installRebinds: original event is suppressed', () => {
  installRebinds([{ from: 'KeyZ', to: ['KeyA'] }]);
  const { stopped, dispatched } = fireKeyEvent('keydown', 'KeyZ');
  assert.equal(stopped, true, 'original event should be stopped');
  // Only the synthetic KeyA fires, NOT KeyZ
  assert.equal(dispatched.length, 1);
  const first = dispatched[0];
  assert.ok(first);
  assert.equal(first.code, 'KeyA');
});

void test('installRebinds: multiple rebinds work independently', () => {
  installRebinds([
    { from: 'KeyZ', to: ['Space'] },
    { from: 'KeyX', to: ['KeyB'] },
  ]);
  const r1 = fireKeyEvent('keydown', 'KeyZ');
  assert.equal(r1.stopped, true);
  assert.equal(r1.dispatched.length, 1);
  const first = r1.dispatched[0];
  assert.ok(first);
  assert.equal(first.code, 'Space');

  const r2 = fireKeyEvent('keydown', 'KeyX');
  assert.equal(r2.stopped, true);
  assert.equal(r2.dispatched.length, 1);
  const second = r2.dispatched[0];
  assert.ok(second);
  assert.equal(second.code, 'KeyB');
});
