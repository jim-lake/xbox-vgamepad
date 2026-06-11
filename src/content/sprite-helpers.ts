/**
 * Stateless helper functions for the sprite extraction pipeline.
 * All pure (args) → result with no module-level state.
 */

import type { Rect } from './image-ops';

export function perceptualHashCrop(
  rgba: Uint8ClampedArray,
  w: number,
  h: number
): string {
  const cellW = w / 8;
  const cellH = h / 8;
  const values: number[] = [];

  for (let cy = 0; cy < 8; cy++) {
    for (let cx = 0; cx < 8; cx++) {
      const sx = Math.floor(cx * cellW);
      const sy = Math.floor(cy * cellH);
      const ex = Math.floor((cx + 1) * cellW);
      const ey = Math.floor((cy + 1) * cellH);
      let sum = 0;
      let count = 0;
      for (let py = sy; py < ey; py++) {
        for (let px = sx; px < ex; px++) {
          const i = (py * w + px) * 4;
          if ((rgba[i + 3] ?? 0) > 0) {
            sum += rgba[i + 1] ?? 0;
            count++;
          }
        }
      }
      values.push(count > 0 ? sum / count : 0);
    }
  }

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.map((v) => (v >= mean ? '1' : '0')).join('');
}

export function perceptualHash(
  gray: Uint8Array,
  frameW: number,
  rect: Rect
): string {
  const cellW = rect.w / 8;
  const cellH = rect.h / 8;
  const values: number[] = [];

  for (let cy = 0; cy < 8; cy++) {
    for (let cx = 0; cx < 8; cx++) {
      const sx = Math.floor(rect.x + cx * cellW);
      const sy = Math.floor(rect.y + cy * cellH);
      const ex = Math.floor(rect.x + (cx + 1) * cellW);
      const ey = Math.floor(rect.y + (cy + 1) * cellH);
      let sum = 0;
      let count = 0;
      for (let py = sy; py < ey; py++) {
        for (let px = sx; px < ex; px++) {
          sum += gray[py * frameW + px] ?? 0;
          count++;
        }
      }
      values.push(count > 0 ? sum / count : 0);
    }
  }

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.map((v) => (v >= mean ? '1' : '0')).join('');
}

export function hammingDist(a: string, b: string): number {
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      d++;
    }
  }
  return d;
}

export function isDuplicate(
  hash: string,
  seenHashes: string[],
  threshold: number
): boolean {
  return seenHashes.some((h) => hammingDist(hash, h) < threshold);
}

export function overlapsRecent(
  rect: Rect,
  recentRects: Array<Rect & { frame: number }>,
  currentFrame: number,
  cooldown: number
): boolean {
  for (let i = recentRects.length - 1; i >= 0; i--) {
    const r = recentRects[i];
    if (!r) {
      continue;
    }
    if (currentFrame - r.frame > cooldown) {
      recentRects.splice(0, i + 1);
      break;
    }
    const ix = Math.max(rect.x, r.x);
    const iy = Math.max(rect.y, r.y);
    const ix2 = Math.min(rect.x + rect.w, r.x + r.w);
    const iy2 = Math.min(rect.y + rect.h, r.y + r.h);
    if (ix < ix2 && iy < iy2) {
      const intersection = (ix2 - ix) * (iy2 - iy);
      const smaller = Math.min(rect.w * rect.h, r.w * r.h);
      if (intersection / smaller > 0.4) {
        return true;
      }
    }
  }
  return false;
}
