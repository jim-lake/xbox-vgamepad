import { MSG_SOURCE, isExtensionMessage } from '@/types/messages';
import type {
  ExtensionMessage,
  ActivateGamepadConfigMessage,
  DisableGamepadMessage,
  SettingsChangedMessage,
} from '@/types/messages';
import type { GamepadConfig, GlobalSettings } from '@/types/gamepad';
import {
  DEFAULT_CONFIG,
  DEFAULT_GLOBAL_SETTINGS,
  CONFIG_PREFIX,
} from '@/types/gamepad';
import { validateConfig } from '@/popup/validate';
import { setLoggingEnabled } from '@/tools/log';

// --- Config Resolution (moved from service worker) ---

function resolveConfig(
  syncData: Record<string, unknown>,
  presetName: string
): GamepadConfig | undefined {
  const raw = syncData[`${CONFIG_PREFIX}${presetName}`];
  return (
    (validateConfig(raw) ? raw : undefined) ??
    (presetName === 'default' ? DEFAULT_CONFIG : undefined)
  );
}

function getActiveConfig(syncData: Record<string, unknown>): {
  name: string;
  config: GamepadConfig | undefined;
} {
  const name = (syncData['ACTIVE_GP_CONF'] as string | undefined) ?? 'default';
  return { name, config: resolveConfig(syncData, name) };
}

async function getGamePreset(gameName: string): Promise<string | undefined> {
  const localData = await chrome.storage.local.get('gamePresets');
  const gamePresets =
    (localData['gamePresets'] as Record<string, string> | undefined) ?? {};
  return gamePresets[gameName];
}

// --- Per-tab state (just this tab) ---

interface TabState {
  enabled: boolean;
  activeConfig: string;
  gameName: string | null;
  suspended: boolean;
}

const state: TabState = {
  enabled: true,
  activeConfig: 'default',
  gameName: null,
  suspended: false,
};

// --- Service Worker icon/badge commands ---

function sendSetIcon(enabled: boolean): void {
  try {
    void chrome.runtime.sendMessage({
      source: MSG_SOURCE,
      type: 'SET_ICON',
      enabled,
    });
  } catch {
    // Extension context invalidated
  }
}

function sendSetBadge(text: string, color?: string, bgColor?: string): void {
  try {
    void chrome.runtime.sendMessage({
      source: MSG_SOURCE,
      type: 'SET_BADGE',
      text,
      color,
      bgColor,
    });
  } catch {
    // Extension context invalidated
  }
}

// --- Handlers (moved from service worker) ---

async function handleInitialized(gameName: string | null): Promise<void> {
  try {
    const [syncData, gamePreset] = await Promise.all([
      chrome.storage.sync.get(null),
      gameName !== null ? getGamePreset(gameName) : Promise.resolve(undefined),
    ]);

    const isEnabled = (syncData['ENABLED'] as boolean | undefined) ?? true;

    const { name, config } = gamePreset
      ? { name: gamePreset, config: resolveConfig(syncData, gamePreset) }
      : getActiveConfig(syncData);

    state.enabled = isEnabled;
    state.activeConfig = name;
    state.gameName = gameName;
    state.suspended = false;
    sendSetIcon(isEnabled);

    if (isEnabled && config) {
      const response: ActivateGamepadConfigMessage = {
        source: MSG_SOURCE,
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name,
        gamepadConfig: config,
        overlayMinimized:
          (syncData['OVERLAY_MINIMIZED'] as boolean | undefined) ?? false,
      };
      window.postMessage(response, '*');
    } else {
      const response: DisableGamepadMessage = {
        source: MSG_SOURCE,
        type: 'DISABLE_GAMEPAD',
      };
      window.postMessage(response, '*');
    }
  } catch {
    window.postMessage(
      {
        source: MSG_SOURCE,
        type: 'DISABLE_GAMEPAD',
      } satisfies DisableGamepadMessage,
      '*'
    );
  }
}

