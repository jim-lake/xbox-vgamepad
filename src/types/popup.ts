import type {
  GamepadAction,
  GamepadActionName,
  GameScript,
  OtherGamepadMode,
  ScriptAction,
} from './gamepad';

export type TapAction = {
  type: 'tap';
  buttons: GamepadAction[];
  durationMs: number;
};

export type TurboAction = {
  type: 'turbo';
  buttons: GamepadAction[];
  /** Interval in ms (64–150). Press and release each take speed/2. */
  speed: number;
};

export type HoldAction = { type: 'hold'; buttons: GamepadAction[] };

export type SuspendAction = { type: 'suspend' };

export type KeyTapAction = {
  type: 'key_tap';
  keys: string[];
  durationMs: number;
};

export type KeyTurboAction = {
  type: 'key_turbo';
  keys: string[];
  /** Full cycle interval in ms (press + release). Press and release each take speed/2. */
  speed: number;
};

export type KeyHoldAction = { type: 'key_hold'; keys: string[] };

export type PopupScriptAction = ScriptAction<
  | TapAction
  | TurboAction
  | HoldAction
  | SuspendAction
  | KeyTapAction
  | KeyTurboAction
  | KeyHoldAction
>;
export type PopupGameScript = GameScript<PopupScriptAction>;

export type SlotBindings = Map<GamepadActionName, string[]>;

export interface SlotMouse {
  stick: 'left' | 'right' | undefined;
  sensitivity: number;
}

export interface ScriptBinding {
  scriptId: string;
  keyCodes: string[];
}

export interface PopupSlot {
  readonly gamepadIndex: 0 | 1 | 2 | 3;
  active: boolean;
  bindings: SlotBindings;
  mouse: SlotMouse;
  scriptBindings: ScriptBinding[];
}

export interface PopupScript {
  scriptId: string;
  script: PopupGameScript;
}

export type GlobalBindings = Map<GamepadActionName, string[]>;

export type KeyboardRemaps = Map<string, string[]>;

export interface PopupConfig {
  slots: [PopupSlot, PopupSlot, PopupSlot, PopupSlot];
  scripts: PopupScript[];
  globalBindings: GlobalBindings;
  otherGamepadMode: OtherGamepadMode;
  fakeFullscreen: boolean;
  keyboardRemaps: KeyboardRemaps;
}
