import type { GamepadConfig, GamepadAction } from '@/types/gamepad';
import { BUTTON_MAP, Direction } from '@/types/gamepad';
import { MSG_SOURCE } from '@/types/messages';
import { gamepadSimulator, AxisDirection } from './gamepad-simulator';

const MOUSE_THROTTLE_MS = 40;
const MOUSE_STOP_MS = 50;
const SCROLL_UNPRESS_MS = 20;

const directionToAxis: Record<Direction, AxisDirection> = {
  [Direction.UP]: AxisDirection.UP,
  [Direction.DOWN]: AxisDirection.DOWN,
  [Direction.LEFT]: AxisDirection.LEFT,
  [Direction.RIGHT]: AxisDirection.RIGHT,
};

function parseAxisField(
  field: string
): { stick: number; direction: Direction } | null {
  let stick: number;
  let suffix: string;
  if (field.startsWith('leftStick') && field !== 'leftStickPressed') {
    stick = 0;
    suffix = field.slice('leftStick'.length);
  } else if (field.startsWith('rightStick') && field !== 'rightStickPressed') {
    stick = 1;
    suffix = field.slice('rightStick'.length);
  } else {
    return null;
  }
  const dirMap: Record<string, Direction> = {
    Up: Direction.UP,
    Down: Direction.DOWN,
    Left: Direction.LEFT,
    Right: Direction.RIGHT,
  };
  const dir = dirMap[suffix];
  if (dir === undefined) {
    return null;
  }
  return { stick, direction: dir };
}

function buildKeyMap(config: GamepadConfig): Map<string, GamepadAction[]> {
  const map = new Map<string, GamepadAction[]>();
  const keyConfig = config.keyConfig;

  for (const [field, value] of Object.entries(keyConfig) as [
    string,
    string | string[] | undefined,
  ][]) {
    if (value === undefined) {
      continue;
    }
    const codes: string[] = Array.isArray(value) ? value : [value];
    for (const code of codes) {
      if (code === 'Escape') {
        continue;
      }
      let action: GamepadAction | undefined;
      if (field === 'toggleGamepad') {
        continue;
      }
      const buttonIndex = BUTTON_MAP[field];
      if (buttonIndex !== undefined) {
        action = { type: 'button', index: buttonIndex };
      } else {
        const axisInfo = parseAxisField(field);
        if (axisInfo) {
          action = {
            type: 'axis',
            stick: axisInfo.stick,
            direction: axisInfo.direction,
          };
        }
      }
      if (action) {
        const existing = map.get(code);
        if (existing) {
          existing.push(action);
        } else {
          map.set(code, [action]);
        }
      }
    }
  }
  return map;
}

class InputProcessor {
  private keyMap = new Map<string, GamepadAction[]>();
  private mouseStick: number | null = null;
  private sensitivity = 10;
  private active = false;
  private config: GamepadConfig | null = null;

  // Listeners (stored for removal)
  private onKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private onKeyUp: ((e: KeyboardEvent) => void) | null = null;
  private onMouseDown: ((e: MouseEvent) => void) | null = null;
  private onMouseUp: ((e: MouseEvent) => void) | null = null;
  private onWheel: ((e: WheelEvent) => void) | null = null;
  private onMouseMove: ((e: MouseEvent) => void) | null = null;
  private onPointerLockChange: (() => void) | null = null;

  // Mouse movement state
  private accX = 0;
  private accY = 0;
  private moveTimer: ReturnType<typeof setTimeout> | null = null;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;
  private lastMoveProcess = 0;

  // Scroll state
  private scrollTimer: ReturnType<typeof setTimeout> | null = null;
  private scrollActions: GamepadAction[] | null = null;

  // Overlay element
  private overlay: HTMLDivElement | null = null;
  private minimizedBtn: HTMLDivElement | null = null;
  private _minimizedDismissed = false;
  private overlayMinimized = false;

