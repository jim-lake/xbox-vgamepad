import type { GamepadConfig, StorageData } from '@/types/gamepad';
import { DEFAULT_CONFIG } from '@/types/gamepad';
import { validateConfig } from './validate';

const CONFIG_PREFIX = 'GP_CONF:';

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

  return { isEnabled, activeConfig, configs };
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

export async function getGameName(): Promise<string | null> {
  const data = await chrome.storage.local.get('gameName');
  return (data['gameName'] as string | null | undefined) ?? null;
}

export async function clearStorage(): Promise<void> {
  await Promise.all([
    chrome.storage.sync.clear(),
    chrome.storage.local.clear(),
  ]);
}
