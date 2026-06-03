import type {
  GamepadConfig,
  GlobalSettings,
  StorageData,
} from '@/types/gamepad';
import {
  DEFAULT_CONFIG,
  DEFAULT_GLOBAL_SETTINGS,
  CONFIG_PREFIX,
} from '@/types/gamepad';
import { validateConfig } from './validate';

export function parseStorageData(data: Record<string, unknown>): StorageData {
  const activeConfig =
    (data['ACTIVE_GP_CONF'] as string | undefined) ?? 'default';
  const isEnabled = (data['ENABLED'] as boolean | undefined) ?? !!activeConfig;
  const configs: Record<string, GamepadConfig> = { default: DEFAULT_CONFIG };

  for (const key of Object.keys(data)) {
    if (key.startsWith(CONFIG_PREFIX)) {
      const name = key.slice(CONFIG_PREFIX.length);
      const raw = data[key];
      configs[name] = validateConfig(raw) ? raw : DEFAULT_CONFIG;
    }
  }

  const rawSettings = data['GLOBAL_SETTINGS'] as
    | Partial<GlobalSettings>
    | undefined;
  const globalSettings: GlobalSettings = {
    ...DEFAULT_GLOBAL_SETTINGS,
    ...rawSettings,
  };

  return { isEnabled, activeConfig, configs, globalSettings };
}

export async function loadStorage(): Promise<StorageData> {
  const data = await chrome.storage.sync.get(null);
  return parseStorageData(data);
}

export async function saveConfig(
  name: string,
  config: GamepadConfig
): Promise<void> {
  await chrome.storage.sync.set({ [`${CONFIG_PREFIX}${name}`]: config });
}

export async function deleteConfig(name: string): Promise<void> {
  await chrome.storage.sync.remove(`${CONFIG_PREFIX}${name}`);
}

export async function setActiveConfig(name: string): Promise<void> {
  await chrome.storage.sync.set({ ACTIVE_GP_CONF: name });
}

export async function setEnabled(enabled: boolean): Promise<void> {
  await chrome.storage.sync.set({ ENABLED: enabled });
}

export async function getGamePresets(): Promise<Record<string, string>> {
  const data = await chrome.storage.local.get('gamePresets');
  return (data['gamePresets'] as Record<string, string> | undefined) ?? {};
}

export async function setGamePreset(
  gameName: string,
  presetName: string
): Promise<void> {
  const existing = await getGamePresets();
  await chrome.storage.local.set({
    gamePresets: { ...existing, [gameName]: presetName },
  });
}

export async function mergeGamePresets(
  presets: Record<string, string>
): Promise<void> {
  const existing = await getGamePresets();
  await chrome.storage.local.set({ gamePresets: { ...existing, ...presets } });
}

export async function clearStorage(): Promise<void> {
  await Promise.all([
    chrome.storage.sync.clear(),
    chrome.storage.local.clear(),
  ]);
}

export async function saveGlobalSettings(
  settings: GlobalSettings
): Promise<void> {
  await chrome.storage.sync.set({ GLOBAL_SETTINGS: settings });
}