  activate(config: GamepadConfig, opts?: { overlayMinimized?: boolean }): void {
    this.config = config;
    if (opts?.overlayMinimized !== undefined) {
      this.overlayMinimized = opts.overlayMinimized;
    }
    if (this.active) {
      // Hot-swap: just update bindings without disconnect/reconnect
      const hadMouse = this.mouseStick !== null;
      this.removeListeners();
      if (this.scrollTimer !== null) {
        clearTimeout(this.scrollTimer);
        this.scrollTimer = null;
      }
      if (this.moveTimer !== null) {
        clearTimeout(this.moveTimer);
        this.moveTimer = null;
      }
      if (this.stopTimer !== null) {
        clearTimeout(this.stopTimer);
        this.stopTimer = null;
      }
      gamepadSimulator.resetState();
      this.keyMap = buildKeyMap(config);
      this.sensitivity = config.mouseConfig.sensitivity || 10;
      this.mouseStick = config.mouseConfig.mouseControls ?? null;
      this.attachKeyboard();
      this.attachMouseButtons();
      if (this.mouseStick !== null) {
        this.attachMouseMovement();
      } else if (hadMouse) {
        // Switching from mouse-enabled to mouse-disabled: clean up overlay/pointer lock
        this.exitPointerLock();
        this.removeOverlay();
        this.removeMinimized();
      }
      return;
    }
    this.keyMap = buildKeyMap(config);
    this.sensitivity = config.mouseConfig.sensitivity || 10;
    this.mouseStick = config.mouseConfig.mouseControls ?? null;
    this.active = true;

    this.attachKeyboard();
    this.attachMouseButtons();
    if (this.mouseStick !== null) {
      this.attachMouseMovement();
    }
    gamepadSimulator.enable();
  }

  deactivate(): void {
    if (!this.active) {
      return;
    }
    this.removeListeners();
    this.exitPointerLock();
    this.removeOverlay();
    this.removeMinimized();
    gamepadSimulator.disable();
    this.active = false;
    this.keyMap.clear();
    if (this.scrollTimer !== null) {
      clearTimeout(this.scrollTimer);
      this.scrollTimer = null;
    }
    if (this.moveTimer !== null) {
      clearTimeout(this.moveTimer);
      this.moveTimer = null;
    }
    if (this.stopTimer !== null) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
  }

  isActive(): boolean {
    return this.active;
  }

  toggle(): void {
    if (this.active) {
      this.deactivate();
    } else if (this.config) {
      this.activate(this.config);
    }
  }

