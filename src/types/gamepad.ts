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

export type ActionMap = GamepadActionName | GamepadActionName[];

export type GamepadKeyboardConfig = Record<string, ActionMap>;

export interface GamepadMouseConfig {
  mouseControls?: 0 | 1 | undefined | null;
  sensitivity: number;
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

export type GamepadAction = AxisAction | ButtonAction;

export const DEFAULT_SENSITIVITY = 10;

export const DEFAULT_CONFIG: GamepadConfig = {
  mouseConfig: { mouseControls: 1, sensitivity: DEFAULT_SENSITIVITY },
  keyboardConfig: {
    Space: 'a',
    KeyB: 'b',
    Backspace: 'b',
    KeyY: 'y',
    KeyX: 'x',
    KeyQ: 'leftShoulder',
    KeyE: 'rightShoulder',
    RightClick: 'leftTrigger',
    Click: 'rightTrigger',
    BracketLeft: 'rightStickPressed',
    BracketRight: 'leftStickPressed',
    Enter: 'start',
    Tab: 'select',
    ArrowUp: 'dpadUp',
    ArrowDown: 'dpadDown',
    ArrowLeft: 'dpadLeft',
    ArrowRight: 'dpadRight',
    ShiftRight: 'leftTrigger',
    ShiftLeft: 'rightTrigger',
    KeyW: 'leftStickUp',
    KeyS: 'leftStickDown',
    KeyA: 'leftStickLeft',
    KeyD: 'leftStickRight',
    KeyO: 'rightStickUp',
    KeyL: 'rightStickDown',
    KeyK: 'rightStickLeft',
    Semicolon: 'rightStickRight',
    Backslash: 'home',
    F9: 'toggleGamepad',
  },
};
