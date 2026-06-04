import type {
  GamepadConfig,
  GamepadAction,
  GameScript,
  ScriptAction,
} from '@/types/gamepad';
import { MSG_SOURCE } from '@/types/messages';
import { getSimulator, updateVirtualSlots } from './gamepad-simulator';
import * as gamepadSimulator from './gamepad-simulator';
import { executePress, executeUnpress } from './script-actions';
import { ScriptManager } from './script-runner';
import {
  showOverlay,
  removeOverlay,
  removeMinimized,
  setOverlayMinimized,
  setMinimizedDismissed,
  restoreIfDismissed,
} from './overlay';

const MOUSE_THROTTLE_MS = 40;
const MOUSE_STOP_MS = 50;
const SCROLL_UNPRESS_MS = 20;

function onScriptCountChange(count: number): void {
  window.postMessage({ source: MSG_SOURCE, type: 'SCRIPT_COUNT', count }, '*');
}

const TOGGLE_ACTIONS = new Set([
  'toggleGamepad',
  'toggleAllGamepads',
  'toggleExtension',
]);

function buildKeyMap(config: GamepadConfig): {
  keyMap: Map<string, GamepadAction[]>;
  scriptMap: Map<string, GameScript[]>;
} {
  const keyMap = new Map<string, GamepadAction[]>();
  const scriptMap = new Map<string, GameScript[]>();

  for (const [code, entries] of Object.entries(config.keyboardConfig)) {
    if (code === 'Escape') {
      continue;
    }
    const actions: GamepadAction[] = [];
    const scripts: GameScript[] = [];
    for (const entry of entries) {
      if (entry.type === 'script') {
        scripts.push(entry);
      } else if (!TOGGLE_ACTIONS.has(entry.action)) {
        actions.push(entry);
      }
    }
    if (actions.length > 0) {
      keyMap.set(code, actions);
    }
    if (scripts.length > 0) {
      scriptMap.set(code, scripts);
    }
  }
  return { keyMap, scriptMap };
}

function collectScriptIndices(
  actions: ScriptAction[],
  indices: Set<0 | 1 | 2 | 3>
): void {
  for (const step of actions) {
    if (step.type === 'down' || step.type === 'up') {
      for (const btn of step.buttons) {
        indices.add(btn.gamepadIndex);
      }
    } else if (step.type === 'point' || step.type === 'rotate') {
      indices.add(step.gamepadIndex);
    } else if (step.type === 'loop') {
      collectScriptIndices(step.actions, indices);
    }
  }
}

function getActiveGamepadIndices(config: GamepadConfig): Set<0 | 1 | 2 | 3> {
  const indices = new Set<0 | 1 | 2 | 3>();
  for (const entries of Object.values(config.keyboardConfig)) {
    for (const entry of entries) {
      if (entry.type === 'action' && !TOGGLE_ACTIONS.has(entry.action)) {
        indices.add(entry.gamepadIndex);
      } else if (entry.type === 'script') {
        collectScriptIndices(entry.actions, indices);
      }
    }
  }
  for (const mc of config.mouseConfig.mouseControls) {
    indices.add(mc.gamepadIndex);
  }
  return indices;
}

let g_keyMap = new Map<string, GamepadAction[]>();
let g_scriptMap = new Map<string, GameScript[]>();
let g_scriptManager = new ScriptManager(onScriptCountChange);
let g_mouseTarget: { stick: number; gamepadIndex: 0 | 1 | 2 | 3 } | null = null;
let g_sensitivity = 10;
let g_active = false;
let g_config: GamepadConfig | null = null;
let g_activeIndices = new Set<0 | 1 | 2 | 3>();

let g_onKeyDown: ((e: KeyboardEvent) => void) | null = null;
let g_onKeyUp: ((e: KeyboardEvent) => void) | null = null;
let g_onMouseDown: ((e: MouseEvent) => void) | null = null;
let g_onMouseUp: ((e: MouseEvent) => void) | null = null;
let g_onWheel: ((e: WheelEvent) => void) | null = null;
let g_onMouseMove: ((e: MouseEvent) => void) | null = null;
let g_onPointerLockChange: (() => void) | null = null;

