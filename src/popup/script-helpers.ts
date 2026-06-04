import type {
  GamepadKeyboardConfig,
  GameScript,
  ScriptAction,
} from '@/types/gamepad';
import type {
  HoldAction,
  PopupGameScript,
  PopupScriptAction,
  SuspendAction,
  TapAction,
  TurboAction,
} from '@/types/popup';

/** A script extracted from keyboardConfig, with its bound keys. */
export interface ScriptEntry {
  keyCodes: string[];
  script: PopupGameScript;
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

/** All scripts extracted from keyboardConfig, with their bound keys. */
export function extractScripts(
  keyboardConfig: GamepadKeyboardConfig
): ScriptEntry[] {
  const map = new Map<GameScript, ScriptEntry>();
  for (const [code, actions] of Object.entries(keyboardConfig)) {
    for (const action of actions) {
      if (action.type === 'script') {
        const existing = map.get(action);
        if (existing) {
          existing.keyCodes.push(code);
        } else {
          map.set(action, { keyCodes: [code], script: action });
        }
      }
    }
  }
  const entries = [...map.values()];
  for (const entry of entries) {
    entry.keyCodes.sort((a, b) => a.localeCompare(b));
  }
  return entries.sort((a, b) => a.script.name.localeCompare(b.script.name));
}

/** Replace a script, moving it to new keyCodes. */
export function replaceScript(
  keyboardConfig: GamepadKeyboardConfig,
  oldEntry: ScriptEntry,
  newKeyCodes: string[],
  newScript: GameScript
): GamepadKeyboardConfig {
  const result: GamepadKeyboardConfig = {};
  for (const [code, actions] of Object.entries(keyboardConfig)) {
    const filtered = actions.filter((a) => a !== oldEntry.script);
    if (filtered.length > 0) {
      result[code] = filtered;
    }
  }
  for (const code of newKeyCodes) {
    const existing = result[code] ?? [];
    result[code] = [...existing, newScript];
  }
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

/**
 * Returns true if the action list is effectively infinite — i.e. it contains
 * a forever loop, or a finite loop whose child actions are themselves infinite.
 * Note: bare `delay "infinite"` is not counted here — it's detected separately
 * by `firstInfiniteIndex` at the top level only.
 */
export function isInfiniteActions(actions: PopupScriptAction[]): boolean {
  for (const a of actions) {
    if (a.type === 'turbo') {
      return true;
    }
    if (a.type === 'hold' || a.type === 'suspend') {
      return true;
    }
    if (a.type === 'loop') {
      if (a.count === 'infinite' || isInfiniteActions(a.actions)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Returns the index of the first action that makes the list infinite
 * (a forever loop, a delay "infinite", hold, suspend, or a finite loop
 * with infinite children), or -1 if none.
 */
export function firstInfiniteIndex(actions: PopupScriptAction[]): number {
  for (let i = 0; i < actions.length; i++) {
    const a = actions[i];
    if (a?.type === 'turbo') {
      return i;
    }
    if (a?.type === 'suspend') {
      return i;
    }
    if (a?.type === 'delay' && a.durationMs === 'infinite') {
      return i;
    }
    if (
      a?.type === 'loop' &&
      (a.count === 'infinite' || isInfiniteActions(a.actions))
    ) {
      return i;
    }
  }
  return -1;
}

function remapActions(
  actions: PopupScriptAction[],
  slotIndex: 0 | 1 | 2 | 3
): PopupScriptAction[] {
  return actions.map((a) => {
    if (a.type === 'down' || a.type === 'up') {
      return {
        ...a,
        buttons: a.buttons.map((b) => ({ ...b, gamepadIndex: slotIndex })),
      };
    }
    if (a.type === 'tap') {
      return {
        ...a,
        buttons: a.buttons.map((b) => ({ ...b, gamepadIndex: slotIndex })),
      };
    }
    if (a.type === 'turbo') {
      return {
        ...a,
        buttons: a.buttons.map((b) => ({ ...b, gamepadIndex: slotIndex })),
      };
    }
    if (a.type === 'hold') {
      return {
        ...a,
        buttons: a.buttons.map((b) => ({ ...b, gamepadIndex: slotIndex })),
      };
    }
    if (a.type === 'point') {
      return { ...a, gamepadIndex: slotIndex };
    }
    if (a.type === 'rotate') {
      return { ...a, gamepadIndex: slotIndex };
    }
    if (a.type === 'loop') {
      return { ...a, actions: remapActions(a.actions, slotIndex) };
    }
    return a;
  });
}

/** Return a copy of the script with all gamepadIndex values set to slotIndex. */
export function copyScriptForSlot(
  script: PopupGameScript,
  slotIndex: 0 | 1 | 2 | 3
): PopupGameScript {
  return { ...script, actions: remapActions(script.actions, slotIndex) };
}

/** Expand PopupScriptAction[] to ScriptAction[], flattening tap, turbo, hold, and suspend nodes. */
export function flattenActions(actions: PopupScriptAction[]): ScriptAction[] {
  const result: ScriptAction[] = [];
  for (const a of actions) {
    if (a.type === 'tap') {
      result.push(
        { type: 'down', buttons: a.buttons },
        { type: 'delay', durationMs: a.durationMs },
        { type: 'up', buttons: a.buttons }
      );
    } else if (a.type === 'turbo') {
      const half = Math.round(a.speed / 2);
      result.push({
        type: 'loop',
        count: 'infinite',
        actions: [
          { type: 'down', buttons: a.buttons },
          { type: 'delay', durationMs: half },
          { type: 'up', buttons: a.buttons },
          { type: 'delay', durationMs: half },
        ],
      });
    } else if (a.type === 'hold') {
      result.push({ type: 'down', buttons: a.buttons });
      // Trailing delay "infinite" is added after all actions are processed
    } else if (a.type === 'suspend') {
      result.push({ type: 'delay', durationMs: 'infinite' });
    } else if (a.type === 'loop') {
      result.push({ ...a, actions: flattenActions(a.actions) });
    } else {
      result.push(a);
    }
  }
  // If any hold actions were present, ensure trailing delay "infinite"
  const hasHold = actions.some((a) => a.type === 'hold');
  if (hasHold) {
    // Only add if there isn't already a trailing delay "infinite"
    const last = result[result.length - 1];
    if (!(last?.type === 'delay' && last.durationMs === 'infinite')) {
      result.push({ type: 'delay', durationMs: 'infinite' });
    }
  }
  return result;
}

/** Collapse ScriptAction[] to PopupScriptAction[], lifting tap, turbo, hold, and suspend sequences. */
export function liftActions(actions: ScriptAction[]): PopupScriptAction[] {
  // First check for hold/suspend pattern: trailing delay "infinite"
  const last = actions[actions.length - 1];
  if (last?.type === 'delay' && last.durationMs === 'infinite') {
    // Find unmatched downs (no corresponding up at this level)
    const actionsWithoutTrailing = actions.slice(0, -1);
    const unmatchedDownIndices = findUnmatchedDowns(actionsWithoutTrailing);

    if (unmatchedDownIndices.size > 0) {
      // Lift with hold: unmatched downs become hold, trailing delay consumed
      const result: PopupScriptAction[] = [];
      let i = 0;
      while (i < actionsWithoutTrailing.length) {
        const a = actionsWithoutTrailing[i];
        const b = actionsWithoutTrailing[i + 1];
        const c = actionsWithoutTrailing[i + 2];
        // Tap detection (only for matched downs)
        if (
          a?.type === 'down' &&
          !unmatchedDownIndices.has(i) &&
          a.buttons.length > 0 &&
          b?.type === 'delay' &&
          b.durationMs !== 'infinite' &&
          c?.type === 'up' &&
          a.buttons.length === c.buttons.length &&
          a.buttons.every((btn, j) => {
            const cBtn = c.buttons[j];
            return (
              cBtn !== undefined &&
              btn.action === cBtn.action &&
              btn.gamepadIndex === cBtn.gamepadIndex
            );
          })
        ) {
          const tap: TapAction = {
            type: 'tap',
            buttons: a.buttons,
            durationMs: b.durationMs,
          };
          result.push(tap);
          i += 3;
        } else if (a?.type === 'down' && unmatchedDownIndices.has(i)) {
          const hold: HoldAction = { type: 'hold', buttons: a.buttons };
          result.push(hold);
          i++;
        } else if (a?.type === 'loop') {
          // Detect turbo pattern
          if (a.count === 'infinite' && a.actions.length === 4) {
            const [la, lb, lc, ld] = a.actions;
            if (
              la?.type === 'down' &&
              lb?.type === 'delay' &&
              lb.durationMs !== 'infinite' &&
              lc?.type === 'up' &&
              ld?.type === 'delay' &&
              ld.durationMs !== 'infinite' &&
              lb.durationMs === ld.durationMs &&
              la.buttons.length > 0 &&
              la.buttons.length === lc.buttons.length &&
              la.buttons.every((btn, j) => {
                const cBtn = lc.buttons[j];
                return (
                  cBtn !== undefined &&
                  btn.action === cBtn.action &&
                  btn.gamepadIndex === cBtn.gamepadIndex
                );
              })
            ) {
              const turbo: TurboAction = {
                type: 'turbo',
                buttons: la.buttons,
                speed: lb.durationMs * 2,
              };
              result.push(turbo);
              i++;
              continue;
            }
          }
          result.push({ ...a, actions: liftActions(a.actions) });
          i++;
        } else if (a !== undefined) {
          result.push(a);
          i++;
        } else {
          i++;
        }
      }
      return result;
    } else {
      // No unmatched downs — lift trailing delay as suspend
      const result = liftActionsBasic(actionsWithoutTrailing);
      const suspend: SuspendAction = { type: 'suspend' };
      result.push(suspend);
      return result;
    }
  }

  return liftActionsBasic(actions);
}

/** Find indices of down actions that have no matching up at the same level. */
function findUnmatchedDowns(actions: ScriptAction[]): Set<number> {
  const downIndices: number[] = [];
  const matchedDownIndices = new Set<number>();

  for (let i = 0; i < actions.length; i++) {
    const a = actions[i];
    if (a?.type === 'down') {
      downIndices.push(i);
    } else if (a?.type === 'up') {
      // Find if any prior down has all its buttons matched by this up
      for (const di of downIndices) {
        if (matchedDownIndices.has(di)) {
          continue;
        }
        const downAction = actions[di];
        if (downAction?.type !== 'down') {
          continue;
        }
        if (
          downAction.buttons.length === a.buttons.length &&
          downAction.buttons.every((btn, j) => {
            const uBtn = a.buttons[j];
            return (
              uBtn !== undefined &&
              btn.action === uBtn.action &&
              btn.gamepadIndex === uBtn.gamepadIndex
            );
          })
        ) {
          matchedDownIndices.add(di);
          break;
        }
      }
    }
  }

  const unmatched = new Set<number>();
  for (const di of downIndices) {
    if (!matchedDownIndices.has(di)) {
      unmatched.add(di);
    }
  }
  return unmatched;
}

/** Basic lift without hold/suspend detection (used as inner helper). */
function liftActionsBasic(actions: ScriptAction[]): PopupScriptAction[] {
  const result: PopupScriptAction[] = [];
  let i = 0;
  while (i < actions.length) {
    const a = actions[i];
    const b = actions[i + 1];
    const c = actions[i + 2];
    if (
      a?.type === 'down' &&
      a.buttons.length > 0 &&
      b?.type === 'delay' &&
      b.durationMs !== 'infinite' &&
      c?.type === 'up' &&
      a.buttons.length === c.buttons.length &&
      a.buttons.every((btn, j) => {
        const cBtn = c.buttons[j];
        return (
          cBtn !== undefined &&
          btn.action === cBtn.action &&
          btn.gamepadIndex === cBtn.gamepadIndex
        );
      })
    ) {
      const tap: TapAction = {
        type: 'tap',
        buttons: a.buttons,
        durationMs: b.durationMs,
      };
      result.push(tap);
      i += 3;
    } else if (a?.type === 'loop') {
      // Detect turbo pattern: infinite loop with [down, delay, up, delay]
      if (a.count === 'infinite' && a.actions.length === 4) {
        const [la, lb, lc, ld] = a.actions;
        if (
          la?.type === 'down' &&
          lb?.type === 'delay' &&
          lb.durationMs !== 'infinite' &&
          lc?.type === 'up' &&
          ld?.type === 'delay' &&
          ld.durationMs !== 'infinite' &&
          lb.durationMs === ld.durationMs &&
          la.buttons.length > 0 &&
          la.buttons.length === lc.buttons.length &&
          la.buttons.every((btn, j) => {
            const cBtn = lc.buttons[j];
            return (
              cBtn !== undefined &&
              btn.action === cBtn.action &&
              btn.gamepadIndex === cBtn.gamepadIndex
            );
          })
        ) {
          const turbo: TurboAction = {
            type: 'turbo',
            buttons: la.buttons,
            speed: lb.durationMs * 2,
          };
          result.push(turbo);
          i++;
          continue;
        }
      }
      result.push({ ...a, actions: liftActions(a.actions) });
      i++;
    } else if (a !== undefined) {
      result.push(a);
      i++;
    } else {
      i++;
    }
  }
  return result;
}

/** Flatten a PopupGameScript to a plain GameScript for storage. */
export function flattenScript(script: PopupGameScript): GameScript {
  return { ...script, actions: flattenActions(script.actions) };
}

/** Lift a plain GameScript to a PopupGameScript for the UI. */
export function liftScript(script: GameScript): PopupGameScript {
  return { ...script, actions: liftActions(script.actions) };
}