async function handleGameChanged(gameName: string): Promise<void> {
  const presetName = await getGamePreset(gameName);
  if (!presetName) {
    return;
  }
  if (!state.enabled) {
    return;
  }
  const syncData = await chrome.storage.sync.get(null);
  const config = resolveConfig(syncData, presetName);
  if (!config) {
    return;
  }
  state.activeConfig = presetName;
  window.postMessage(
    {
      source: MSG_SOURCE,
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name: presetName,
      gamepadConfig: config,
    } satisfies ActivateGamepadConfigMessage,
    '*'
  );
}

async function handleToggleEnabled(enabled: boolean): Promise<void> {
  state.enabled = enabled;
  sendSetIcon(enabled);

  if (enabled) {
    const syncData = await chrome.storage.sync.get(null);
    const config = resolveConfig(syncData, state.activeConfig);
    if (config) {
      window.postMessage(
        {
          source: MSG_SOURCE,
          type: 'ACTIVATE_GAMEPAD_CONFIG',
          name: state.activeConfig,
          gamepadConfig: config,
        } satisfies ActivateGamepadConfigMessage,
        '*'
      );
    }
  } else {
    window.postMessage(
      {
        source: MSG_SOURCE,
        type: 'DISABLE_GAMEPAD',
      } satisfies DisableGamepadMessage,
      '*'
    );
  }
}

// --- Settings ---

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
      autoSuspendOnInput: settings.autoSuspendOnInput,
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

// --- Notify service worker that content script is injected (enables action) ---

try {
  void chrome.runtime.sendMessage({ source: MSG_SOURCE, type: 'INJECTED' });
} catch {
  // Extension context invalidated
}

// --- Page message handling ---

window.addEventListener('message', (event: MessageEvent) => {
  const data: unknown = event.data;
  if (!isExtensionMessage(data)) {
    return;
  }
  const msg = data;

  if (msg.type === 'INITIALIZED') {
    void handleInitialized(msg.gameName);
  } else if (msg.type === 'GAME_CHANGED') {
    state.gameName = msg.gameName;
    if (msg.gameName !== null) {
      void handleGameChanged(msg.gameName);
    }
    // Forward to service worker (test observability)
    try {
      void chrome.runtime.sendMessage(msg);
    } catch {
      // Extension context invalidated
    }
  } else if (msg.type === 'TOGGLE_ENABLED') {
    void handleToggleEnabled(msg.enabled);
  } else if (msg.type === 'SCRIPT_COUNT') {
    if (!state.suspended) {
      const text = msg.count > 0 ? String(msg.count) : '';
      sendSetBadge(text, '#16a34a', '#ffffff');
    }
    // Forward to service worker (test observability)
    try {
      void chrome.runtime.sendMessage(msg);
    } catch {
      // Extension context invalidated
    }
  } else if (msg.type === 'INPUT_SUSPENDED') {
    state.suspended = msg.suspended;
    if (msg.suspended) {
      sendSetBadge('X', '#ffffff', '#dc2626');
    } else {
      sendSetBadge('');
    }
    // Forward to service worker (test observability)
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
  } else if (msg.type === 'GAMEPAD_STATUS') {
    // Broadcast to popup
    try {
      void chrome.runtime.sendMessage({ ...msg, source: MSG_SOURCE });
    } catch {
      // Extension context invalidated
    }
  }
});

// --- Messages from popup (chrome.runtime.onMessage) ---

chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender) => {
  // Only process messages from background/popup (not from other tabs)
  if (sender.tab) {
    return;
  }
  window.postMessage({ ...message, source: MSG_SOURCE }, '*');
});

// --- Content ready & meta tag ---

window.postMessage({ source: MSG_SOURCE, type: 'CONTENT_READY' }, '*');

document.addEventListener('DOMContentLoaded', () => {
  const meta = document.createElement('meta');
  meta.name = 'xvg-resources';
  meta.content = JSON.stringify({
    icon: chrome.runtime.getURL('src/assets/img/icon48.png'),
  });
  document.head.appendChild(meta);
});
