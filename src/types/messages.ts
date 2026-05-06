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
}

export interface DisableGamepadMessage {
  source: typeof MSG_SOURCE;
  type: 'DISABLE_GAMEPAD';
}

export type PageToContentMessage = InitializedMessage | GameChangedMessage;

export type BackgroundToPageMessage =
  | ActivateGamepadConfigMessage
  | DisableGamepadMessage;

export type ExtensionMessage =
  | InjectedMessage
  | InitializedMessage
  | GameChangedMessage
  | ActivateGamepadConfigMessage
  | DisableGamepadMessage;
