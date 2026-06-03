import { MSG_SOURCE } from '@/types/messages';
import type {
  ExtensionMessage,
  ActivateGamepadConfigMessage,
  DisableGamepadMessage,
} from '@/types/messages';
import { DEFAULT_CONFIG, CONFIG_PREFIX } from '@/types/gamepad';
import type { GamepadConfig } from '@/types/gamepad';
import { validateConfig } from '@/popup/validate';

const g_suspendedTabs = new Set<number>();

// Per-tab state: loaded from chrome.storage on init, then independent
interface TabState {
  enabled: boolean;
  activeConfig: string;
  gameName: string | null;
}
const g_tabState = new Map<number, TabState>();

chrome.tabs.onRemoved.addListener((tabId) => {
  g_tabState.delete(tabId);
  g_suspendedTabs.delete(tabId);
});

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

function updateIcon(enabled: boolean, tabId?: number): void {
  const path = enabled ? ICONS_ENABLED : ICONS_DISABLED;
  if (tabId !== undefined) {
    void chrome.action.setIcon({ path, tabId });
  } else {
    void chrome.action.setIcon({ path });
  }
}

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
    // Update icon globally for tabs without per-tab state (e.g. popup default)
    updateIcon(changes['ENABLED'].newValue as boolean);
  }
});

async function handleInitialized(
  gameName: string | null,
  tabId: number,
  sendResponse: (
    msg: ActivateGamepadConfigMessage | DisableGamepadMessage
  ) => void
): Promise<void> {
  const [syncData, gamePreset] = await Promise.all([
    chrome.storage.sync.get(null),
    gameName !== null ? getGamePreset(gameName) : Promise.resolve(undefined),
  ]);

  const isEnabled = (syncData['ENABLED'] as boolean | undefined) ?? true;

  const { name, config } = gamePreset
    ? { name: gamePreset, config: resolveConfig(syncData, gamePreset) }
    : getActiveConfig(syncData);

  // Store per-tab state (loaded from global, then independent)
  g_tabState.set(tabId, { enabled: isEnabled, activeConfig: name, gameName });
  updateIcon(isEnabled, tabId);

  if (isEnabled && config) {
    sendResponse({
      source: MSG_SOURCE,
      type: 'ACTIVATE_GAMEPAD_CONFIG',
      name,
      gamepadConfig: config,
      overlayMinimized:
        (syncData['OVERLAY_MINIMIZED'] as boolean | undefined) ?? false,
    });
  } else {
    sendResponse({ source: MSG_SOURCE, type: 'DISABLE_GAMEPAD' });
  }
}

async function handleGameChanged(
  gameName: string,
  tabId: number
): Promise<void> {
  const presetName = await getGamePreset(gameName);
  if (!presetName) {
    return;
  }
  const syncData = await chrome.storage.sync.get(null);
  const tabState = g_tabState.get(tabId);
  const isEnabled = tabState?.enabled ?? true;
  if (!isEnabled) {
    return;
  }
  const config = resolveConfig(syncData, presetName);
  if (!config) {
    return;
  }
  // Update per-tab state only
  if (tabState) {
    tabState.activeConfig = presetName;
  }
  void chrome.tabs.sendMessage(tabId, {
    source: MSG_SOURCE,
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: presetName,
    gamepadConfig: config,
  } satisfies ActivateGamepadConfigMessage);
}

async function handleToggleEnabled(
  enabled: boolean,
  tabId: number
): Promise<void> {
  // Update per-tab state only (don't write to global storage)
  const tabState = g_tabState.get(tabId);
  if (tabState) {
    tabState.enabled = enabled;
  }
  updateIcon(enabled, tabId);

  if (enabled) {
    const syncData = await chrome.storage.sync.get(null);
    const configName = tabState?.activeConfig ?? 'default';
    const config = resolveConfig(syncData, configName);
    if (config) {
      void chrome.tabs.sendMessage(tabId, {
        source: MSG_SOURCE,
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: configName,
        gamepadConfig: config,
      } satisfies ActivateGamepadConfigMessage);
    }
  } else {
    void chrome.tabs.sendMessage(tabId, {
      source: MSG_SOURCE,
      type: 'DISABLE_GAMEPAD',
    } satisfies DisableGamepadMessage);
  }
}

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    // Handle messages from popup (no sender.tab)
    if (!sender.tab) {
      if (message.type === 'TAB_STATE_CHANGED') {
        const state = g_tabState.get(message.tabId);
        if (state) {
          state.enabled = message.enabled;
          if (message.activeConfig) {
            state.activeConfig = message.activeConfig;
          }
        } else {
          g_tabState.set(message.tabId, {
            enabled: message.enabled,
            activeConfig: message.activeConfig || 'default',
            gameName: null,
          });
        }
        updateIcon(message.enabled, message.tabId);
      } else if (message.type === 'GET_TAB_STATE') {
        const state = g_tabState.get(message.tabId);
        sendResponse({
          source: MSG_SOURCE,
          type: 'TAB_STATE_RESPONSE',
          enabled: state?.enabled ?? true,
          activeConfig: state?.activeConfig ?? 'default',
          gameName: state?.gameName ?? null,
        });
        return true;
      }
      return false;
    }

    if (message.type === 'INJECTED') {
      if (sender.tab.id !== undefined) {
        void chrome.action.enable(sender.tab.id);
      }
      return false;
    }

    if (message.type === 'INITIALIZED') {
      const tabId = sender.tab.id;
      if (tabId !== undefined) {
        void handleInitialized(message.gameName, tabId, sendResponse);
      }
      return true;
    }

    if (message.type === 'GAME_CHANGED') {
      const { gameName } = message;
      const tabId = sender.tab.id;
      if (tabId !== undefined) {
        const tabState = g_tabState.get(tabId);
        if (tabState) {
          tabState.gameName = gameName;
        }
        if (gameName !== null) {
          void handleGameChanged(gameName, tabId);
        }
      }
      return false;
    }

    if (message.type === 'TOGGLE_ENABLED') {
      const tabId = sender.tab.id;
      if (tabId !== undefined) {
        void handleToggleEnabled(message.enabled, tabId);
      }
      return false;
    }

    if (message.type === 'SCRIPT_COUNT') {
      const tabId = sender.tab.id;
      if (tabId !== undefined && !g_suspendedTabs.has(tabId)) {
        const text = message.count > 0 ? String(message.count) : '';
        void chrome.action.setBadgeText({ text, tabId });
        void chrome.action.setBadgeBackgroundColor({ color: '#ffffff', tabId });
        void chrome.action.setBadgeTextColor({ color: '#16a34a', tabId });
      }
      return false;
    }

    if (message.type === 'INPUT_SUSPENDED') {
      const tabId = sender.tab.id;
      if (tabId !== undefined) {
        if (message.suspended) {
          g_suspendedTabs.add(tabId);
          void chrome.action.setBadgeText({ text: 'X', tabId });
          void chrome.action.setBadgeBackgroundColor({
            color: '#dc2626',
            tabId,
          });
          void chrome.action.setBadgeTextColor({ color: '#ffffff', tabId });
        } else {
          g_suspendedTabs.delete(tabId);
          void chrome.action.setBadgeText({ text: '', tabId });
        }
      }
      return false;
    }

    return false;
  }
);
