/**
 * Stateless helper functions for the sprite extraction pipeline.
 * All pure (args) → result with no module-level state.
 */

import type { Rect } from './image-ops';

export function perceptualHashCrop(
  crop: Uint8ClampedArray,
  w: number,
  h: number
): bigint {
  const cellW = w / 8;
  const cellH = h / 8;
  const rVals: number[] = [];
  const gVals: number[] = [];
  const bVals: number[] = [];

  for (let cy = 0; cy < 8; cy++) {
    for (let cx = 0; cx < 8; cx++) {
      const sx = Math.floor(cx * cellW);
      const sy = Math.floor(cy * cellH);
      const ex = Math.floor((cx + 1) * cellW);
      const ey = Math.floor((cy + 1) * cellH);
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let count = 0;
      for (let py = sy; py < ey; py++) {
        for (let px = sx; px < ex; px++) {
          const i = (py * w + px) * 4;
          if ((crop[i + 3] ?? 0) > 0) {
            rSum += crop[i] ?? 0;
            gSum += crop[i + 1] ?? 0;
            bSum += crop[i + 2] ?? 0;
            count++;
          }
        }
      }
      rVals.push(count > 0 ? rSum / count : 0);
      gVals.push(count > 0 ? gSum / count : 0);
      bVals.push(count > 0 ? bSum / count : 0);
    }
  }

  const rMean = rVals.reduce((a, b) => a + b, 0) / rVals.length;
  const gMean = gVals.reduce((a, b) => a + b, 0) / gVals.length;
  const bMean = bVals.reduce((a, b) => a + b, 0) / bVals.length;

  let hash = 0n;
  for (let i = 0; i < 64; i++) {
    const bit = i * 3;
    if ((rVals[i] ?? 0) >= rMean) {
      hash |= 1n << BigInt(bit);
    }
    if ((gVals[i] ?? 0) >= gMean) {
      hash |= 1n << BigInt(bit + 1);
    }
    if ((bVals[i] ?? 0) >= bMean) {
      hash |= 1n << BigInt(bit + 2);
    }
  }
  return hash;
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

export function hammingDist(a: bigint, b: bigint): number {
  let xor = a ^ b;
  let dist = 0;
  while (xor > 0n) {
    dist += popcount32(Number(xor & 0xffffffffn));
    xor >>= 32n;
  }
  return dist;
}

function popcount32(n: number): number {
  n = n - ((n >> 1) & 0x55555555);
  n = (n & 0x33333333) + ((n >> 2) & 0x33333333);
  n = (n + (n >> 4)) & 0x0f0f0f0f;
  return (n * 0x01010101) >>> 24;
}

export function isDuplicate(
  hash: bigint,
  seenHashes: bigint[],
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
