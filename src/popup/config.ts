import type {
  GamepadConfig,
  GamepadKeyboardConfig,
  GamepadActionName,
  GameScript,
  ScriptAction,
} from '@/types/gamepad';
import { DEFAULT_CONFIG, DEFAULT_SENSITIVITY } from '@/types/gamepad';
import type {
  PopupConfig,
  PopupSlot,
  SlotBindings,
  GlobalBindings,
  PopupScript,
  ScriptBinding,
} from '@/types/popup';
import {
  loadStorage,
  saveConfig,
  deleteConfig,
  setActiveConfig,
} from './storage';
import { validateConfig } from './validate';
import { deepEqual } from '@/tools/deep_equal';
import { copyScriptForSlot, flattenScript, liftScript } from './script-helpers';
import { sendActivateConfig, sendConfigChanged } from './messaging';

const GLOBAL_ACTIONS = new Set<GamepadActionName>([
  'toggleAllGamepads',
  'toggleExtension',
]);

const ALL_ACTIONS: GamepadActionName[] = [
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
];

function emptyBindings(): SlotBindings {
  return Object.fromEntries(
    ALL_ACTIONS.map((a) => [a, []])
  ) as unknown as SlotBindings;
}

function getScriptSlot(script: GameScript): 0 | 1 | 2 | 3 {
  function findSlot(actions: ScriptAction[]): 0 | 1 | 2 | 3 | null {
    for (const a of actions) {
      if ((a.type === 'down' || a.type === 'up') && a.buttons[0]) {
        return a.buttons[0].gamepadIndex;
      }
      if (a.type === 'loop') {
        const found = findSlot(a.actions);
        if (found !== null) {
          return found;
        }
      }
    }
    return null;
  }
  return findSlot(script.actions) ?? 0;
}

function gamepadConfigToPopupConfig(cfg: GamepadConfig): PopupConfig {
  const slotBindings: [SlotBindings, SlotBindings, SlotBindings, SlotBindings] =
    [emptyBindings(), emptyBindings(), emptyBindings(), emptyBindings()];
  const globalBindings: GlobalBindings = emptyBindings();

  // Track scripts: normalized (slot-0) script → { scriptId, keyCodes per slot }
  const scriptMap = new Map<
    GameScript,
    { scriptId: string; keyCodesBySlot: Map<0 | 1 | 2 | 3, string[]> }
  >();
  let scriptCounter = 0;

  function findOrAddScript(script: GameScript): {
    scriptId: string;
    keyCodesBySlot: Map<0 | 1 | 2 | 3, string[]>;
  } {
    const normalized = flattenScript(copyScriptForSlot(liftScript(script), 0));
    for (const [key, entry] of scriptMap) {
      if (deepEqual(key, normalized)) {
        return entry;
      }
    }
    const entry = {
      scriptId: `script_${String(scriptCounter++)}`,
      keyCodesBySlot: new Map(),
    };
    scriptMap.set(normalized, entry);
    return entry;
  }

  for (const [code, actions] of Object.entries(cfg.keyboardConfig)) {
    for (const action of actions) {
      if (action.type === 'action') {
        if (GLOBAL_ACTIONS.has(action.action)) {
          globalBindings[action.action].push(code);
        } else {
          slotBindings[action.gamepadIndex][action.action].push(code);
        }
      } else {
        const slotIndex = getScriptSlot(action);
        const entry = findOrAddScript(action);
        const existing = entry.keyCodesBySlot.get(slotIndex) ?? [];
        entry.keyCodesBySlot.set(slotIndex, [...existing, code]);
      }
    }
  }

  const scripts: PopupScript[] = [];
  const scriptKeyCodes = new Map<string, Map<0 | 1 | 2 | 3, string[]>>();

  for (const [normalizedScript, { scriptId, keyCodesBySlot }] of scriptMap) {
    scripts.push({ scriptId, script: liftScript(normalizedScript) });
    scriptKeyCodes.set(scriptId, keyCodesBySlot);
  }

  for (const script of cfg.unboundScripts ?? []) {
    const scriptId = `script_${String(scriptCounter++)}`;
    scripts.push({
      scriptId,
      script: copyScriptForSlot(liftScript(script), 0),
    });
  }

  const slots: [PopupSlot, PopupSlot, PopupSlot, PopupSlot] = [0, 1, 2, 3].map(
    (i) => {
      const idx = i as 0 | 1 | 2 | 3;
      const mouseControl = cfg.mouseConfig.mouseControls.find(
        (m) => m.gamepadIndex === idx
      );
      const scriptBindings: ScriptBinding[] = scripts.map(({ scriptId }) => ({
        scriptId,
        keyCodes: scriptKeyCodes.get(scriptId)?.get(idx) ?? [],
      }));
      const hasBindings =
        Object.values(slotBindings[idx]).some((codes) => codes.length > 0) ||
        mouseControl !== undefined ||
        scriptBindings.some((b) => b.keyCodes.length > 0);
      return {
        gamepadIndex: idx,
        active: hasBindings,
        bindings: slotBindings[idx],
        mouse: {
          stick: mouseControl?.stick,
          sensitivity: mouseControl?.sensitivity ?? DEFAULT_SENSITIVITY,
        },
        scriptBindings,
      };
    }
  ) as [PopupSlot, PopupSlot, PopupSlot, PopupSlot];

  return {
    slots,
    scripts,
    globalBindings,
    otherGamepadMode: cfg.otherGamepadMode ?? 'separate',
  };
}

