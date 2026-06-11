/**
 * Candidate queue: processes rects from findCandidateRects through
 * spatial dedup → hash dedup → quality scoring → crop.
 * No DOM dependencies — works in Node tests without polyfills.
 */

import type { Rect } from '../image-ops';
import { perceptualHash, isDuplicate, overlapsRecent } from '../sprite-helpers';
import { buildExteriorMask, applyCropMaskRaw } from '../sprite-crop';

export interface CandidateResult {
  rect: Rect;
  paddedRect: Rect;
  hash: string;
  density: number;
  centeredness: number;
  completeness: number;
  sharpness: number;
  score: number;
  cropData: Uint8ClampedArray;
  cropW: number;
  cropH: number;
}

export interface CandidateQueueState {
  seenHashes: string[];
  recentRects: Array<Rect & { frame: number }>;
  results: CandidateResult[];
  frameCount: number;
}

const HASH_THRESHOLD = 10;
const SPATIAL_COOLDOWN = 30;
const PAD_RATIO = 0.25;
const MIN_DENSITY = 0.15;
const MIN_COMPLETENESS = 0.5;
const MIN_CROP_SCORE = 0.3;

export function createCandidateQueue(): CandidateQueueState {
  return { seenHashes: [], recentRects: [], results: [], frameCount: 0 };
}

function foregroundMetrics(
  binary: Uint8Array,
  width: number,
  rect: Rect
): { density: number; centeredness: number; completeness: number } {
  let pixelCount = 0;
  let sumX = 0;
  let sumY = 0;
  let borderHits = 0;
  const area = rect.w * rect.h;

  for (let py = rect.y; py < rect.y + rect.h; py++) {
    for (let px = rect.x; px < rect.x + rect.w; px++) {
      if (binary[py * width + px] !== 0) {
        pixelCount++;
        sumX += px;
        sumY += py;
        if (
          px === rect.x ||
          px === rect.x + rect.w - 1 ||
          py === rect.y ||
          py === rect.y + rect.h - 1
        ) {
          borderHits++;
        }
      }
    }
  }

  if (pixelCount === 0) {
    return { density: 0, centeredness: 0, completeness: 1 };
  }

  const density = pixelCount / area;
  const centroidX = sumX / pixelCount;
  const centroidY = sumY / pixelCount;
  const centeredness =
    1 -
    Math.max(
      Math.abs(centroidX - (rect.x + rect.w / 2)) / (rect.w / 2),
      Math.abs(centroidY - (rect.y + rect.h / 2)) / (rect.h / 2)
    );
  const perimeter = 2 * (rect.w + rect.h);
  const completeness = perimeter > 0 ? 1 - borderHits / perimeter : 1;

  return { density, centeredness, completeness };
}

function sharpness(data: Uint8ClampedArray, w: number, h: number): number {
  if (w < 3 || h < 3) {
    return 0;
  }
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4 + 1;
      const lap =
        -4 * (data[i] ?? 0) +
        (data[i - 4] ?? 0) +
        (data[i + 4] ?? 0) +
        (data[i - w * 4] ?? 0) +
        (data[i + w * 4] ?? 0);
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  if (n === 0) {
    return 0;
  }
  return (sumSq - (sum * sum) / n) / n;
}

/**
 * Process candidate rects from one frame through the culling pipeline.
 */
export function processCandidates(
  state: CandidateQueueState,
  candidates: Rect[],
  binary: Uint8Array,
  gray: Uint8Array,
  imageData: Uint8ClampedArray,
  width: number,
  height: number
): CandidateResult[] {
  state.frameCount++;
  const accepted: CandidateResult[] = [];

  for (const cand of candidates) {
    const pad = Math.round(Math.max(cand.w, cand.h) * PAD_RATIO);
    const cx = Math.max(0, cand.x - pad);
    const cy = Math.max(0, cand.y - pad);
    const cw = Math.min(width - cx, cand.w + pad * 2);
    const ch = Math.min(height - cy, cand.h + pad * 2);
    const paddedRect: Rect = { x: cx, y: cy, w: cw, h: ch };

    if (
      overlapsRecent(
        paddedRect,
        state.recentRects,
        state.frameCount,
        SPATIAL_COOLDOWN
      )
    ) {
      continue;
    }

    const hash = perceptualHash(gray, width, paddedRect);
    if (isDuplicate(hash, state.seenHashes, HASH_THRESHOLD)) {
      continue;
    }
    state.seenHashes.push(hash);
    state.recentRects.push({ ...paddedRect, frame: state.frameCount });

    const metrics = foregroundMetrics(binary, width, paddedRect);
    if (
      metrics.density < MIN_DENSITY ||
      metrics.completeness < MIN_COMPLETENESS
    ) {
      continue;
    }

    const exterior = buildExteriorMask(binary, width, cx, cy, cw, ch);
    const cropData = applyCropMaskRaw(
      imageData,
      width,
      exterior,
      cx,
      cy,
      cw,
      ch
    );

    const sharp = sharpness(cropData, cw, ch);
    const normalizedSharpness = Math.min(sharp / 500, 1.0);

    const score =
      0.35 * normalizedSharpness +
      0.25 * metrics.density +
      0.25 * metrics.centeredness +
      0.15 * metrics.completeness;

    if (score < MIN_CROP_SCORE) {
      continue;
    }

    const result: CandidateResult = {
      rect: cand,
      paddedRect,
      hash,
      density: metrics.density,
      centeredness: metrics.centeredness,
      completeness: metrics.completeness,
      sharpness: sharp,
      score,
      cropData,
      cropW: cw,
      cropH: ch,
    };
    accepted.push(result);
    state.results.push(result);
  }

  return accepted;
}
