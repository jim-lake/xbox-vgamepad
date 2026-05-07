import { MSG_SOURCE } from '@/types/messages';
import type {
  ExtensionMessage,
  ActivateGamepadConfigMessage,
  DisableGamepadMessage,
} from '@/types/messages';
import type { GamepadConfig } from '@/types/gamepad';
import { DEFAULT_CONFIG } from '@/types/gamepad';

const CONFIG_PREFIX = 'GP_CONF:';

const ICONS_ENABLED = {
  16: 'src/assets/img/icon16.png',
  48: 'src/assets/img/icon48.png',
  128: 'src/assets/img/icon128.png',
};

const ICONS_DISABLED = {
  16: 'src/assets/img/icon16_disabled.png',
  48: 'src/assets/img/icon48_disabled.png',
  128: 'src/assets/img/icon128_disabled.png',
};

function updateIcon(enabled: boolean): void {
  void chrome.action.setIcon({
    path: enabled ? ICONS_ENABLED : ICONS_DISABLED,
  });
}

chrome.runtime.onInstalled.addListener((details) => {
  void chrome.action.disable();
  if (details.reason === 'install') {
    void chrome.storage.sync.set({
      ACTIVE_GP_CONF: 'default',
      ENABLED: true,
      [`${CONFIG_PREFIX}default`]: DEFAULT_CONFIG,
    });
  }
});

chrome.storage.sync.onChanged.addListener((changes) => {
  if (changes['ENABLED']) {
    updateIcon(changes['ENABLED'].newValue as boolean);
  }
});

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    if (!sender.tab) {
      return false;
    }

    if (message.type === 'INJECTED') {
      if (sender.tab.id !== undefined) {
        void chrome.action.enable(sender.tab.id);
      }
      return false;
    }

    if (message.type === 'INITIALIZED') {
      void chrome.storage.local.set({ gameName: message.gameName });
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
            overlayMinimized:
              (data['OVERLAY_MINIMIZED'] as boolean | undefined) ?? false,
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
      void chrome.storage.local.set({ gameName: message.gameName });
      return false;
    }

    if (message.type === 'TOGGLE_ENABLED') {
      const tabId = sender.tab.id;
      void chrome.storage.sync.set({ ENABLED: message.enabled });
      if (message.enabled) {
        chrome.storage.sync.get(null, (data: Record<string, unknown>) => {
          const activeConfig =
            (data['ACTIVE_GP_CONF'] as string | undefined) ?? 'default';
          const config =
            (data[`${CONFIG_PREFIX}${activeConfig}`] as
              | GamepadConfig
              | undefined) ??
            (activeConfig === 'default' ? DEFAULT_CONFIG : undefined);
          if (config && tabId !== undefined) {
            const msg: ActivateGamepadConfigMessage = {
              source: MSG_SOURCE,
              type: 'ACTIVATE_GAMEPAD_CONFIG',
              name: activeConfig,
              gamepadConfig: config,
            };
            void chrome.tabs.sendMessage(tabId, msg);
          }
        });
      } else {
        if (tabId !== undefined) {
          const msg: DisableGamepadMessage = {
            source: MSG_SOURCE,
            type: 'DISABLE_GAMEPAD',
          };
          void chrome.tabs.sendMessage(tabId, msg);
        }
      }
      return false;
    }

    return false;
  }
);
