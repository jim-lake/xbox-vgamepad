import type { GamepadConfig } from '@/types/gamepad';

export function validateConfig(config: unknown): config is GamepadConfig {
  if (
    !config ||
    typeof config !== 'object' ||
    !('keyboardConfig' in config) ||
    !('mouseConfig' in config)
  ) {
    return false;
  }

  const mc = (config as Record<string, unknown>)['mouseConfig'];
  if (!mc || typeof mc !== 'object') {
    return false;
  }
  const mouseControls = (mc as Record<string, unknown>)['mouseControls'];
  if (!Array.isArray(mouseControls)) {
    return false;
  }
  for (const target of mouseControls) {
    if (
      !target ||
      typeof target !== 'object' ||
      ((target as Record<string, unknown>)['stick'] !== 'left' &&
        (target as Record<string, unknown>)['stick'] !== 'right') ||
      typeof (target as Record<string, unknown>)['gamepadIndex'] !== 'number' ||
      typeof (target as Record<string, unknown>)['sensitivity'] !== 'number'
    ) {
      return false;
    }
  }

  const kc = (config as Record<string, unknown>)['keyboardConfig'];
  if (!kc || typeof kc !== 'object') {
    return false;
  }

  for (const [key, val] of Object.entries(kc as Record<string, unknown>)) {
    if (key === 'Escape') {
      return false;
    }
    if (!Array.isArray(val)) {
      return false;
    }
    for (const entry of val as unknown[]) {
      if (!entry || typeof entry !== 'object') {
        return false;
      }
      const e = entry as Record<string, unknown>;
      if (e['type'] !== 'action' && e['type'] !== 'script') {
        return false;
      }
    }
  }

  return true;
}
