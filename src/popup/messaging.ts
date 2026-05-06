import { MSG_SOURCE } from '@/types/messages';
import type {
  ActivateGamepadConfigMessage,
  DisableGamepadMessage,
} from '@/types/messages';
import type { GamepadConfig } from '@/types/gamepad';

async function getActiveTabId(): Promise<number | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
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
}
