export type KeyMap = string | string[] | undefined;

export interface GamepadKeyConfig {
  a?: KeyMap;
  b?: KeyMap;
  x?: KeyMap;
  y?: KeyMap;
  leftShoulder?: KeyMap;
  rightShoulder?: KeyMap;
  leftTrigger?: KeyMap;
  rightTrigger?: KeyMap;
  select?: KeyMap;
  start?: KeyMap;
  leftStickPressed?: KeyMap;
  rightStickPressed?: KeyMap;
  dpadUp?: KeyMap;
  dpadDown?: KeyMap;
  dpadLeft?: KeyMap;
  dpadRight?: KeyMap;
  home?: KeyMap;
  leftStickUp?: KeyMap;
  leftStickDown?: KeyMap;
  leftStickLeft?: KeyMap;
  leftStickRight?: KeyMap;
  rightStickUp?: KeyMap;
  rightStickDown?: KeyMap;
  rightStickLeft?: KeyMap;
  rightStickRight?: KeyMap;
  toggleGamepad?: KeyMap;
}

export interface GamepadMouseConfig {
  mouseControls?: 0 | 1 | undefined | null;
  sensitivity: number;
}

export interface GamepadConfig {
  keyConfig: GamepadKeyConfig;
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
  keyConfig: {
    a: 'Space',
    b: ['ControlLeft', 'Backspace'],
    x: 'KeyR',
    y: ['KeyV', 'Scroll'],
    leftShoulder: ['KeyC', 'KeyG'],
    rightShoulder: 'KeyQ',
    leftTrigger: 'RightClick',
    rightTrigger: 'Click',
    start: 'Enter',
    select: 'Tab',
    home: undefined,
    dpadUp: ['ArrowUp', 'KeyX'],
    dpadDown: ['ArrowDown', 'KeyZ'],
    dpadLeft: ['ArrowLeft', 'KeyN'],
    dpadRight: 'ArrowRight',
    leftStickUp: 'KeyW',
    leftStickDown: 'KeyS',
    leftStickLeft: 'KeyA',
    leftStickRight: 'KeyD',
    rightStickUp: 'KeyO',
    rightStickDown: 'KeyL',
    rightStickLeft: 'KeyK',
    rightStickRight: 'Semicolon',
    leftStickPressed: 'ShiftLeft',
    rightStickPressed: 'KeyF',
    toggleGamepad: 'F9',
  },
};