  private attachKeyboard(): void {
    this.onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) {
        return;
      }
      const actions = this.keyMap.get(e.code);
      if (!actions) {
        return;
      }
      for (const action of actions) {
        this.executePress(action);
      }
      if (e.cancelable) {
        e.preventDefault();
      }
    };
    this.onKeyUp = (e: KeyboardEvent) => {
      const actions = this.keyMap.get(e.code);
      if (!actions) {
        return;
      }
      for (const action of actions) {
        this.executeUnpress(action);
      }
    };
    document.addEventListener('keydown', this.onKeyDown, true);
    document.addEventListener('keyup', this.onKeyUp, true);
  }

  private attachMouseButtons(): void {
    const hasClick = this.keyMap.has('Click');
    const hasRightClick = this.keyMap.has('RightClick');
    const hasScroll = this.keyMap.has('Scroll');

    const container = this.getGameContainer();
    if (!container) {
      return;
    }

    if (hasClick || hasRightClick) {
      this.onMouseDown = (e: MouseEvent) => {
        const code =
          e.button === 0 ? 'Click' : e.button === 2 ? 'RightClick' : null;
        if (!code) {
          return;
        }
        const actions = this.keyMap.get(code);
        if (actions) {
          for (const action of actions) {
            this.executePress(action);
          }
        }
      };
      this.onMouseUp = (e: MouseEvent) => {
        const code =
          e.button === 0 ? 'Click' : e.button === 2 ? 'RightClick' : null;
        if (!code) {
          return;
        }
        const actions = this.keyMap.get(code);
        if (actions) {
          for (const action of actions) {
            this.executeUnpress(action);
          }
        }
      };
      container.addEventListener(
        'mousedown',
        this.onMouseDown as EventListener,
        true
      );
      container.addEventListener(
        'mouseup',
        this.onMouseUp as EventListener,
        true
      );
    }

    if (hasScroll) {
      this.scrollActions = this.keyMap.get('Scroll') ?? null;
      this.onWheel = (e: WheelEvent) => {
        if (!this.scrollActions) {
          return;
        }
        for (const action of this.scrollActions) {
          this.executePress(action);
        }
        if (this.scrollTimer !== null) {
          clearTimeout(this.scrollTimer);
        }
        this.scrollTimer = setTimeout(() => {
          if (this.scrollActions) {
            for (const action of this.scrollActions) {
              this.executeUnpress(action);
            }
          }
          this.scrollTimer = null;
        }, SCROLL_UNPRESS_MS);
        if (e.cancelable) {
          e.preventDefault();
        }
      };
      container.addEventListener('wheel', this.onWheel as EventListener, {
        capture: true,
        passive: false,
      });
    }
  }

  private attachMouseMovement(): void {
    const container = this.getGameContainer();
    if (!container) {
      return;
    }
    this.showOverlay(container);

    this.onPointerLockChange = () => {
      if (document.pointerLockElement === this.getGameContainer()) {
        this.removeOverlay();
        this.removeMinimized();
        this.startMouseListening();
      } else {
        this.stopMouseListening();
        const c = this.getGameContainer();
        if (c) {
          this.showOverlay(c);
        }
      }
    };
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
  }

  private startMouseListening(): void {
    this.onMouseMove = (e: MouseEvent) => {
      this.accX += e.movementX;
      this.accY += e.movementY;
      const now = performance.now();
      if (now - this.lastMoveProcess >= MOUSE_THROTTLE_MS) {
        this.processMouseMovement();
      } else if (this.moveTimer === null) {
        this.moveTimer = setTimeout(
          () => {
            this.moveTimer = null;
            this.processMouseMovement();
          },
          MOUSE_THROTTLE_MS - (now - this.lastMoveProcess)
        );
      }
    };
    document.addEventListener('mousemove', this.onMouseMove);
  }

  private stopMouseListening(): void {
    if (this.onMouseMove) {
      document.removeEventListener('mousemove', this.onMouseMove);
      this.onMouseMove = null;
    }
  }

  private processMouseMovement(): void {
    this.lastMoveProcess = performance.now();
    if (this.stopTimer !== null) {
      clearTimeout(this.stopTimer);
    }
    this.stopTimer = setTimeout(() => {
      if (this.mouseStick !== null) {
        gamepadSimulator.moveStick(this.mouseStick, 0, 0);
      }
      this.stopTimer = null;
    }, MOUSE_STOP_MS);

    const x = Math.max(-1, Math.min(1, this.accX / this.sensitivity));
    const y = Math.max(-1, Math.min(1, this.accY / this.sensitivity));
    this.accX = 0;
    this.accY = 0;
    if (this.mouseStick !== null) {
      gamepadSimulator.moveStick(this.mouseStick, x, y);
    }
  }

  private showOverlay(container: Element): void {
    if (this.overlay) {
      return;
    }
    // If user dismissed for this session, show nothing
    if (this._minimizedDismissed) {
      return;
    }
    // If user previously minimized, go straight to minimized button
    if (this.overlayMinimized) {
      this.showMinimizedBtn(container);
      return;
    }

    this.overlay = document.createElement('div');
    this.overlay.id = 'xvg-pointer-overlay';
    this.overlay.style.cssText =
      'position:absolute;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);color:#fff;font-size:18px;cursor:pointer;z-index:99999;';

    const text = document.createElement('span');
    text.textContent = 'Click to enable mouse control';
    this.overlay.appendChild(text);

    // Minimize button (upper right)
    const minimizeBtn = document.createElement('span');
    minimizeBtn.textContent = '—';
    minimizeBtn.style.cssText =
      'position:absolute;top:8px;right:8px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.2);border-radius:4px;font-size:14px;cursor:pointer;';
    minimizeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.minimizeOverlay(container);
    });
    this.overlay.appendChild(minimizeBtn);

    this.overlay.addEventListener('click', () => {
      const c = this.getGameContainer();
      if (c) {
        void (c as HTMLElement).requestPointerLock();
        const stream = document.getElementById('game-stream');
        if (stream) {
          stream.focus();
        }
      }
    });
    container.appendChild(this.overlay);
  }

  private minimizeOverlay(container: Element): void {
    this.overlayMinimized = true;
    window.postMessage(
      { source: MSG_SOURCE, type: 'SET_OVERLAY_MINIMIZED', minimized: true },
      '*'
    );
    this.removeOverlay();
    this.showMinimizedBtn(container);
  }

  private showMinimizedBtn(container: Element): void {
    if (this.minimizedBtn || this._minimizedDismissed) {
      return;
    }
    this.minimizedBtn = document.createElement('div');
    this.minimizedBtn.id = 'xvg-pointer-minimized';
    this.minimizedBtn.style.cssText =
      'position:absolute;top:8px;right:8px;display:flex;align-items:center;gap:4px;background:rgba(0,0,0,0.7);color:#fff;font-size:12px;padding:4px 8px;border-radius:4px;cursor:pointer;z-index:99999;';

    const label = document.createElement('span');
    label.textContent = '🖱️';
    label.title = 'Click to enable mouse control';
    label.addEventListener('click', () => {
      this.removeMinimized();
      const c = this.getGameContainer();
      if (c) {
        void (c as HTMLElement).requestPointerLock();
        const stream = document.getElementById('game-stream');
        if (stream) {
          stream.focus();
        }
      }
    });
    this.minimizedBtn.appendChild(label);

    const closeBtn = document.createElement('span');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'cursor:pointer;margin-left:4px;';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._minimizedDismissed = true;
      this.removeMinimized();
    });
    this.minimizedBtn.appendChild(closeBtn);

    container.appendChild(this.minimizedBtn);
  }

  private removeMinimized(): void {
    if (this.minimizedBtn) {
      this.minimizedBtn.remove();
      this.minimizedBtn = null;
    }
  }

  private removeOverlay(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  private exitPointerLock(): void {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  private removeListeners(): void {
    if (this.onKeyDown) {
      document.removeEventListener('keydown', this.onKeyDown, true);
      this.onKeyDown = null;
    }
    if (this.onKeyUp) {
      document.removeEventListener('keyup', this.onKeyUp, true);
      this.onKeyUp = null;
    }
    const container = this.getGameContainer();
    if (container) {
      if (this.onMouseDown) {
        container.removeEventListener(
          'mousedown',
          this.onMouseDown as EventListener,
          true
        );
      }
      if (this.onMouseUp) {
        container.removeEventListener(
          'mouseup',
          this.onMouseUp as EventListener,
          true
        );
      }
      if (this.onWheel) {
        container.removeEventListener(
          'wheel',
          this.onWheel as EventListener,
          true
        );
      }
    }
    this.onMouseDown = null;
    this.onMouseUp = null;
    this.onWheel = null;
    if (this.onPointerLockChange) {
      document.removeEventListener(
        'pointerlockchange',
        this.onPointerLockChange
      );
      this.onPointerLockChange = null;
    }
    this.stopMouseListening();
  }

  private executePress(action: GamepadAction): void {
    if (action.type === 'button') {
      gamepadSimulator.pressButton(action.index);
    } else {
      gamepadSimulator.pressDirection(
        action.stick,
        directionToAxis[action.direction]
      );
    }
  }

  private executeUnpress(action: GamepadAction): void {
    if (action.type === 'button') {
      gamepadSimulator.unpressButton(action.index);
    } else {
      gamepadSimulator.unpressDirection(
        action.stick,
        directionToAxis[action.direction]
      );
    }
  }

  private getGameContainer(): Element | null {
    return document.getElementById('game-stream') ?? document.body;
  }
}

export const inputProcessor = new InputProcessor();
