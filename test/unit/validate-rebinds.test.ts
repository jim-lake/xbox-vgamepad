import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRebinds } from '../../src/popup/validate.ts';

void test('validateRebinds: valid array passes', () => {
  assert.equal(validateRebinds([{ from: 'KeyA', to: ['KeyB'] }]), true);
});

void test('validateRebinds: empty array passes', () => {
  assert.equal(validateRebinds([]), true);
});

void test('validateRebinds: empty to array is valid', () => {
  assert.equal(validateRebinds([{ from: 'KeyA', to: [] }]), true);
});

void test('validateRebinds: multiple targets valid', () => {
  assert.equal(
    validateRebinds([{ from: 'Space', to: ['Space', 'KeyU'] }]),
    true
  );
});

void test('validateRebinds: same key in from and to is valid', () => {
  assert.equal(validateRebinds([{ from: 'Space', to: ['Space'] }]), true);
});

void test('validateRebinds: Escape is valid as from', () => {
  assert.equal(validateRebinds([{ from: 'Escape', to: ['KeyA'] }]), true);
});

void test('validateRebinds: Escape is valid as to', () => {
  assert.equal(validateRebinds([{ from: 'KeyA', to: ['Escape'] }]), true);
});

void test('validateRebinds: duplicate from fails', () => {
  assert.equal(
    validateRebinds([
      { from: 'KeyA', to: ['KeyB'] },
      { from: 'KeyA', to: ['KeyC'] },
    ]),
    false
  );
});

void test('validateRebinds: non-array fails', () => {
  assert.equal(validateRebinds('not an array'), false);
});

void test('validateRebinds: entry with non-string from fails', () => {
  assert.equal(validateRebinds([{ from: 123, to: ['KeyB'] }]), false);
});

void test('validateRebinds: to not an array fails', () => {
  assert.equal(validateRebinds([{ from: 'KeyA', to: 'KeyB' }]), false);
});

void test('validateRebinds: non-string in to array fails', () => {
  assert.equal(validateRebinds([{ from: 'KeyA', to: [123] }]), false);
});
