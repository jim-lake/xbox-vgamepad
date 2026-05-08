import type {
  GamepadConfig,
  GamepadAction,
  GamepadActionName,
} from '@/types/gamepad';
import { BUTTON_MAP, Direction } from '@/types/gamepad';
import { MSG_SOURCE } from '@/types/messages';
import { AxisDirection } from './gamepad-simulator';
import * as gamepadSimulator from './gamepad-simulator';

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

function actionNameToGamepadAction(
  name: GamepadActionName
): GamepadAction | undefined {
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

function buildKeyMap(config: GamepadConfig): Map<string, GamepadAction[]> {
  const map = new Map<string, GamepadAction[]>();

  for (const [code, value] of Object.entries(config.keyboardConfig)) {
    if (code === 'Escape') {
      continue;
    }
    const names: GamepadActionName[] = Array.isArray(value) ? value : [value];
    const actions: GamepadAction[] = [];
    for (const name of names) {
      const action = actionNameToGamepadAction(name);
      if (action) {
        actions.push(action);
      }
    }
    if (actions.length > 0) {
      map.set(code, actions);
    }
  }
  return map;
}

// Module state
let g_keyMap = new Map<string, GamepadAction[]>();
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
let g_scrollActions: GamepadAction[] | null = null;

// Overlay state
let g_overlay: HTMLDivElement | null = null;
let g_minimizedBtn: HTMLDivElement | null = null;
let g_minimizedDismissed = false;
let g_overlayMinimized = false;

function getGameContainer(): Element | null {
  return document.getElementById('game-stream') ?? document.body;
}

function executePress(action: GamepadAction): void {
  if (action.type === 'button') {
    gamepadSimulator.pressButton(action.index);
  } else {
    gamepadSimulator.pressDirection(
      action.stick,
      directionToAxis[action.direction]
    );
  }
}

function executeUnpress(action: GamepadAction): void {
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

function removeOverlay(): void {
  if (g_overlay) {
    g_overlay.remove();
    g_overlay = null;
  }
}

function removeMinimized(): void {
  if (g_minimizedBtn) {
    g_minimizedBtn.remove();
    g_minimizedBtn = null;
  }
}

function showMinimizedBtn(container: Element): void {
  if (g_minimizedBtn || g_minimizedDismissed) {
    return;
  }
  g_minimizedBtn = document.createElement('div');
  g_minimizedBtn.id = 'xvg-pointer-minimized';
  g_minimizedBtn.style.cssText =
    'position:absolute;top:8px;right:8px;display:flex;align-items:center;gap:4px;background:rgba(0,0,0,0.7);color:#fff;font-size:12px;padding:4px 8px;border-radius:4px;cursor:pointer;z-index:99999;';

  const label = document.createElement('span');
  label.textContent = '🖱️';
  label.title = 'Click to enable mouse control';
  label.addEventListener('click', () => {
    removeMinimized();
    const c = getGameContainer();
    if (c) {
      void (c as HTMLElement).requestPointerLock();
      const stream = document.getElementById('game-stream');
      if (stream) {
        stream.focus();
      }
    }
  });
  g_minimizedBtn.appendChild(label);

  const closeBtn = document.createElement('span');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = 'cursor:pointer;margin-left:4px;';
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    g_minimizedDismissed = true;
    removeMinimized();
  });
  g_minimizedBtn.appendChild(closeBtn);

  container.appendChild(g_minimizedBtn);
}

function minimizeOverlay(container: Element): void {
  g_overlayMinimized = true;
  window.postMessage(
    { source: MSG_SOURCE, type: 'SET_OVERLAY_MINIMIZED', minimized: true },
    '*'
  );
  removeOverlay();
  showMinimizedBtn(container);
}

function showOverlay(container: Element): void {
  if (g_overlay) {
    return;
  }
  if (g_minimizedDismissed) {
    return;
  }
  if (g_overlayMinimized) {
    showMinimizedBtn(container);
    return;
  }

  g_overlay = document.createElement('div');
  g_overlay.id = 'xvg-pointer-overlay';
  g_overlay.style.cssText =
    'position:absolute;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);color:#fff;font-size:18px;cursor:pointer;z-index:99999;';

  const text = document.createElement('span');
  text.textContent = 'Click to enable mouse control';
  g_overlay.appendChild(text);

  const minimizeBtn = document.createElement('span');
  minimizeBtn.textContent = '—';
  minimizeBtn.style.cssText =
    'position:absolute;top:8px;right:8px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.2);border-radius:4px;font-size:14px;cursor:pointer;';
  minimizeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    minimizeOverlay(container);
  });
  g_overlay.appendChild(minimizeBtn);

  g_overlay.addEventListener('click', () => {
    const c = getGameContainer();
    if (c) {
      void (c as HTMLElement).requestPointerLock();
      const stream = document.getElementById('game-stream');
      if (stream) {
        stream.focus();
      }
    }
  });
  container.appendChild(g_overlay);
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
    g_overlayMinimized = opts.overlayMinimized;
  }
  if (opts?.resetDismissed) {
    g_minimizedDismissed = false;
  }
  if (g_active) {
    // Hot-swap: just update bindings without disconnect/reconnect
    const hadMouse = g_mouseStick !== null;
    removeListeners();
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
    gamepadSimulator.resetState();
    g_keyMap = buildKeyMap(config);
    g_sensitivity = config.mouseConfig.sensitivity || 10;
    g_mouseStick = config.mouseConfig.mouseControls ?? null;
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
  g_sensitivity = config.mouseConfig.sensitivity || 10;
  g_mouseStick = config.mouseConfig.mouseControls ?? null;
  g_active = true;

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
