import type { GamepadConfig, GamepadKeyConfig, KeyMap } from '@/types/gamepad';

function getKeyCodes(keyMap: KeyMap): string[] {
  if (keyMap === undefined) {
    return [];
  }
  if (typeof keyMap === 'string') {
    return [keyMap];
  }
  return keyMap;
}

export function validateConfig(config: unknown): config is GamepadConfig {
  if (
    !config ||
    typeof config !== 'object' ||
    !('keyConfig' in config) ||
    !('mouseConfig' in config)
  ) {
    return false;
  }

  const mc = (config as Record<string, unknown>)['mouseConfig'];
  if (!mc || typeof mc !== 'object') {
    return false;
  }
  const mouseControls = (mc as Record<string, unknown>)['mouseControls'];
  if (
    mouseControls !== undefined &&
    mouseControls !== null &&
    mouseControls !== 0 &&
    mouseControls !== 1
  ) {
    return false;
  }
  const sensitivity = (mc as Record<string, unknown>)['sensitivity'];
  if (
    typeof sensitivity !== 'number' ||
    sensitivity < 1 ||
    sensitivity > 1000
  ) {
    return false;
  }

  const kc = (config as Record<string, unknown>)['keyConfig'];
  if (!kc || typeof kc !== 'object') {
    return false;
  }

  const allCodes: string[] = [];
  for (const val of Object.values(kc as Record<string, unknown>)) {
    if (val === undefined || val === null) {
      continue;
    }
    if (typeof val === 'string') {
      if (val === 'Escape') {
        return false;
      }
      allCodes.push(val);
    } else if (Array.isArray(val)) {
      if ((val as unknown[]).length > 2) {
        return false;
      }
      for (const code of val as unknown[]) {
        if (typeof code !== 'string') {
          return false;
        }
        if (code === 'Escape') {
          return false;
        }
        allCodes.push(code);
      }
    } else {
      return false;
    }
  }

  // Check duplicates
  const seen = new Set<string>();
  for (const code of allCodes) {
    if (seen.has(code)) {
      return false;
    }
    seen.add(code);
  }

  return true;
}

export function getAllBoundCodes(keyConfig: GamepadKeyConfig): Set<string> {
  const codes = new Set<string>();
  const keys = Object.keys(keyConfig) as (keyof GamepadKeyConfig)[];
  for (const key of keys) {
    for (const code of getKeyCodes(keyConfig[key])) {
      codes.add(code);
    }
  }
  return codes;
}
