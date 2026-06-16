import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  exportPopupConfig,
  parseImportedConfig,
} from '../../src/popup/config.ts';
import type { GamepadConfig } from '../../src/types/gamepad.ts';
import type { PopupConfig } from '../../src/types/popup.ts';

void test('round-trip: keyboardRebinds single target survives', () => {
  const cfg: GamepadConfig = {
    keyboardConfig: {
      Space: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
    },
    mouseConfig: { mouseControls: [] },
    keyboardRebinds: [{ from: 'KeyZ', to: ['Space'] }],
  };
  const popup = parseImportedConfig(cfg) as PopupConfig;
  // Popup model: target 'Space' has source 'KeyZ'
  assert.deepEqual(popup.keyboardRemaps, { Space: ['KeyZ'] });
  const exported = JSON.parse(exportPopupConfig(popup)) as GamepadConfig;
  assert.deepEqual(exported.keyboardRebinds, [{ from: 'KeyZ', to: ['Space'] }]);
});

void test('round-trip: multiple targets from one source', () => {
  const cfg: GamepadConfig = {
    keyboardConfig: {
      Space: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
    },
    mouseConfig: { mouseControls: [] },
    keyboardRebinds: [{ from: 'KeyZ', to: ['Space', 'KeyU'] }],
  };
  const popup = parseImportedConfig(cfg) as PopupConfig;
  // Popup model: both targets have KeyZ as source
  assert.deepEqual(popup.keyboardRemaps['Space'], ['KeyZ']);
  assert.deepEqual(popup.keyboardRemaps['KeyU'], ['KeyZ']);
  const exported = JSON.parse(exportPopupConfig(popup)) as GamepadConfig;
  // Should produce one rebind entry with both targets
  const rebinds1 = exported.keyboardRebinds;
  assert.ok(rebinds1);
  assert.equal(rebinds1.length, 1);
  const rebind1 = rebinds1[0];
  assert.ok(rebind1);
  assert.equal(rebind1.from, 'KeyZ');
  assert.deepEqual(rebind1.to.sort(), ['KeyU', 'Space']);
});

void test('round-trip: same source key in multiple targets merges', () => {
  const cfg: GamepadConfig = {
    keyboardConfig: {
      Space: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
    },
    mouseConfig: { mouseControls: [] },
    // Space fires itself AND KeyU — user presses Space, gets Space + KeyU
    keyboardRebinds: [{ from: 'Space', to: ['Space', 'KeyU'] }],
  };
  const popup = parseImportedConfig(cfg) as PopupConfig;
  assert.deepEqual(popup.keyboardRemaps['Space'], ['Space']);
  assert.deepEqual(popup.keyboardRemaps['KeyU'], ['Space']);
  const exported2 = JSON.parse(exportPopupConfig(popup)) as GamepadConfig;
  const rebinds2 = exported2.keyboardRebinds;
  assert.ok(rebinds2);
  assert.equal(rebinds2.length, 1);
  const rebind2 = rebinds2[0];
  assert.ok(rebind2);
  assert.equal(rebind2.from, 'Space');
  assert.deepEqual(rebind2.to.sort(), ['KeyU', 'Space']);
});

void test('round-trip: missing keyboardRebinds defaults to empty', () => {
  const cfg: GamepadConfig = {
    keyboardConfig: {
      Space: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
    },
    mouseConfig: { mouseControls: [] },
  };
  const popup = parseImportedConfig(cfg) as PopupConfig;
  assert.deepEqual(popup.keyboardRemaps, {});
});

void test('round-trip: empty remaps produces empty rebinds', () => {
  const cfg: GamepadConfig = {
    keyboardConfig: {
      Space: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
    },
    mouseConfig: { mouseControls: [] },
    keyboardRebinds: [],
  };
  const popup = parseImportedConfig(cfg) as PopupConfig;
  assert.deepEqual(popup.keyboardRemaps, {});
  const exported = JSON.parse(exportPopupConfig(popup)) as GamepadConfig;
  assert.deepEqual(exported.keyboardRebinds, []);
});
