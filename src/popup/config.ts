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
import { SENTINEL_PREFIX } from './script-helpers';
import { loadStorage, saveConfig } from './storage';

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

function emptySlotBindings(): SlotBindings {
  return Object.fromEntries(
    ALL_ACTIONS.map((a) => [a, []])
  ) as unknown as SlotBindings;
}

function emptyGlobalBindings(): GlobalBindings {
  return Object.fromEntries(
    ALL_ACTIONS.map((a) => [a, []])
  ) as unknown as GlobalBindings;
}

export function gamepadConfigToPopupConfig(cfg: GamepadConfig): PopupConfig {
  const slotBindings: [SlotBindings, SlotBindings, SlotBindings, SlotBindings] =
    [
      emptySlotBindings(),
      emptySlotBindings(),
      emptySlotBindings(),
      emptySlotBindings(),
    ];
  const globalBindings = emptyGlobalBindings();

  // Track scripts: script object → { scriptId, keyCodes per slot }
  const scriptMap = new Map<
    GameScript,
    { scriptId: string; keyCodes: string[] }
  >();
  let scriptCounter = 0;

  for (const [code, actions] of Object.entries(cfg.keyboardConfig)) {
    for (const action of actions) {
      if (action.type === 'action') {
        if (GLOBAL_ACTIONS.has(action.action)) {
          globalBindings[action.action].push(code);
        } else {
          slotBindings[action.gamepadIndex][action.action].push(code);
        }
      } else {
        const existing = scriptMap.get(action);
        if (existing) {
          if (!code.startsWith(SENTINEL_PREFIX)) {
            existing.keyCodes.push(code);
          }
        } else {
          const scriptId = `script_${String(scriptCounter++)}`;
          scriptMap.set(action, {
            scriptId,
            keyCodes: code.startsWith(SENTINEL_PREFIX) ? [] : [code],
          });
        }
      }
    }
  }

  const scripts: PopupScript[] = [];
  const scriptBindingsPerSlot: [
    ScriptBinding[],
    ScriptBinding[],
    ScriptBinding[],
    ScriptBinding[],
  ] = [[], [], [], []];

  for (const [script, { scriptId, keyCodes }] of scriptMap) {
    scripts.push({ scriptId, script });
    // Determine which slot this script targets from its first action
    const slotIndex = findScriptSlot(script);
    scriptBindingsPerSlot[slotIndex].push({ scriptId, keyCodes });
  }

  const slots: [PopupSlot, PopupSlot, PopupSlot, PopupSlot] = [0, 1, 2, 3].map(
    (i) => {
      const idx = i as 0 | 1 | 2 | 3;
      const mouseControl = cfg.mouseConfig.mouseControls.find(
        (m) => m.gamepadIndex === idx
      );
      const hasBindings =
        Object.values(slotBindings[idx]).some((codes) => codes.length > 0) ||
        mouseControl !== undefined ||
        scriptBindingsPerSlot[idx].length > 0;
      return {
        gamepadIndex: idx,
        active: hasBindings,
        bindings: slotBindings[idx],
        mouse: {
          stick: mouseControl?.stick,
          sensitivity: mouseControl?.sensitivity ?? DEFAULT_SENSITIVITY,
        },
        scriptBindings: scriptBindingsPerSlot[idx],
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

function findScriptSlot(script: GameScript): 0 | 1 | 2 | 3 {
  for (const action of script.actions) {
    if (action.type === 'down' || action.type === 'up') {
      const btn = action.buttons[0];
      if (btn) {
        return btn.gamepadIndex;
      }
    }
    if (action.type === 'loop') {
      const inner = findLoopSlot(action.actions);
      if (inner !== null) {
        return inner;
      }
    }
  }
  return 0;
}

function findLoopSlot(actions: GameScript['actions']): 0 | 1 | 2 | 3 | null {
  for (const action of actions) {
    if (action.type === 'down' || action.type === 'up') {
      const btn = action.buttons[0];
      if (btn) {
        return btn.gamepadIndex;
      }
    }
    if (action.type === 'loop') {
      const inner = findLoopSlot(action.actions);
      if (inner !== null) {
        return inner;
      }
    }
  }
  return null;
}

export function popupConfigToGamepadConfig(popup: PopupConfig): GamepadConfig {
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
  let sentinelCounter = 0;

  for (const slot of popup.slots) {
    for (const binding of slot.scriptBindings) {
      const script = scriptById.get(binding.scriptId);
      if (!script) {
        continue;
      }
      if (binding.keyCodes.length === 0) {
        // Unbound — use a sentinel key
        let sentinel = SENTINEL_PREFIX;
        while (sentinel in keyboardConfig) {
          sentinelCounter++;
          sentinel = `${SENTINEL_PREFIX}${String(sentinelCounter)}`;
        }
        keyboardConfig[sentinel] = [script];
      } else {
        for (const code of binding.keyCodes) {
          addBinding(code, script);
        }
      }
    }
  }

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
  };
}

export async function loadPopupConfig(
  configName: string
): Promise<PopupConfig> {
  const data = await loadStorage();
  const cfg = data.configs[configName] ?? DEFAULT_CONFIG;
  return gamepadConfigToPopupConfig(cfg);
}

export async function savePopupConfig(
  configName: string,
  popup: PopupConfig
): Promise<void> {
  const cfg = popupConfigToGamepadConfig(popup);
  await saveConfig(configName, cfg);
}
