/**
 * Stateless helper functions for the sprite extraction pipeline.
 * All pure (args) → result with no module-level state.
 */

import type { Rect } from './image-ops';

export function mergeRects(rects: Rect[], gap: number): Rect[] {
  if (rects.length === 0) {
    return [];
  }
  const merged: Rect[] = [];
  const used = new Uint8Array(rects.length);

  for (let i = 0; i < rects.length; i++) {
    if (used[i]) {
      continue;
    }
    const rect = rects[i];
    if (!rect) {
      continue;
    }
    let { x, y } = rect;
    let x2 = x + rect.w;
    let y2 = y + rect.h;
    let changed = true;

    while (changed) {
      changed = false;
      for (let j = i + 1; j < rects.length; j++) {
        if (used[j]) {
          continue;
        }
        const r = rects[j];
        if (!r) {
          continue;
        }
        const rx2 = r.x + r.w;
        const ry2 = r.y + r.h;
        if (
          r.x <= x2 + gap &&
          rx2 >= x - gap &&
          r.y <= y2 + gap &&
          ry2 >= y - gap
        ) {
          x = Math.min(x, r.x);
          y = Math.min(y, r.y);
          x2 = Math.max(x2, rx2);
          y2 = Math.max(y2, ry2);
          used[j] = 1;
          changed = true;
        }
      }
    }
    merged.push({ x, y, w: x2 - x, h: y2 - y });
  }
  return merged;
}

export function sizeFilter(
  rects: Rect[],
  minDim: number,
  maxDim: number
): Rect[] {
  const out: Rect[] = [];
  for (const rect of rects) {
    if (rect.w < minDim || rect.h < minDim) {
      continue;
    }
    if (rect.w > maxDim || rect.h > maxDim) {
      continue;
    }
    out.push(rect);
  }
  return out;
}

export function densityFilter(
  rects: Rect[],
  binary: Uint8Array,
  frameW: number,
  frameArea: number,
  config: {
    minArea: number;
    maxDim: number;
    maxAreaRatio: number;
    maxAspect: number;
    minDensity: number;
  }
): { accepted: Rect[]; rejected: Array<{ rect: Rect; reason: string }> } {
  const accepted: Rect[] = [];
  const rejected: Array<{ rect: Rect; reason: string }> = [];

  for (const rect of rects) {
    const area = rect.w * rect.h;
    if (area < config.minArea) {
      rejected.push({ rect, reason: 'area_too_small' });
      continue;
    }
    if (rect.w > config.maxDim || rect.h > config.maxDim) {
      rejected.push({ rect, reason: 'dim_too_large' });
      continue;
    }
    if (area > frameArea * config.maxAreaRatio) {
      rejected.push({ rect, reason: 'area_exceeds_4pct' });
      continue;
    }
    const aspect = Math.max(rect.w, rect.h) / Math.min(rect.w, rect.h);
    if (aspect > config.maxAspect) {
      rejected.push({ rect, reason: 'aspect_ratio' });
      continue;
    }
    let fgCount = 0;
    for (let py = rect.y; py < rect.y + rect.h; py++) {
      for (let px = rect.x; px < rect.x + rect.w; px++) {
        if (binary[py * frameW + px] !== 0) {
          fgCount++;
        }
      }
    }
    const density = fgCount / area;
    if (density < config.minDensity) {
      rejected.push({
        rect,
        reason: `density_${(density * 100).toFixed(0)}pct`,
      });
      continue;
    }
    accepted.push(rect);
  }
  return { accepted, rejected };
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
    const r = recentRects[i]!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
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
