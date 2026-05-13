import { MSG_SOURCE } from '@/types/messages';
import type {
  ExtensionMessage,
  ActivateGamepadConfigMessage,
  DisableGamepadMessage,
} from '@/types/messages';
import { DEFAULT_CONFIG, CONFIG_PREFIX } from '@/types/gamepad';
import type { GamepadConfig } from '@/types/gamepad';
import { validateConfig } from '@/popup/validate';

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
    updateIcon(changes['ENABLED'].newValue as boolean);
  }
});

async function handleInitialized(
  gameName: string | null,
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
  const isEnabled = (syncData['ENABLED'] as boolean | undefined) ?? true;
  if (!isEnabled) {
    return;
  }
  const config = resolveConfig(syncData, presetName);
  if (!config) {
    return;
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
  await chrome.storage.sync.set({ ENABLED: enabled });
  if (enabled) {
    const syncData = await chrome.storage.sync.get(null);
    const { name, config } = getActiveConfig(syncData);
    if (config) {
      void chrome.tabs.sendMessage(tabId, {
        source: MSG_SOURCE,
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name,
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
      void handleInitialized(message.gameName, sendResponse);
      return true;
    }

    if (message.type === 'GAME_CHANGED') {
      void chrome.storage.local.set({ gameName: message.gameName });
      const { gameName } = message;
      const tabId = sender.tab.id;
      if (gameName !== null && tabId !== undefined) {
        void handleGameChanged(gameName, tabId);
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

    return false;
  }
);