let g_accX = 0;
let g_accY = 0;
let g_moveTimer: ReturnType<typeof setTimeout> | null = null;
let g_stopTimer: ReturnType<typeof setTimeout> | null = null;
let g_lastMoveProcess = 0;

let g_scrollTimer: ReturnType<typeof setTimeout> | null = null;
let g_scrollActions: GamepadAction[] | null = null;

function clearTimers(): void {
  if (g_scrollTimer !== null) {
    clearTimeout(g_scrollTimer);
    g_scrollTimer = null;
  }
  if (g_moveTimer !== null) {
    clearTimeout(g_moveTimer);
    g_moveTimer = null;
  }
  if (g_stopTimer !== null) {
    clearTimeout(g_stopTimer);
    g_stopTimer = null;
  }
}

function getGameContainer(): Element | null {
  return document.getElementById('game-stream') ?? document.body;
}

function processMouseMovement(): void {
  g_lastMoveProcess = performance.now();
  if (g_stopTimer !== null) {
    clearTimeout(g_stopTimer);
  }
  g_stopTimer = setTimeout(() => {
    if (g_mouseTarget !== null) {
      getSimulator(g_mouseTarget.gamepadIndex).moveStick(
        g_mouseTarget.stick,
        0,
        0
      );
    }
    g_stopTimer = null;
  }, MOUSE_STOP_MS);

  const x = Math.max(-1, Math.min(1, g_accX / g_sensitivity));
  const y = Math.max(-1, Math.min(1, g_accY / g_sensitivity));
  g_accX = 0;
  g_accY = 0;
  if (g_mouseTarget !== null) {
    getSimulator(g_mouseTarget.gamepadIndex).moveStick(
      g_mouseTarget.stick,
      x,
      y
    );
  }
}

function startMouseListening(): void {
  g_onMouseMove = (e: MouseEvent) => {
    g_accX += e.movementX;
    g_accY += e.movementY;
    const now = performance.now();
    if (now - g_lastMoveProcess >= MOUSE_THROTTLE_MS) {
      processMouseMovement();
    } else if (g_moveTimer === null) {
      g_moveTimer = setTimeout(
        () => {
          g_moveTimer = null;
          processMouseMovement();
        },
        MOUSE_THROTTLE_MS - (now - g_lastMoveProcess)
      );
    }
  };
  document.addEventListener('mousemove', g_onMouseMove);
}

function stopMouseListening(): void {
  if (g_onMouseMove) {
    document.removeEventListener('mousemove', g_onMouseMove);
    g_onMouseMove = null;
  }
}

function exitPointerLock(): void {
  if (document.pointerLockElement) {
    document.exitPointerLock();
  }
}

function attachMouseMovement(): void {
  const container = getGameContainer();
  if (!container) {
    return;
  }
  showOverlay(container);

  g_onPointerLockChange = () => {
    if (document.pointerLockElement === getGameContainer()) {
      removeOverlay();
      removeMinimized();
      startMouseListening();
    } else {
      stopMouseListening();
      const c = getGameContainer();
      if (c) {
        showOverlay(c);
      }
    }
  };
  document.addEventListener('pointerlockchange', g_onPointerLockChange);
}

