import { MSG_SOURCE } from '@/types/messages';
import type {
  ActivateGamepadConfigMessage,
  ConfigChangedMessage,
  DisableGamepadMessage,
  ExtensionMessage,
  PopupOpenedMessage,
  StartFindSpritesMessage,
  ToggleGamepadMessage,
} from '@/types/messages';
import type { GamepadConfig } from '@/types/gamepad';

async function getActiveTabId(): Promise<number | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

async function sendToActiveTab(msg: ExtensionMessage): Promise<void> {
  const tabId = await getActiveTabId();
  if (tabId === undefined) {
    return;
  }
  await chrome.tabs.sendMessage(tabId, msg);
}

export async function sendActivateConfig(
  name: string,
  config: GamepadConfig
): Promise<void> {
  const msg: ActivateGamepadConfigMessage = {
    source: MSG_SOURCE,
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name,
    gamepadConfig: config,
  };
  await sendToActiveTab(msg);
}

export async function sendDisableGamepad(): Promise<void> {
  const msg: DisableGamepadMessage = {
    source: MSG_SOURCE,
    type: 'DISABLE_GAMEPAD',
  };
  await sendToActiveTab(msg);
}

export async function sendConfigChanged(
  name: string,
  config: GamepadConfig
): Promise<void> {
  const msg: ConfigChangedMessage = {
    source: MSG_SOURCE,
    type: 'CONFIG_CHANGED',
    name,
    gamepadConfig: config,
  };
  await sendToActiveTab(msg);
}

export async function sendPopupOpened(): Promise<void> {
  const msg: PopupOpenedMessage = { source: MSG_SOURCE, type: 'POPUP_OPENED' };
  await sendToActiveTab(msg);
}

export async function sendToggleGamepad(
  gamepadIndex: 0 | 1 | 2 | 3
): Promise<void> {
  const msg: ToggleGamepadMessage = {
    source: MSG_SOURCE,
    type: 'TOGGLE_GAMEPAD',
    gamepadIndex,
  };
  await sendToActiveTab(msg);
}

export async function sendStartFindSprites(): Promise<void> {
  const msg: StartFindSpritesMessage = {
    source: MSG_SOURCE,
    type: 'START_FIND_SPRITES',
  };
  await sendToActiveTab(msg);
}
