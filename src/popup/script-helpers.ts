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

const isMac = navigator.userAgent.includes('Mac');

/** Format a KeyboardEvent.code or virtual mouse code for display. */
export function formatCode(code: string): string {
  if (code.startsWith('Key')) {
    return code.slice(3);
  }
  if (code.startsWith('Digit')) {
    return code.slice(5);
  }
  switch (code) {
    case 'RightClick':
      return 'Right Click';
    case 'ControlLeft':
      return 'Left Control';
    case 'ControlRight':
      return 'Right Control';
    case 'ShiftLeft':
      return 'Left Shift';
    case 'ShiftRight':
      return 'Right Shift';
    case 'AltLeft':
      return isMac ? 'Left Option' : 'Left Alt';
    case 'AltRight':
      return isMac ? 'Right Option' : 'Right Alt';
    case 'MetaLeft':
      return isMac ? 'Left Command' : 'Left Win';
    case 'MetaRight':
      return isMac ? 'Right Command' : 'Right Win';
    case 'ArrowUp':
      return '↑';
    case 'ArrowDown':
      return '↓';
    case 'ArrowLeft':
      return '←';
    case 'ArrowRight':
      return '→';
    case 'CapsLock':
      return 'Caps Lock';
    case 'PageUp':
      return 'Page Up';
    case 'PageDown':
      return 'Page Down';
    case 'NumLock':
      return 'Num Lock';
    case 'ScrollLock':
      return 'Scroll Lock';
    case 'PrintScreen':
      return 'Print Screen';
    case 'NumpadEnter':
      return 'Numpad Enter';
    case 'NumpadAdd':
      return 'Numpad +';
    case 'NumpadSubtract':
      return 'Numpad -';
    case 'NumpadMultiply':
      return 'Numpad *';
    case 'NumpadDivide':
      return 'Numpad /';
    case 'NumpadDecimal':
      return 'Numpad .';
    case 'Numpad0':
      return 'Numpad 0';
    case 'Numpad1':
      return 'Numpad 1';
    case 'Numpad2':
      return 'Numpad 2';
    case 'Numpad3':
      return 'Numpad 3';
    case 'Numpad4':
      return 'Numpad 4';
    case 'Numpad5':
      return 'Numpad 5';
    case 'Numpad6':
      return 'Numpad 6';
    case 'Numpad7':
      return 'Numpad 7';
    case 'Numpad8':
      return 'Numpad 8';
    case 'Numpad9':
      return 'Numpad 9';
    case 'BracketLeft':
      return '[';
    case 'BracketRight':
      return ']';
    case 'Backslash':
      return '\\';
    case 'Semicolon':
      return ';';
    case 'Quote':
      return "'";
    case 'Comma':
      return ',';
    case 'Period':
      return '.';
    case 'Slash':
      return '/';
    case 'Backquote':
      return '`';
    case 'Minus':
      return '-';
    case 'Equal':
      return '=';
    default:
      return code;
  }
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