function attachMouseButtons(): void {
  const hasClick = g_keyMap.has('Click');
  const hasRightClick = g_keyMap.has('RightClick');
  const hasScroll = g_keyMap.has('Scroll');

  const container = getGameContainer();
  if (!container) {
    return;
  }

  if (hasClick || hasRightClick) {
    g_onMouseDown = (e: MouseEvent) => {
      const code =
        e.button === 0 ? 'Click' : e.button === 2 ? 'RightClick' : null;
      if (!code) {
        return;
      }
      const actions = g_keyMap.get(code);
      if (actions) {
        for (const action of actions) {
          executePress(action);
        }
      }
    };
    g_onMouseUp = (e: MouseEvent) => {
      const code =
        e.button === 0 ? 'Click' : e.button === 2 ? 'RightClick' : null;
      if (!code) {
        return;
      }
      const actions = g_keyMap.get(code);
      if (actions) {
        for (const action of actions) {
          executeUnpress(action);
        }
      }
    };
    container.addEventListener(
      'mousedown',
      g_onMouseDown as EventListener,
      true
    );
    container.addEventListener('mouseup', g_onMouseUp as EventListener, true);
  }

  if (hasScroll) {
    g_scrollActions = g_keyMap.get('Scroll') ?? null;
    g_onWheel = (e: WheelEvent) => {
      if (!g_scrollActions) {
        return;
      }
      for (const action of g_scrollActions) {
        executePress(action);
      }
      if (g_scrollTimer !== null) {
        clearTimeout(g_scrollTimer);
      }
      g_scrollTimer = setTimeout(() => {
        if (g_scrollActions) {
          for (const action of g_scrollActions) {
            executeUnpress(action);
          }
        }
        g_scrollTimer = null;
      }, SCROLL_UNPRESS_MS);
      if (e.cancelable) {
        e.preventDefault();
      }
    };
    container.addEventListener('wheel', g_onWheel as EventListener, {
      capture: true,
      passive: false,
    });
  }
}

function attachKeyboard(): void {
  g_onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) {
      return;
    }
    const actions = g_keyMap.get(e.code);
    if (actions) {
      for (const action of actions) {
        executePress(action);
      }
    }
    const scripts = g_scriptMap.get(e.code);
    if (scripts) {
      for (let i = 0; i < scripts.length; i++) {
        const script = scripts[i];
        if (script) {
          g_scriptManager.onKeyDown(`${e.code}:${String(i)}`, script);
        }
      }
    }
    if ((actions ?? scripts) && e.cancelable) {
      e.preventDefault();
    }
  };
  g_onKeyUp = (e: KeyboardEvent) => {
    const actions = g_keyMap.get(e.code);
    if (actions) {
      for (const action of actions) {
        executeUnpress(action);
      }
    }
    const scripts = g_scriptMap.get(e.code);
    if (scripts) {
      for (let i = 0; i < scripts.length; i++) {
        const script = scripts[i];
        if (script) {
          g_scriptManager.onKeyUp(`${e.code}:${String(i)}`, script);
        }
      }
    }
  };
  document.addEventListener('keydown', g_onKeyDown, true);
  document.addEventListener('keyup', g_onKeyUp, true);
}

function removeListeners(): void {
  if (g_onKeyDown) {
    document.removeEventListener('keydown', g_onKeyDown, true);
    g_onKeyDown = null;
  }
  if (g_onKeyUp) {
    document.removeEventListener('keyup', g_onKeyUp, true);
    g_onKeyUp = null;
  }
  const container = getGameContainer();
  if (container) {
    if (g_onMouseDown) {
      container.removeEventListener(
        'mousedown',
        g_onMouseDown as EventListener,
        true
      );
    }
    if (g_onMouseUp) {
      container.removeEventListener(
        'mouseup',
        g_onMouseUp as EventListener,
        true
      );
    }
    if (g_onWheel) {
      container.removeEventListener('wheel', g_onWheel as EventListener, true);
    }
  }
  g_onMouseDown = null;
  g_onMouseUp = null;
  g_onWheel = null;
  if (g_onPointerLockChange) {
    document.removeEventListener('pointerlockchange', g_onPointerLockChange);
    g_onPointerLockChange = null;
  }
  stopMouseListening();
}

