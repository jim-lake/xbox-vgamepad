import type {
  GamepadConfig,
  ResolvedAction,
  GamepadActionName,
} from '@/types/gamepad';
import { BUTTON_MAP, Direction } from '@/types/gamepad';
import { AxisDirection } from './gamepad-simulator';
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

function actionNameToResolvedAction(
  name: GamepadActionName
): ResolvedAction | undefined {
  if (name === 'toggleGamepad') {
    return undefined;
  }
  const buttonIndex = BUTTON_MAP[name];
  if (buttonIndex !== undefined) {
    return { type: 'button', index: buttonIndex };
  }
  const axisInfo = AXIS_ACTION_MAP[name];
  if (axisInfo) {
    return {
      type: 'axis',
      stick: axisInfo.stick,
      direction: axisInfo.direction,
    };
  }
  return undefined;
}

function buildKeyMap(config: GamepadConfig): Map<string, ResolvedAction[]> {
  const map = new Map<string, ResolvedAction[]>();

  for (const [code, entries] of Object.entries(config.keyboardConfig)) {
    if (code === 'Escape') {
      continue;
    }
    const actions: ResolvedAction[] = [];
    for (const entry of entries) {
      if (entry.type === 'script') {
        continue; // GameScript — not yet implemented
      }
      const resolved = actionNameToResolvedAction(entry.action);
      if (resolved) {
        actions.push(resolved);
      }
    }
    if (actions.length > 0) {
      map.set(code, actions);
    }
  }
  return map;
}

// Module state
let g_keyMap = new Map<string, ResolvedAction[]>();
let g_mouseStick: number | null = null;
let g_sensitivity = 10;
let g_active = false;
let g_config: GamepadConfig | null = null;

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
let g_scrollActions: ResolvedAction[] | null = null;

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

function executePress(action: ResolvedAction): void {
  if (action.type === 'button') {
    gamepadSimulator.pressButton(action.index);
  } else {
    gamepadSimulator.pressDirection(
      action.stick,
      directionToAxis[action.direction]
    );
  }
}

function executeUnpress(action: ResolvedAction): void {
  if (action.type === 'button') {
    gamepadSimulator.unpressButton(action.index);
  } else {
    gamepadSimulator.unpressDirection(
      action.stick,
      directionToAxis[action.direction]
    );
  }
}

function processMouseMovement(): void {
  g_lastMoveProcess = performance.now();
  if (g_stopTimer !== null) {
    clearTimeout(g_stopTimer);
  }
  g_stopTimer = setTimeout(() => {
    if (g_mouseStick !== null) {
      gamepadSimulator.moveStick(g_mouseStick, 0, 0);
    }
    g_stopTimer = null;
  }, MOUSE_STOP_MS);

  const x = Math.max(-1, Math.min(1, g_accX / g_sensitivity));
  const y = Math.max(-1, Math.min(1, g_accY / g_sensitivity));
  g_accX = 0;
  g_accY = 0;
  if (g_mouseStick !== null) {
    gamepadSimulator.moveStick(g_mouseStick, x, y);
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
  if (g_active) {
    // Hot-swap: just update bindings without disconnect/reconnect
    const hadMouse = g_mouseStick !== null;
    removeListeners();
    clearTimers();
    gamepadSimulator.resetState();
    gamepadSimulator.setMode(config.otherGamepadMode);
    g_keyMap = buildKeyMap(config);
    const mouseTarget = config.mouseConfig.mouseControls[0] ?? null;
    g_sensitivity = mouseTarget?.sensitivity ?? 10;
    g_mouseStick = mouseTarget ? (mouseTarget.stick === 'left' ? 0 : 1) : null;
    attachKeyboard();
    attachMouseButtons();
    if (g_mouseStick !== null) {
      attachMouseMovement();
    } else if (hadMouse) {
      exitPointerLock();
      removeOverlay();
      removeMinimized();
    }
    return;
  }
  g_keyMap = buildKeyMap(config);
  const mouseTarget = config.mouseConfig.mouseControls[0] ?? null;
  g_sensitivity = mouseTarget?.sensitivity ?? 10;
  g_mouseStick = mouseTarget ? (mouseTarget.stick === 'left' ? 0 : 1) : null;
  g_active = true;
  gamepadSimulator.setMode(config.otherGamepadMode);

  attachKeyboard();
  attachMouseButtons();
  if (g_mouseStick !== null) {
    attachMouseMovement();
  }
  gamepadSimulator.enable();
}

export function deactivate(): void {
  if (!g_active) {
    return;
  }
  removeListeners();
  exitPointerLock();
  removeOverlay();
  removeMinimized();
  gamepadSimulator.disable();
  g_active = false;
  g_keyMap.clear();
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
