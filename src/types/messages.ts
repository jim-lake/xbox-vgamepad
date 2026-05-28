import type { GamepadConfig } from './gamepad';

export const MSG_SOURCE = 'xbox-vgamepad-content-script';

export interface InjectedMessage {
  source: typeof MSG_SOURCE;
  type: 'INJECTED';
}

export interface InitializedMessage {
  source: typeof MSG_SOURCE;
  type: 'INITIALIZED';
  gameName: string | null;
}

export interface GameChangedMessage {
  source: typeof MSG_SOURCE;
  type: 'GAME_CHANGED';
  gameName: string | null;
}

export interface ActivateGamepadConfigMessage {
  source: typeof MSG_SOURCE;
  type: 'ACTIVATE_GAMEPAD_CONFIG';
  name: string;
  gamepadConfig: GamepadConfig;
  overlayMinimized?: boolean;
}

export interface DisableGamepadMessage {
  source: typeof MSG_SOURCE;
  type: 'DISABLE_GAMEPAD';
}

export interface SetOverlayMinimizedMessage {
  source: typeof MSG_SOURCE;
  type: 'SET_OVERLAY_MINIMIZED';
  minimized: boolean;
}

export interface ToggleEnabledMessage {
  source: typeof MSG_SOURCE;
  type: 'TOGGLE_ENABLED';
  enabled: boolean;
}

export interface ConfigChangedMessage {
  source: typeof MSG_SOURCE;
  type: 'CONFIG_CHANGED';
  name: string;
  gamepadConfig: GamepadConfig;
}

export interface ContentReadyMessage {
  source: typeof MSG_SOURCE;
  type: 'CONTENT_READY';
}

export interface PopupOpenedMessage {
  source: typeof MSG_SOURCE;
  type: 'POPUP_OPENED';
}

export interface ScriptCountMessage {
  source: typeof MSG_SOURCE;
  type: 'SCRIPT_COUNT';
  count: number;
}

export type PageToContentMessage =
  | InitializedMessage
  | GameChangedMessage
  | SetOverlayMinimizedMessage
  | ToggleEnabledMessage
  | ScriptCountMessage;

export type BackgroundToPageMessage =
  | ActivateGamepadConfigMessage
  | DisableGamepadMessage
  | ConfigChangedMessage;

export type ExtensionMessage =
  | InjectedMessage
  | ContentReadyMessage
  | PopupOpenedMessage
  | InitializedMessage
  | GameChangedMessage
  | ActivateGamepadConfigMessage
  | DisableGamepadMessage
  | SetOverlayMinimizedMessage
  | ToggleEnabledMessage
  | ConfigChangedMessage
  | ScriptCountMessage;
