import { MSG_SOURCE } from '@/types/messages';
import type {
  ActivateGamepadConfigMessage,
  ConfigChangedMessage,
  DisableGamepadMessage,
  PopupOpenedMessage,
  TabStateChangedMessage,
  ToggleGamepadMessage,
} from '@/types/messages';
import type { GamepadConfig } from '@/types/gamepad';

async function getActiveTabId(): Promise<number | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

function notifyTabState(
  tabId: number,
  enabled: boolean,
  activeConfig: string
): void {
  void chrome.runtime.sendMessage({
    source: MSG_SOURCE,
    type: 'TAB_STATE_CHANGED',
    tabId,
    enabled,
    activeConfig,
  } satisfies TabStateChangedMessage);
}

export async function sendActivateConfig(
  name: string,
  config: GamepadConfig
): Promise<void> {
  const tabId = await getActiveTabId();
  if (tabId === undefined) {
    return;
  }
  const msg: ActivateGamepadConfigMessage = {
    source: MSG_SOURCE,
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name,
    gamepadConfig: config,
  };
  await chrome.tabs.sendMessage(tabId, msg);
  notifyTabState(tabId, true, name);
}

export async function sendDisableGamepad(): Promise<void> {
  const tabId = await getActiveTabId();
  if (tabId === undefined) {
    return;
  }
  const msg: DisableGamepadMessage = {
    source: MSG_SOURCE,
    type: 'DISABLE_GAMEPAD',
  };
  await chrome.tabs.sendMessage(tabId, msg);
  // Notify background: disabled but keep activeConfig unchanged
  void chrome.runtime.sendMessage({
    source: MSG_SOURCE,
    type: 'TAB_STATE_CHANGED',
    tabId,
    enabled: false,
    activeConfig: '',
  } satisfies TabStateChangedMessage);
}

export async function sendConfigChanged(
  name: string,
  config: GamepadConfig
): Promise<void> {
  const tabId = await getActiveTabId();
  if (tabId === undefined) {
    return;
  }
  const msg: ConfigChangedMessage = {
    source: MSG_SOURCE,
    type: 'CONFIG_CHANGED',
    name,
    gamepadConfig: config,
  };
  await chrome.tabs.sendMessage(tabId, msg);
  notifyTabState(tabId, true, name);
}

export async function sendPopupOpened(): Promise<void> {
  const tabId = await getActiveTabId();
  if (tabId === undefined) {
    return;
  }
  const msg: PopupOpenedMessage = { source: MSG_SOURCE, type: 'POPUP_OPENED' };
  await chrome.tabs.sendMessage(tabId, msg);
}

export async function sendToggleGamepad(
  gamepadIndex: 0 | 1 | 2 | 3
): Promise<void> {
  const tabId = await getActiveTabId();
  if (tabId === undefined) {
    return;
  }
  const msg: ToggleGamepadMessage = {
    source: MSG_SOURCE,
    type: 'TOGGLE_GAMEPAD',
    gamepadIndex,
  };
  await chrome.tabs.sendMessage(tabId, msg);
}
