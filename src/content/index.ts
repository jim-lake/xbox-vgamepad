import { MSG_SOURCE } from '@/types/messages';
import type {
  ExtensionMessage,
  SettingsChangedMessage,
} from '@/types/messages';
import type { GlobalSettings } from '@/types/gamepad';
import { DEFAULT_GLOBAL_SETTINGS } from '@/types/gamepad';
import { setLoggingEnabled } from '@/tools/log';

function parseSettings(data: Record<string, unknown>): GlobalSettings {
  const raw = data['GLOBAL_SETTINGS'] as Partial<GlobalSettings> | undefined;
  return { ...DEFAULT_GLOBAL_SETTINGS, ...raw };
}

function sendSettingsToPage(settings: GlobalSettings): void {
  window.postMessage(
    {
      source: MSG_SOURCE,
      type: 'SETTINGS_CHANGED',
      enableLogging: settings.enableLogging,
      disableBlur: settings.disableBlur,
      patchRemoteMultigamepad: settings.patchRemoteMultigamepad,
    } satisfies SettingsChangedMessage,
    '*'
  );
}

try {
  void chrome.storage.sync.get('GLOBAL_SETTINGS').then((data) => {
    const settings = parseSettings(data);
    setLoggingEnabled(settings.enableLogging);
    sendSettingsToPage(settings);
  });
} catch {
  // Extension context invalidated
}

chrome.storage.sync.onChanged.addListener((changes) => {
  if (changes['GLOBAL_SETTINGS']) {
    const raw = changes['GLOBAL_SETTINGS'].newValue as
      | Partial<GlobalSettings>
      | undefined;
    const settings: GlobalSettings = { ...DEFAULT_GLOBAL_SETTINGS, ...raw };
    setLoggingEnabled(settings.enableLogging);
    sendSettingsToPage(settings);
  }
});

try {
  void chrome.runtime.sendMessage({ source: MSG_SOURCE, type: 'INJECTED' });
} catch {
  // Extension context invalidated
}

window.addEventListener('message', (event: MessageEvent) => {
  const data: unknown = event.data;
  if (
    !data ||
    typeof data !== 'object' ||
    (data as { source?: unknown }).source !== MSG_SOURCE
  ) {
    return;
  }
  const msg = data as ExtensionMessage;
  if (msg.type === 'INITIALIZED') {
    try {
      chrome.runtime.sendMessage(
        msg,
        (response: ExtensionMessage | undefined) => {
          if (chrome.runtime.lastError) {
            return;
          }
          if (response) {
            window.postMessage(response, '*');
          }
        }
      );
    } catch {
      // Extension context invalidated
    }
  } else if (msg.type === 'GAME_CHANGED') {
    try {
      void chrome.runtime.sendMessage(msg);
    } catch {
      // Extension context invalidated
    }
  } else if (msg.type === 'SET_OVERLAY_MINIMIZED') {
    try {
      void chrome.storage.sync.set({ OVERLAY_MINIMIZED: msg.minimized });
    } catch {
      // Extension context invalidated
    }
  } else if (msg.type === 'TOGGLE_ENABLED') {
    try {
      void chrome.runtime.sendMessage(msg);
    } catch {
      // Extension context invalidated
    }
  } else if (msg.type === 'SCRIPT_COUNT') {
    try {
      void chrome.runtime.sendMessage(msg);
    } catch {
      // Extension context invalidated
    }
  }
});

window.postMessage({ source: MSG_SOURCE, type: 'CONTENT_READY' }, '*');

chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender) => {
  // Only process messages from background/popup (not from other tabs)
  if (sender.tab) {
    return;
  }
  window.postMessage({ ...message, source: MSG_SOURCE }, '*');
});

document.addEventListener('DOMContentLoaded', () => {
  const meta = document.createElement('meta');
  meta.name = 'xvg-resources';
  meta.content = JSON.stringify({
    icon: chrome.runtime.getURL('src/assets/img/icon48.png'),
  });
  document.head.appendChild(meta);
});
