import type {
  GamepadConfig,
  GamepadKeyboardConfig,
  GamepadActionName,
  GameScript,
  GlobalSettings,
  KeyboardRebind,
  ScriptAction,
} from '@/types/gamepad';
import {
  DEFAULT_CONFIG,
  DEFAULT_SENSITIVITY,
  DEFAULT_GLOBAL_SETTINGS,
} from '@/types/gamepad';
import type {
  PopupConfig,
  PopupSlot,
  SlotBindings,
  GlobalBindings,
  PopupScript,
  ScriptBinding,
  KeyboardRemaps,
} from '@/types/popup';
import {
  loadStorage,
  saveConfig,
  deleteConfig,
  setActiveConfig,
  saveGlobalSettings,
  getGamePresets,
  mergeGamePresets,
} from './storage';
import { validateConfig } from './validate';
import { deepEqual } from '@/tools/deep_equal';
import { copyScriptForSlot, flattenScript, liftScript } from './script-helpers';
import { sendActivateConfig, sendConfigChanged } from './messaging';
import { errorLog } from '@/tools/log';

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
  return new Map(ALL_ACTIONS.map((a) => [a, []]));
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
          const arr = globalBindings.get(action.action);
          if (arr) {
            arr.push(code);
          }
        } else {
          const arr = slotBindings[action.gamepadIndex].get(action.action);
          if (arr) {
            arr.push(code);
          }
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
        [...slotBindings[idx].values()].some((codes) => codes.length > 0) ||
        mouseControl !== undefined ||
        scriptBindings.some((b) => b.keyCodes.length > 0);
      return {
        gamepadIndex: idx,
        active: hasBindings,
        bindings: slotBindings[idx],
        mouse: {
          stick: mouseControl?.stick,
          sensitivity:
            cfg.mouseSensitivity ??
            mouseControl?.sensitivity ??
            DEFAULT_SENSITIVITY,
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
    fakeFullscreen: cfg.fakeFullscreen ?? false,
    keyboardRemaps: rebindsToRemaps(cfg.keyboardRebinds ?? []),
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
    for (const [actionName, codes] of slot.bindings) {
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
  for (const [actionName, codes] of popup.globalBindings) {
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
    mouseSensitivity: popup.slots[0].mouse.sensitivity,
    otherGamepadMode: popup.otherGamepadMode,
    ...(unboundScripts.length > 0 ? { unboundScripts } : {}),
    ...(popup.fakeFullscreen ? { fakeFullscreen: true } : {}),
    keyboardRebinds: remapsToRebinds(popup.keyboardRemaps),
  };
}

export const MAX_PRESETS = 25;

export async function loadAllPopupConfigs(): Promise<{
  isEnabled: boolean;
  activeConfig: string;
  configs: Record<string, PopupConfig>;
  globalSettings: GlobalSettings;
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
    globalSettings: data.globalSettings,
  };
}

async function savePopupConfig(
  configName: string,
  popup: PopupConfig
): Promise<GamepadConfig | null> {
  const cfg = popupConfigToGamepadConfig(popup);
  if (!validateConfig(cfg)) {
    errorLog('savePopupConfig: validateConfig failed for', configName, cfg);
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

interface BackupData {
  version: 1;
  globalSettings: GlobalSettings;
  activeConfig: string;
  isEnabled: boolean;
  configs: Record<string, GamepadConfig>;
  gamePresets: Record<string, string>;
}

export async function exportAllConfigs(
  configs: Record<string, PopupConfig>,
  globalSettings: GlobalSettings,
  activeConfig: string,
  isEnabled: boolean
): Promise<string> {
  const gamepadConfigs: Record<string, GamepadConfig> = {};
  for (const [name, popup] of Object.entries(configs)) {
    gamepadConfigs[name] = popupConfigToGamepadConfig(popup);
  }
  const backup: BackupData = {
    version: 1,
    globalSettings,
    activeConfig,
    isEnabled,
    configs: gamepadConfigs,
    gamePresets: await getGamePresets(),
  };
  return JSON.stringify(backup, null, 2);
}

export async function importAllConfigs(
  raw: unknown
): Promise<{
  configs: Record<string, PopupConfig>;
  globalSettings: GlobalSettings;
} | null> {
  if (!raw || typeof raw !== 'object' || !('configs' in raw)) {
    return null;
  }
  const data = raw as Record<string, unknown>;
  const rawConfigs = data['configs'];
  if (!rawConfigs || typeof rawConfigs !== 'object') {
    return null;
  }

  const rawSettings = data['globalSettings'] as
    | Partial<GlobalSettings>
    | undefined;
  const globalSettings: GlobalSettings = {
    ...DEFAULT_GLOBAL_SETTINGS,
    ...rawSettings,
  };

  // Validate and merge configs
  const imported: Record<string, PopupConfig> = {};
  for (const [name, cfg] of Object.entries(
    rawConfigs as Record<string, unknown>
  )) {
    if (validateConfig(cfg)) {
      imported[name] = gamepadConfigToPopupConfig(cfg);
    }
  }
  if (Object.keys(imported).length === 0) {
    return null;
  }

  // Save global settings
  await saveGlobalSettings(globalSettings);

  // Save each imported config (overwrites existing, doesn't delete others)
  for (const [name, popup] of Object.entries(imported)) {
    await saveConfig(name, popupConfigToGamepadConfig(popup));
  }

  // Merge game presets (overwrites existing, doesn't delete others)
  const rawPresets = data['gamePresets'];
  if (rawPresets && typeof rawPresets === 'object') {
    await mergeGamePresets(rawPresets as Record<string, string>);
  }

  return { configs: imported, globalSettings };
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
    bindings: new Map([
      ...slot.bindings,
      [action, applyCodeOp(slot.bindings.get(action) ?? [], code, op)],
    ]),
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
    globalBindings: new Map([
      ...popup.globalBindings,
      [action, applyCodeOp(popup.globalBindings.get(action) ?? [], code, op)],
    ]),
  };
}

export function popupSetRebinds(
  popup: PopupConfig,
  rebinds: KeyboardRebind[]
): PopupConfig {
  return { ...popup, keyboardRemaps: rebindsToRemaps(rebinds) };
}

export function popupSetRemaps(
  popup: PopupConfig,
  keyboardRemaps: KeyboardRemaps
): PopupConfig {
  return { ...popup, keyboardRemaps };
}

/** Config model (from→to[]) → Popup model (target→sources[]) */
function rebindsToRemaps(rebinds: KeyboardRebind[]): KeyboardRemaps {
  const remaps: KeyboardRemaps = new Map();
  for (const { from, to } of rebinds) {
    if (from === '') {
      continue;
    }
    for (const target of to) {
      if (target === '') {
        continue;
      }
      const sources = remaps.get(target) ?? [];
      if (!sources.includes(from)) {
        sources.push(from);
      }
      remaps.set(target, sources);
    }
  }
  return remaps;
}

/** Popup model (target→sources[]) → Config model (from→to[]) */
function remapsToRebinds(remaps: KeyboardRemaps): KeyboardRebind[] {
  const map = new Map<string, string[]>();
  for (const [target, sources] of remaps) {
    for (const source of sources) {
      const existing = map.get(source) ?? [];
      if (!existing.includes(target)) {
        existing.push(target);
      }
      map.set(source, existing);
    }
  }
  return [...map.entries()].map(([from, to]) => ({ from, to }));
}

export {
  setActiveConfig,
  setEnabled,
  getGamePresets,
  setGamePreset,
  clearStorage,
  saveGlobalSettings,
} from './storage';

export const DEFAULT_POPUP: PopupConfig =
  gamepadConfigToPopupConfig(DEFAULT_CONFIG);
