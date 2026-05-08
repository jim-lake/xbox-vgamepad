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

  const kc = (config as Record<string, unknown>)['keyboardConfig'];
  if (!kc || typeof kc !== 'object') {
    return false;
  }

  for (const [key, val] of Object.entries(kc as Record<string, unknown>)) {
    if (key === 'Escape') {
      return false;
    }
    if (typeof val === 'string') {
      continue;
    } else if (Array.isArray(val)) {
      for (const action of val as unknown[]) {
        if (typeof action !== 'string') {
          return false;
        }
      }
    } else {
      return false;
    }
  }

  return true;
}