export function activate(
  config: GamepadConfig,
  opts?: { overlayMinimized?: boolean; resetDismissed?: boolean }
): void {
  g_config = config;
  if (opts?.overlayMinimized !== undefined) {
    setOverlayMinimized(opts.overlayMinimized);
  }
  if (opts?.resetDismissed) {
    setMinimizedDismissed(false);
  }

  const prevMouseTarget = g_mouseTarget;
  const mouseTarget = config.mouseConfig.mouseControls[0] ?? null;
  g_sensitivity = mouseTarget?.sensitivity ?? 10;
  g_mouseTarget = mouseTarget
    ? {
        stick: mouseTarget.stick === 'left' ? 0 : 1,
        gamepadIndex: mouseTarget.gamepadIndex,
      }
    : null;

  if (g_active) {
    const hadMouse = prevMouseTarget !== null;
    removeListeners();
    clearTimers();

    const newIndices = getActiveGamepadIndices(config);

    gamepadSimulator.setMode(config.otherGamepadMode);
    updateVirtualSlots(newIndices);

    for (const idx of g_activeIndices) {
      if (!newIndices.has(idx)) {
        getSimulator(idx).disable(idx);
      } else {
        getSimulator(idx).resetState();
      }
    }
    for (const idx of newIndices) {
      if (!g_activeIndices.has(idx)) {
        getSimulator(idx).enable(idx);
      }
    }

    g_scriptManager.cancelAll();
    const built = buildKeyMap(config);
    g_keyMap = built.keyMap;
    g_scriptMap = built.scriptMap;
    g_scriptManager = new ScriptManager(onScriptCountChange);
    g_activeIndices = newIndices;
    attachKeyboard();
    attachMouseButtons();
    if (g_mouseTarget !== null) {
      attachMouseMovement();
    } else if (hadMouse) {
      exitPointerLock();
      removeOverlay();
      removeMinimized();
    }
    return;
  }

  const built = buildKeyMap(config);
  g_keyMap = built.keyMap;
  g_scriptMap = built.scriptMap;
  g_scriptManager = new ScriptManager(onScriptCountChange);
  g_activeIndices = getActiveGamepadIndices(config);
  g_active = true;
  gamepadSimulator.setMode(config.otherGamepadMode);
  updateVirtualSlots(g_activeIndices);
  attachKeyboard();
  attachMouseButtons();
  if (g_mouseTarget !== null) {
    attachMouseMovement();
  }

  for (const idx of g_activeIndices) {
    getSimulator(idx).enable(idx);
  }
}

export function deactivate(): void {
  if (!g_active) {
    return;
  }
  g_scriptManager.cancelAll();
  removeListeners();
  exitPointerLock();
  removeOverlay();
  removeMinimized();
  for (const idx of g_activeIndices) {
    getSimulator(idx).disable(idx);
  }
  updateVirtualSlots(new Set());
  g_active = false;
  g_keyMap.clear();
  g_scriptMap.clear();
  g_activeIndices.clear();
  clearTimers();
}

export function isActive(): boolean {
  return g_active;
}

export function restoreOverlayIfDismissed(): void {
  if (g_active && g_mouseTarget !== null) {
    restoreIfDismissed();
  }
}

export function toggle(): void {
  if (g_active) {
    deactivate();
  } else if (g_config) {
    activate(g_config);
  }
}

export function reactivate(): void {
  if (g_config) {
    activate(g_config);
  }
}

export function suspend(): void {
  if (!g_active) {
    return;
  }
  g_scriptManager.cancelAll();
  removeListeners();
  exitPointerLock();
  removeOverlay();
  removeMinimized();
  for (const idx of g_activeIndices) {
    getSimulator(idx).resetState();
  }
  clearTimers();
}

export function resume(): void {
  if (!g_active || !g_config) {
    return;
  }
  activate(g_config);
}

export function toggleGamepadIndex(index: 0 | 1 | 2 | 3): void {
  const sim = getSimulator(index);
  if (sim.isEnabled()) {
    sim.disable(index);
    g_activeIndices.delete(index);
  } else {
    sim.enable(index);
    g_activeIndices.add(index);
  }
}

export function getConnectedStatus(): [boolean, boolean, boolean, boolean] {
  return [
    getSimulator(0).isEnabled(),
    getSimulator(1).isEnabled(),
    getSimulator(2).isEnabled(),
    getSimulator(3).isEnabled(),
  ];
}

export function toggleAllGamepads(): void {
  const anyEnabled = Array.from(g_activeIndices).some((i) =>
    getSimulator(i).isEnabled()
  );
  if (anyEnabled) {
    for (const idx of g_activeIndices) {
      getSimulator(idx).disable(idx);
    }
  } else if (g_config) {
    for (const idx of g_activeIndices) {
      getSimulator(idx).enable(idx);
    }
  }
}
