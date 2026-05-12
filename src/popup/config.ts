import type {
  GamepadConfig,
  GamepadKeyboardConfig,
  GamepadActionName,
  GameScript,
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
import { copyScriptForSlot } from './script-helpers';
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
  for (const a of script.actions) {
    if ((a.type === 'down' || a.type === 'up') && a.buttons[0]) {
      return a.buttons[0].gamepadIndex;
    }
  }
  return 0;
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
    const normalized = copyScriptForSlot(script, 0);
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
    scripts.push({ scriptId, script: normalizedScript });
    scriptKeyCodes.set(scriptId, keyCodesBySlot);
  }

  for (const script of cfg.unboundScripts ?? []) {
    const scriptId = `script_${String(scriptCounter++)}`;
    scripts.push({ scriptId, script: copyScriptForSlot(script, 0) });
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
      const slotScript = copyScriptForSlot(script, slot.gamepadIndex);
      for (const code of binding.keyCodes) {
        addBinding(code, slotScript);
      }
    }
  }

  const unboundScripts = popup.scripts
    .filter((s) => !boundScriptIds.has(s.scriptId))
    .map((s) => s.script);

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

export async function savePopupConfig(
  configName: string,
  popup: PopupConfig
): Promise<void> {
  const cfg = popupConfigToGamepadConfig(popup);
  if (!validateConfig(cfg)) {
    return;
  }
  await saveConfig(configName, cfg);
}

export async function saveAndBroadcast(
  configName: string,
  popup: PopupConfig,
  isEnabled: boolean
): Promise<void> {
  const cfg = popupConfigToGamepadConfig(popup);
  if (!validateConfig(cfg)) {
    return;
  }
  await saveConfig(configName, cfg);
  if (isEnabled) {
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
  await saveConfig(newName, popupConfigToGamepadConfig(popup));
  await setActiveConfig(newName);
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

export {
  setActiveConfig,
  setEnabled,
  getGameName,
  clearStorage,
} from './storage';

export const DEFAULT_POPUP: PopupConfig =
  gamepadConfigToPopupConfig(DEFAULT_CONFIG);
