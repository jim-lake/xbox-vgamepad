import type {
  GamepadKeyboardConfig,
  GameScript,
  ScriptAction,
} from '@/types/gamepad';

/** A script extracted from keyboardConfig, with its bound key. */
export interface ScriptEntry {
  keyCode: string;
  script: GameScript;
}

export const SENTINEL_PREFIX = '__script__';

export function isSentinelKey(code: string): boolean {
  return code.startsWith(SENTINEL_PREFIX);
}

/** Returns the display key code (null for sentinel/unbound). */
export function displayKeyCode(code: string): string | null {
  return isSentinelKey(code) ? null : code;
}

/** All scripts extracted from keyboardConfig, with their bound key. */
export function extractScripts(
  keyboardConfig: GamepadKeyboardConfig
): ScriptEntry[] {
  const entries: ScriptEntry[] = [];
  for (const [code, actions] of Object.entries(keyboardConfig)) {
    for (const action of actions) {
      if (action.type === 'script') {
        entries.push({ keyCode: code, script: action });
      }
    }
  }
  return entries;
}

/** Replace a script object by reference, optionally moving it to a new key. */
export function replaceScript(
  keyboardConfig: GamepadKeyboardConfig,
  oldEntry: ScriptEntry,
  newKeyCode: string,
  newScript: GameScript
): GamepadKeyboardConfig {
  const result: GamepadKeyboardConfig = {};
  for (const [code, actions] of Object.entries(keyboardConfig)) {
    const filtered = actions.filter((a) => a !== oldEntry.script);
    if (filtered.length > 0) {
      result[code] = filtered;
    }
  }
  const existing = result[newKeyCode] ?? [];
  result[newKeyCode] = [...existing, newScript];
  return result;
}

/** Remove a script object by reference. */
export function removeScript(
  keyboardConfig: GamepadKeyboardConfig,
  entry: ScriptEntry
): GamepadKeyboardConfig {
  const result: GamepadKeyboardConfig = {};
  for (const [code, actions] of Object.entries(keyboardConfig)) {
    const filtered = actions.filter((a) => a !== entry.script);
    if (filtered.length > 0) {
      result[code] = filtered;
    }
  }
  return result;
}

/**
 * Add a new unbound script under a unique sentinel key.
 * Returns [newConfig, sentinelKey].
 */
export function addScript(
  keyboardConfig: GamepadKeyboardConfig,
  script: GameScript
): [GamepadKeyboardConfig, string] {
  let sentinel = SENTINEL_PREFIX;
  let i = 0;
  while (sentinel in keyboardConfig) {
    i++;
    sentinel = `${SENTINEL_PREFIX}${String(i)}`;
  }
  return [{ ...keyboardConfig, [sentinel]: [script] }, sentinel];
}

/** Find a free sentinel key (not already in config, or equal to ownKey). */
export function freeSentinel(
  keyboardConfig: GamepadKeyboardConfig,
  ownKey: string
): string {
  let sentinel = SENTINEL_PREFIX;
  let i = 0;
  while (sentinel in keyboardConfig && sentinel !== ownKey) {
    i++;
    sentinel = `${SENTINEL_PREFIX}${String(i)}`;
  }
  return sentinel;
}

function remapActions(
  actions: ScriptAction[],
  slotIndex: 0 | 1 | 2 | 3
): ScriptAction[] {
  return actions.map((a) => {
    if (a.type === 'down' || a.type === 'up') {
      return {
        ...a,
        buttons: a.buttons.map((b) => ({ ...b, gamepadIndex: slotIndex })),
      };
    }
    if (a.type === 'loop') {
      return { ...a, actions: remapActions(a.actions, slotIndex) };
    }
    return a;
  });
}

/** Return a copy of the script with all gamepadIndex values set to slotIndex. */
export function copyScriptForSlot(
  script: GameScript,
  slotIndex: 0 | 1 | 2 | 3
): GameScript {
  return { ...script, actions: remapActions(script.actions, slotIndex) };
}
