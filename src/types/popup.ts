import type {
  GamepadActionName,
  GameScript,
  OtherGamepadMode,
} from './gamepad';

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
  gamepadIndex: 0 | 1 | 2 | 3;
  bindings: SlotBindings;
  mouse: SlotMouse;
  scriptBindings: ScriptBinding[];
}

export interface PopupScript {
  scriptId: string;
  script: GameScript;
}

export type GlobalBindings = Record<GamepadActionName, string[]>;

export interface PopupConfig {
  slots: [PopupSlot, PopupSlot, PopupSlot, PopupSlot];
  scripts: PopupScript[];
  globalBindings: GlobalBindings;
  otherGamepadMode: OtherGamepadMode;
}
