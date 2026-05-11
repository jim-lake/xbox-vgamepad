import type { GamepadConfig, GamepadAction } from '@/types/gamepad';
import { BUTTON_MAP, Direction } from '@/types/gamepad';
import {
  AxisDirection,
  getSimulator,
  updateVirtualSlots,
} from './gamepad-simulator';
import * as gamepadSimulator from './gamepad-simulator';
import {
  showOverlay,
  removeOverlay,
  removeMinimized,
  setOverlayMinimized,
  setMinimizedDismissed,
} from './overlay';

const MOUSE_THROTTLE_MS = 40;
const MOUSE_STOP_MS = 50;
const SCROLL_UNPRESS_MS = 20;

const directionToAxis: Record<Direction, AxisDirection> = {
  [Direction.UP]: AxisDirection.UP,
  [Direction.DOWN]: AxisDirection.DOWN,
  [Direction.LEFT]: AxisDirection.LEFT,
  [Direction.RIGHT]: AxisDirection.RIGHT,
};

const AXIS_ACTION_MAP: Record<string, { stick: number; direction: Direction }> =
  {
    leftStickUp: { stick: 0, direction: Direction.UP },
    leftStickDown: { stick: 0, direction: Direction.DOWN },
    leftStickLeft: { stick: 0, direction: Direction.LEFT },
    leftStickRight: { stick: 0, direction: Direction.RIGHT },
    rightStickUp: { stick: 1, direction: Direction.UP },
    rightStickDown: { stick: 1, direction: Direction.DOWN },
    rightStickLeft: { stick: 1, direction: Direction.LEFT },
    rightStickRight: { stick: 1, direction: Direction.RIGHT },
  };

const TOGGLE_ACTIONS = new Set([
  'toggleGamepad',
  'toggleAllGamepads',
  'toggleExtension',
]);

function buildKeyMap(config: GamepadConfig): Map<string, GamepadAction[]> {
  const map = new Map<string, GamepadAction[]>();

  for (const [code, entries] of Object.entries(config.keyboardConfig)) {
    if (code === 'Escape') {
      continue;
    }
    const actions: GamepadAction[] = [];
    for (const entry of entries) {
      if (entry.type === 'script' || TOGGLE_ACTIONS.has(entry.action)) {
        continue;
      }
      actions.push(entry);
    }
    if (actions.length > 0) {
      map.set(code, actions);
    }
  }
  return map;
}

function getActiveGamepadIndices(config: GamepadConfig): Set<0 | 1 | 2 | 3> {
  const indices = new Set<0 | 1 | 2 | 3>();
  for (const entries of Object.values(config.keyboardConfig)) {
    for (const entry of entries) {
      if (entry.type === 'action' && !TOGGLE_ACTIONS.has(entry.action)) {
        indices.add(entry.gamepadIndex);
      }
    }
  }
  for (const mc of config.mouseConfig.mouseControls) {
    indices.add(mc.gamepadIndex);
  }
  return indices;
}

// Module state
let g_keyMap = new Map<string, GamepadAction[]>();
let g_mouseTarget: { stick: number; gamepadIndex: 0 | 1 | 2 | 3 } | null = null;
let g_sensitivity = 10;
let g_active = false;
let g_config: GamepadConfig | null = null;
let g_activeIndices = new Set<0 | 1 | 2 | 3>();

// Listeners (stored for removal)
let g_onKeyDown: ((e: KeyboardEvent) => void) | null = null;
let g_onKeyUp: ((e: KeyboardEvent) => void) | null = null;
let g_onMouseDown: ((e: MouseEvent) => void) | null = null;
let g_onMouseUp: ((e: MouseEvent) => void) | null = null;
let g_onWheel: ((e: WheelEvent) => void) | null = null;
let g_onMouseMove: ((e: MouseEvent) => void) | null = null;
let g_onPointerLockChange: (() => void) | null = null;

// Mouse movement state
let g_accX = 0;
let g_accY = 0;
let g_moveTimer: ReturnType<typeof setTimeout> | null = null;
let g_stopTimer: ReturnType<typeof setTimeout> | null = null;
let g_lastMoveProcess = 0;

// Scroll state
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

function executePress(action: GamepadAction): void {
  const sim = getSimulator(action.gamepadIndex);
  const buttonIndex = BUTTON_MAP[action.action];
  if (buttonIndex !== undefined) {
    sim.pressButton(buttonIndex);
    return;
  }
  const axisInfo = AXIS_ACTION_MAP[action.action];
  if (axisInfo) {
    sim.pressDirection(axisInfo.stick, directionToAxis[axisInfo.direction]);
  }
}

function executeUnpress(action: GamepadAction): void {
  const sim = getSimulator(action.gamepadIndex);
  const buttonIndex = BUTTON_MAP[action.action];
  if (buttonIndex !== undefined) {
    sim.unpressButton(buttonIndex);
    return;
  }
  const axisInfo = AXIS_ACTION_MAP[action.action];
  if (axisInfo) {
    sim.unpressDirection(axisInfo.stick, directionToAxis[axisInfo.direction]);
  }
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
    if (!actions) {
      return;
    }
    for (const action of actions) {
      executePress(action);
    }
    if (e.cancelable) {
      e.preventDefault();
    }
  };
  g_onKeyUp = (e: KeyboardEvent) => {
    const actions = g_keyMap.get(e.code);
    if (!actions) {
      return;
    }
    for (const action of actions) {
      executeUnpress(action);
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
    // Hot-swap: update bindings without disconnect/reconnect for existing pads
    const hadMouse = prevMouseTarget !== null;
    removeListeners();
    clearTimers();

    const newIndices = getActiveGamepadIndices(config);

    // setMode first so the interceptors know the new mode before updateVirtualSlots
    gamepadSimulator.setMode(config.otherGamepadMode);
    updateVirtualSlots(newIndices);

    // Disable pads no longer in the new config
    for (const idx of g_activeIndices) {
      if (!newIndices.has(idx)) {
        getSimulator(idx).disable(idx);
      } else {
        getSimulator(idx).resetState();
      }
    }
    // Enable pads newly added in the new config
    for (const idx of newIndices) {
      if (!g_activeIndices.has(idx)) {
        getSimulator(idx).enable(idx);
      }
    }

    g_keyMap = buildKeyMap(config);
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

  g_keyMap = buildKeyMap(config);
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
  g_activeIndices.clear();
  clearTimers();
}

export function isActive(): boolean {
  return g_active;
}

export function toggle(): void {
  if (g_active) {
    deactivate();
  } else if (g_config) {
    activate(g_config);
  }
}

/** Toggle a single virtual gamepad slot on/off. */
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

/** Toggle all virtual gamepads on/off simultaneously. */
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
