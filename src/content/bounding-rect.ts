/**
 * Optimized bounding-rect pipeline.
 * Replaces separate findBoundingRects → sizeFilter → mergeRects → densityFilter
 * with a single findCandidateRects call.
 */

import type { Rect } from './image-ops';

const MIN_DIM = 10;
const MERGE_GAP = 6;
const MIN_AREA = 600;
const MAX_AREA_RATIO = 0.04;
const MAX_ASPECT = 5;
const MIN_DENSITY = 0.2;
const DILATE_RADIUS = 2;

/**
 * Morphological dilation — joins nearby islands before BFS.
 */
function dilate(binary: Uint8Array, width: number, height: number): Uint8Array {
  const out = new Uint8Array(binary.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (binary[y * width + x] === 0) {
        continue;
      }
      for (let dy = -DILATE_RADIUS; dy <= DILATE_RADIUS; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) {
          continue;
        }
        for (let dx = -DILATE_RADIUS; dx <= DILATE_RADIUS; dx++) {
          const nx = x + dx;
          if (nx >= 0 && nx < width) {
            out[ny * width + nx] = 1;
          }
        }
      }
    }
  }
  return out;
}

/**
 * BFS with typed queue, 8-connectivity, and inline size filter.
 */
function findBoundingRectsOptimized(
  binary: Uint8Array,
  width: number,
  height: number,
  maxDim: number
): Rect[] {
  const visited = new Uint8Array(binary.length);
  const rects: Rect[] = [];
  const queue = new Int32Array(binary.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (binary[idx] === 0 || visited[idx]) {
        continue;
      }
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let head = 0;
      let tail = 0;
      visited[idx] = 1;
      queue[tail++] = idx;

      while (head < tail) {
        const cur = queue[head++];
        if (cur === undefined) {
          break;
        }
        const cx = cur % width;
        const cy = (cur - cx) / width;
        if (cx < minX) {
          minX = cx;
        }
        if (cx > maxX) {
          maxX = cx;
        }
        if (cy < minY) {
          minY = cy;
        }
        if (cy > maxY) {
          maxY = cy;
        }

        const hasU = cy > 0;
        const hasD = cy < height - 1;
        const hasL = cx > 0;
        const hasR = cx < width - 1;

        if (hasU && !visited[cur - width] && binary[cur - width]) {
          visited[cur - width] = 1;
          queue[tail++] = cur - width;
        }
        if (hasD && !visited[cur + width] && binary[cur + width]) {
          visited[cur + width] = 1;
          queue[tail++] = cur + width;
        }
        if (hasL && !visited[cur - 1] && binary[cur - 1]) {
          visited[cur - 1] = 1;
          queue[tail++] = cur - 1;
        }
        if (hasR && !visited[cur + 1] && binary[cur + 1]) {
          visited[cur + 1] = 1;
          queue[tail++] = cur + 1;
        }
        if (
          hasU &&
          hasL &&
          !visited[cur - width - 1] &&
          binary[cur - width - 1]
        ) {
          visited[cur - width - 1] = 1;
          queue[tail++] = cur - width - 1;
        }
        if (
          hasU &&
          hasR &&
          !visited[cur - width + 1] &&
          binary[cur - width + 1]
        ) {
          visited[cur - width + 1] = 1;
          queue[tail++] = cur - width + 1;
        }
        if (
          hasD &&
          hasL &&
          !visited[cur + width - 1] &&
          binary[cur + width - 1]
        ) {
          visited[cur + width - 1] = 1;
          queue[tail++] = cur + width - 1;
        }
        if (
          hasD &&
          hasR &&
          !visited[cur + width + 1] &&
          binary[cur + width + 1]
        ) {
          visited[cur + width + 1] = 1;
          queue[tail++] = cur + width + 1;
        }
      }

      const w = maxX - minX + 1;
      const h = maxY - minY + 1;
      if (w >= MIN_DIM && h >= MIN_DIM && w <= maxDim && h <= maxDim) {
        rects.push({ x: minX, y: minY, w, h });
      }
    }
  }
  return rects;
}

/**
 * Full optimized pipeline: dilate → BFS (8-conn, typed queue, inline size filter)
 * → merge → scalar pre-filter → density scan.
 * Replaces the 4 separate calls (findBoundingRects, sizeFilter, mergeRects, densityFilter).
 *
 * @param maxDim - maximum dimension for a single rect (computed from frame size)
 */
export function findCandidateRects(
  binary: Uint8Array,
  width: number,
  height: number,
  maxDim: number
): Rect[] {
  const frameArea = width * height;
  const dilated = dilate(binary, width, height);

  const rects = findBoundingRectsOptimized(dilated, width, height, maxDim);

  const merged = mergeRectsInternal(rects);

  const candidates: Rect[] = [];
  for (const r of merged) {
    const area = r.w * r.h;
    if (area < MIN_AREA) {
      continue;
    }
    if (r.w > maxDim || r.h > maxDim) {
      continue;
    }
    if (area / frameArea > MAX_AREA_RATIO) {
      continue;
    }
    const aspect = Math.max(r.w, r.h) / Math.min(r.w, r.h);
    if (aspect > MAX_ASPECT) {
      continue;
    }
    let fgCount = 0;
    for (let py = r.y; py < r.y + r.h; py++) {
      for (let px = r.x; px < r.x + r.w; px++) {
        if (binary[py * width + px] !== 0) {
          fgCount++;
        }
      }
    }
    if (fgCount / area >= MIN_DENSITY) {
      candidates.push(r);
    }
  }
  return candidates;
}

function mergeRectsInternal(rects: Rect[]): Rect[] {
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
          r.x <= x2 + MERGE_GAP &&
          rx2 >= x - MERGE_GAP &&
          r.y <= y2 + MERGE_GAP &&
          ry2 >= y - MERGE_GAP
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