function popupConfigToGamepadConfig(popup: PopupConfig): GamepadConfig {
  const keyboardConfig: GamepadKeyboardConfig = {};

  function addBinding(
    code: string,
    action: GamepadKeyboardConfig[string][number]
  ) {
    const existing = keyboardConfig[code] ?? [];
    keyboardConfig[code] = [...existing, action];
  }

  // Slot bindings
  for (const slot of popup.slots) {
    for (const [actionName, codes] of Object.entries(slot.bindings) as [
      GamepadActionName,
      string[],
    ][]) {
      for (const code of codes) {
        addBinding(code, {
          type: 'action' as const,
          gamepadIndex: slot.gamepadIndex,
          action: actionName,
        });
      }
    }
  }

  // Global bindings
  for (const [actionName, codes] of Object.entries(popup.globalBindings) as [
    GamepadActionName,
    string[],
  ][]) {
    for (const code of codes) {
      addBinding(code, {
        type: 'action' as const,
        gamepadIndex: 0 as const,
        action: actionName,
      });
    }
  }

  // Scripts
  const scriptById = new Map(popup.scripts.map((s) => [s.scriptId, s.script]));
  const boundScriptIds = new Set<string>();

  for (const slot of popup.slots) {
    for (const binding of slot.scriptBindings) {
      const script = scriptById.get(binding.scriptId);
      if (!script || binding.keyCodes.length === 0) {
        continue;
      }
      boundScriptIds.add(binding.scriptId);
      const slotScript = flattenScript(
        copyScriptForSlot(script, slot.gamepadIndex)
      );
      for (const code of binding.keyCodes) {
        addBinding(code, slotScript);
      }
    }
  }

  const unboundScripts = popup.scripts
    .filter((s) => !boundScriptIds.has(s.scriptId))
    .map((s) => flattenScript(s.script));

  const mouseControls = popup.slots
    .filter((s) => s.mouse.stick !== undefined)
    .map((s) => ({
      stick: s.mouse.stick as 'left' | 'right',
      gamepadIndex: s.gamepadIndex,
      sensitivity: s.mouse.sensitivity,
    }));

  return {
    keyboardConfig,
    mouseConfig: { mouseControls },
    otherGamepadMode: popup.otherGamepadMode,
    ...(unboundScripts.length > 0 ? { unboundScripts } : {}),
  };
}

export const MAX_PRESETS = 25;

export async function loadAllPopupConfigs(): Promise<{
  isEnabled: boolean;
  activeConfig: string;
  configs: Record<string, PopupConfig>;
}> {
  const data = await loadStorage();
  return {
    isEnabled: data.isEnabled,
    activeConfig: data.activeConfig,
    configs: Object.fromEntries(
      Object.entries(data.configs).map(([k, v]) => [
        k,
        gamepadConfigToPopupConfig(v),
      ])
    ),
  };
}

async function savePopupConfig(
  configName: string,
  popup: PopupConfig
): Promise<GamepadConfig | null> {
  const cfg = popupConfigToGamepadConfig(popup);
  if (!validateConfig(cfg)) {
    return null;
  }
  await saveConfig(configName, cfg);
  return cfg;
}

export async function saveAndBroadcastPopupConfig(
  configName: string,
  popup: PopupConfig
): Promise<void> {
  const cfg = await savePopupConfig(configName, popup);
  if (cfg) {
    await sendConfigChanged(configName, cfg);
  }
}

export async function activatePopupConfig(
  configName: string,
  popup: PopupConfig
): Promise<void> {
  await sendActivateConfig(configName, popupConfigToGamepadConfig(popup));
}

export async function broadcastPopupConfig(
  configName: string,
  popup: PopupConfig
): Promise<void> {
  await sendConfigChanged(configName, popupConfigToGamepadConfig(popup));
}

