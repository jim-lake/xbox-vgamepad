import type { ExtensionMessage } from '@/types/messages';
import { DEFAULT_CONFIG, CONFIG_PREFIX } from '@/types/gamepad';

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

chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender) => {
  const tabId = sender.tab?.id;

  if (message.type === 'INJECTED') {
    if (tabId !== undefined) {
      void chrome.action.enable(tabId);
    }
    return;
  }

  if (message.type === 'SET_ICON') {
    const path = message.enabled ? ICONS_ENABLED : ICONS_DISABLED;
    if (tabId !== undefined) {
      void chrome.action.setIcon({ path, tabId });
    } else {
      void chrome.action.setIcon({ path });
    }
    return;
  }

  if (message.type === 'SET_BADGE') {
    if (tabId !== undefined) {
      void chrome.action.setBadgeText({ text: message.text, tabId });
      if (message.bgColor) {
        void chrome.action.setBadgeBackgroundColor({
          color: message.bgColor,
          tabId,
        });
      }
      if (message.color) {
        void chrome.action.setBadgeTextColor({ color: message.color, tabId });
      }
    }
    return;
  }

  // Forward SCRIPT_COUNT/INPUT_SUSPENDED to allow test listeners to observe
  // (no-op for production, but tests attach listeners)
});
