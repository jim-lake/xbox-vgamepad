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

export type PopupScriptAction = ScriptAction<TapAction | TurboAction>;
export type PopupGameScript = GameScript<PopupScriptAction>;

export type SlotBindings = Record<GamepadActionName, string[]>;

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

export type GlobalBindings = Record<GamepadActionName, string[]>;

export interface PopupConfig {
  slots: [PopupSlot, PopupSlot, PopupSlot, PopupSlot];
  scripts: PopupScript[];
  globalBindings: GlobalBindings;
  otherGamepadMode: OtherGamepadMode;
  fakeFullscreen: boolean;
}