export async function renamePopupConfig(
  oldName: string,
  newName: string,
  popup: PopupConfig
): Promise<void> {
  await deleteConfig(oldName);
  await savePopupConfig(newName, popup);
  await setActiveConfig(newName);
}

export async function deletePopupConfig(name: string): Promise<void> {
  await deleteConfig(name);
}

export function parseImportedConfig(raw: unknown): PopupConfig | null {
  if (!validateConfig(raw)) {
    return null;
  }
  return gamepadConfigToPopupConfig(raw);
}

export function exportPopupConfig(popup: PopupConfig): string {
  return JSON.stringify(popupConfigToGamepadConfig(popup), null, 2);
}

// ── PopupConfig mutation helpers ─────────────────────────────────────────────

function patchSlot(
  popup: PopupConfig,
  idx: 0 | 1 | 2 | 3,
  patch: Partial<Omit<PopupSlot, 'gamepadIndex'>>
): PopupConfig {
  const slots = [...popup.slots] as PopupConfig['slots'];
  slots[idx] = { ...slots[idx], ...patch };
  return { ...popup, slots };
}

function emptySlot(idx: 0 | 1 | 2 | 3, sensitivity: number): PopupSlot {
  return {
    gamepadIndex: idx,
    active: false,
    bindings: emptyBindings(),
    mouse: { stick: undefined, sensitivity },
    scriptBindings: [],
  };
}

function applyCodeOp(
  codes: string[],
  code: string,
  op: 'add' | 'remove'
): string[] {
  return op === 'add'
    ? [...codes.filter((c) => c !== code), code]
    : codes.filter((c) => c !== code);
}

export function popupAddSlot(popup: PopupConfig): PopupConfig {
  const next = ([0, 1, 2, 3] as const).find((i) => !popup.slots[i].active);
  return next !== undefined ? patchSlot(popup, next, { active: true }) : popup;
}

export function popupRemoveSlot(
  popup: PopupConfig,
  idx: 0 | 1 | 2 | 3
): PopupConfig {
  const removedIds = new Set(
    popup.slots[idx].scriptBindings.map((b) => b.scriptId)
  );
  return {
    ...patchSlot(
      popup,
      idx,
      emptySlot(idx, popup.slots[idx].mouse.sensitivity)
    ),
    scripts: popup.scripts.filter((s) => !removedIds.has(s.scriptId)),
  };
}

export function popupMoveSlot(
  popup: PopupConfig,
  fromIdx: 0 | 1 | 2 | 3,
  toIdx: 0 | 1 | 2 | 3
): PopupConfig {
  const src = popup.slots[fromIdx];
  const slots = [...popup.slots] as PopupConfig['slots'];
  slots[toIdx] = { ...src, gamepadIndex: toIdx };
  slots[fromIdx] = emptySlot(fromIdx, src.mouse.sensitivity);
  return { ...popup, slots };
}

export function popupSetBinding(
  popup: PopupConfig,
  slotIdx: 0 | 1 | 2 | 3,
  action: GamepadActionName,
  code: string,
  op: 'add' | 'remove'
): PopupConfig {
  const slot = popup.slots[slotIdx];
  return patchSlot(popup, slotIdx, {
    bindings: {
      ...slot.bindings,
      [action]: applyCodeOp(slot.bindings[action], code, op),
    },
  });
}

export function popupSetScripts(
  popup: PopupConfig,
  slotIdx: 0 | 1 | 2 | 3,
  scriptBindings: ScriptBinding[],
  scripts: PopupScript[]
): PopupConfig {
  return { ...patchSlot(popup, slotIdx, { scriptBindings }), scripts };
}

export function popupSetMouse(
  popup: PopupConfig,
  slotIdx: 0 | 1 | 2 | 3,
  patch: Partial<PopupSlot['mouse']>
): PopupConfig {
  return patchSlot(popup, slotIdx, {
    mouse: { ...popup.slots[slotIdx].mouse, ...patch },
  });
}

export function popupSetGlobalBinding(
  popup: PopupConfig,
  action: GamepadActionName,
  code: string,
  op: 'add' | 'remove'
): PopupConfig {
  return {
    ...popup,
    globalBindings: {
      ...popup.globalBindings,
      [action]: applyCodeOp(popup.globalBindings[action], code, op),
    },
  };
}

export {
  setActiveConfig,
  setEnabled,
  getGameName,
  getGamePresets,
  setGamePreset,
  clearStorage,
} from './storage';

export const DEFAULT_POPUP: PopupConfig =
  gamepadConfigToPopupConfig(DEFAULT_CONFIG);
