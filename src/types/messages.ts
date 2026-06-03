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

export interface SettingsChangedMessage {
  source: typeof MSG_SOURCE;
  type: 'SETTINGS_CHANGED';
  enableLogging: boolean;
  disableBlur: boolean;
  patchRemoteMultigamepad: boolean;
  autoSuspendOnInput: boolean;
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

export interface InputSuspendedMessage {
  source: typeof MSG_SOURCE;
  type: 'INPUT_SUSPENDED';
  suspended: boolean;
}

export interface GamepadStatusMessage {
  source: typeof MSG_SOURCE;
  type: 'GAMEPAD_STATUS';
  connected: [boolean, boolean, boolean, boolean];
  enabled: boolean;
  activeConfig: string;
  gameName: string | null;
  suspended: boolean;
}

export interface ToggleGamepadMessage {
  source: typeof MSG_SOURCE;
  type: 'TOGGLE_GAMEPAD';
  gamepadIndex: 0 | 1 | 2 | 3;
}

export interface SetIconMessage {
  source: typeof MSG_SOURCE;
  type: 'SET_ICON';
  enabled: boolean;
}

export interface SetBadgeMessage {
  source: typeof MSG_SOURCE;
  type: 'SET_BADGE';
  text: string;
  color?: string;
  bgColor?: string;
}

export function isExtensionMessage(data: unknown): data is ExtensionMessage {
  return (
    data !== null &&
    typeof data === 'object' &&
    (data as { source?: unknown }).source === MSG_SOURCE
  );
}

export type PageToContentMessage =
  | InitializedMessage
  | GameChangedMessage
  | SetOverlayMinimizedMessage
  | ToggleEnabledMessage
  | ScriptCountMessage
  | InputSuspendedMessage
  | GamepadStatusMessage;

export type BackgroundToPageMessage =
  | ActivateGamepadConfigMessage
  | DisableGamepadMessage
  | ConfigChangedMessage
  | SettingsChangedMessage
  | ToggleGamepadMessage;

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
  | SettingsChangedMessage
  | ScriptCountMessage
  | InputSuspendedMessage
  | GamepadStatusMessage
  | ToggleGamepadMessage
  | SetIconMessage
  | SetBadgeMessage;
