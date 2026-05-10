export type GamepadActionName =
  | 'a'
  | 'b'
  | 'x'
  | 'y'
  | 'leftShoulder'
  | 'rightShoulder'
  | 'leftTrigger'
  | 'rightTrigger'
  | 'select'
  | 'start'
  | 'leftStickPressed'
  | 'rightStickPressed'
  | 'dpadUp'
  | 'dpadDown'
  | 'dpadLeft'
  | 'dpadRight'
  | 'home'
  | 'leftStickUp'
  | 'leftStickDown'
  | 'leftStickLeft'
  | 'leftStickRight'
  | 'rightStickUp'
  | 'rightStickDown'
  | 'rightStickLeft'
  | 'rightStickRight'
  | 'toggleGamepad';

export interface GamepadAction {
  type: 'action';
  gamepadIndex: 0 | 1 | 2 | 3;
  action: GamepadActionName;
}

export type ScriptAction =
  | { type: 'down'; buttons: GamepadAction[] }
  | { type: 'up'; buttons: GamepadAction[] }
  | { type: 'delay'; durationMs: number }
  | { type: 'loop'; count: number | 'infinite'; actions: ScriptAction[] };

export type GameScript = {
  type: 'script';
  activationType: 'on_down' | 'on_up' | 'toggle' | 'held';
  actions: ScriptAction[];
};

export type ActionMap = (GamepadAction | GameScript)[];

export type GamepadKeyboardConfig = Record<string, ActionMap>;

export interface MouseControlTarget {
  stick: 'left' | 'right';
  gamepadIndex: 0 | 1 | 2 | 3;
  sensitivity: number;
}

export interface GamepadMouseConfig {
  mouseControls: MouseControlTarget[];
}

export interface GamepadConfig {
  keyboardConfig: GamepadKeyboardConfig;
  mouseConfig: GamepadMouseConfig;
}

export interface StorageData {
  isEnabled: boolean;
  activeConfig: string;
  configs: Record<string, GamepadConfig>;
}

export const BUTTON_MAP: Record<string, number> = {
  a: 0,
  b: 1,
  x: 2,
  y: 3,
  leftShoulder: 4,
  rightShoulder: 5,
  leftTrigger: 6,
  rightTrigger: 7,
  select: 8,
  start: 9,
  leftStickPressed: 10,
  rightStickPressed: 11,
  dpadUp: 12,
  dpadDown: 13,
  dpadLeft: 14,
  dpadRight: 15,
  home: 16,
};

export const Direction = {
  UP: 'UP',
  DOWN: 'DOWN',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
} as const;

export type Direction = (typeof Direction)[keyof typeof Direction];

export interface AxisAction {
  type: 'axis';
  stick: number;
  direction: Direction;
}

export interface ButtonAction {
  type: 'button';
  index: number;
}

export type ResolvedAction = AxisAction | ButtonAction;

export const CONFIG_PREFIX = 'GP_CONF:';

export const DEFAULT_SENSITIVITY = 101;

export const DEFAULT_CONFIG: GamepadConfig = {
  mouseConfig: {
    mouseControls: [
      { stick: 'right', gamepadIndex: 0, sensitivity: DEFAULT_SENSITIVITY },
    ],
  },
  keyboardConfig: {
    Space: [{ type: 'action', gamepadIndex: 0, action: 'a' }],
    KeyB: [{ type: 'action', gamepadIndex: 0, action: 'b' }],
    Backspace: [{ type: 'action', gamepadIndex: 0, action: 'b' }],
    KeyY: [{ type: 'action', gamepadIndex: 0, action: 'y' }],
    KeyX: [{ type: 'action', gamepadIndex: 0, action: 'x' }],
    KeyQ: [{ type: 'action', gamepadIndex: 0, action: 'leftShoulder' }],
    KeyE: [{ type: 'action', gamepadIndex: 0, action: 'rightShoulder' }],
    RightClick: [{ type: 'action', gamepadIndex: 0, action: 'leftTrigger' }],
    Click: [{ type: 'action', gamepadIndex: 0, action: 'rightTrigger' }],
    BracketLeft: [
      { type: 'action', gamepadIndex: 0, action: 'leftStickPressed' },
    ],
    BracketRight: [
      { type: 'action', gamepadIndex: 0, action: 'rightStickPressed' },
    ],
    Enter: [{ type: 'action', gamepadIndex: 0, action: 'start' }],
    Tab: [{ type: 'action', gamepadIndex: 0, action: 'select' }],
    ArrowUp: [{ type: 'action', gamepadIndex: 0, action: 'dpadUp' }],
    ArrowDown: [{ type: 'action', gamepadIndex: 0, action: 'dpadDown' }],
    ArrowLeft: [{ type: 'action', gamepadIndex: 0, action: 'dpadLeft' }],
    ArrowRight: [{ type: 'action', gamepadIndex: 0, action: 'dpadRight' }],
    ShiftRight: [{ type: 'action', gamepadIndex: 0, action: 'rightTrigger' }],
    ShiftLeft: [{ type: 'action', gamepadIndex: 0, action: 'leftTrigger' }],
    KeyW: [{ type: 'action', gamepadIndex: 0, action: 'leftStickUp' }],
    KeyS: [{ type: 'action', gamepadIndex: 0, action: 'leftStickDown' }],
    KeyA: [{ type: 'action', gamepadIndex: 0, action: 'leftStickLeft' }],
    KeyD: [{ type: 'action', gamepadIndex: 0, action: 'leftStickRight' }],
    KeyO: [{ type: 'action', gamepadIndex: 0, action: 'rightStickUp' }],
    KeyL: [{ type: 'action', gamepadIndex: 0, action: 'rightStickDown' }],
    KeyK: [{ type: 'action', gamepadIndex: 0, action: 'rightStickLeft' }],
    Semicolon: [{ type: 'action', gamepadIndex: 0, action: 'rightStickRight' }],
    Backslash: [{ type: 'action', gamepadIndex: 0, action: 'home' }],
    F8: [{ type: 'action', gamepadIndex: 0, action: 'toggleGamepad' }],
  },
};
