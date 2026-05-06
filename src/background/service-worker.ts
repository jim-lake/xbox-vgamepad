import { MSG_SOURCE } from '@/types/messages';
import type {
  ExtensionMessage,
  ActivateGamepadConfigMessage,
  DisableGamepadMessage,
} from '@/types/messages';
import type { GamepadConfig } from '@/types/gamepad';
import { DEFAULT_CONFIG } from '@/types/gamepad';

const CONFIG_PREFIX = 'GP_CONF:';

chrome.runtime.onInstalled.addListener((details) => {
  chrome.action.disable();
  if (details.reason === 'install') {
    chrome.storage.sync.set({
      ACTIVE_GP_CONF: 'default',
      ENABLED: true,
      [`${CONFIG_PREFIX}default`]: DEFAULT_CONFIG,
    });
  }
});

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    if (!sender.tab) {
      return false;
    }

    if (message.type === 'INJECTED') {
      if (sender.tab.id !== undefined) {
        chrome.action.enable(sender.tab.id);
      }
      return false;
    }

    if (message.type === 'INITIALIZED') {
      chrome.storage.local.set({ gameName: message.gameName });
      chrome.storage.sync.get(null, (data: Record<string, unknown>) => {
        const isEnabled = (data['ENABLED'] as boolean | undefined) ?? true;
        const activeConfig =
          (data['ACTIVE_GP_CONF'] as string | undefined) ?? 'default';
        const config =
          (data[`${CONFIG_PREFIX}${activeConfig}`] as
            | GamepadConfig
            | undefined) ??
          (activeConfig === 'default' ? DEFAULT_CONFIG : undefined);

        if (isEnabled && config) {
          const response: ActivateGamepadConfigMessage = {
            source: MSG_SOURCE,
            type: 'ACTIVATE_GAMEPAD_CONFIG',
            name: activeConfig,
            gamepadConfig: config,
          };
          sendResponse(response);
        } else {
          const response: DisableGamepadMessage = {
            source: MSG_SOURCE,
            type: 'DISABLE_GAMEPAD',
          };
          sendResponse(response);
        }
      });
      return true;
    }

    if (message.type === 'GAME_CHANGED') {
      chrome.storage.local.set({ gameName: message.gameName });
      return false;
    }

    return false;
  }
);
