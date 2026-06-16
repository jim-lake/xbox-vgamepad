import { perceptualHashCrop, hammingDist } from './sprite-helpers';
import { buildExteriorMask, applyCropMaskRaw } from './sprite-crop';
import { errorLog } from '@/tools/log';

import type { Rect } from './image-ops';

export interface CandidateResult {
  rect: Rect;
  paddedRect: Rect;
  hash: bigint;
  density: number;
  centeredness: number;
  completeness: number;
  sharpness: number;
  score: number;
  cropData: Uint8ClampedArray;
  cropW: number;
  cropH: number;
}

interface SpriteCluster {
  hashes: bigint[];
  crops: Array<{
    rect: Rect;
    score: number;
    frame: number;
    data: Uint8ClampedArray;
    w: number;
    h: number;
  }>;
  totalQuality: number;
  solved: boolean;
}

export interface CandidateQueueState {
  clusters: SpriteCluster[];
  results: CandidateResult[];
  frameCount: number;
}

const HASH_THRESHOLD = 18;
const PAD_RATIO = 0.25;
const MIN_DENSITY = 0.15;
const MIN_COMPLETENESS = 0.5;
const MIN_CROP_SCORE = 0.3;
const QUALITY_BUDGET = 2.5;

export function createCandidateQueue(): CandidateQueueState {
  return { clusters: [], results: [], frameCount: 0 };
}

function keepLargestIsland(
  rgba: Uint8ClampedArray,
  w: number,
  h: number
): void {
  const visited = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  const islands: number[][] = [];

  for (let i = 0; i < w * h; i++) {
    if (visited[i] !== 0 || (rgba[i * 4 + 3] ?? 0) === 0) {
      continue;
    }
    let head = 0;
    let tail = 0;
    queue[tail++] = i;
    visited[i] = 1;
    const members: number[] = [];

    while (head < tail) {
      const idx = queue[head++] ?? 0;
      members.push(idx);
      const px = idx % w;
      const py = (idx - px) / w;
      const neighbors = [
        py > 0 ? idx - w : -1,
        py < h - 1 ? idx + w : -1,
        px > 0 ? idx - 1 : -1,
        px < w - 1 ? idx + 1 : -1,
      ];
      for (const n of neighbors) {
        if (n >= 0 && visited[n] === 0 && (rgba[n * 4 + 3] ?? 0) > 0) {
          visited[n] = 1;
          queue[tail++] = n;
        }
      }
    }
    islands.push(members);
  }

  if (islands.length <= 1) {
    return;
  }

  let largest = islands[0];
  for (let i = 1; i < islands.length; i++) {
    const island = islands[i];
    if (island && largest && island.length > largest.length) {
      largest = island;
    }
  }

  const keep = new Uint8Array(w * h);
  if (largest) {
    for (const m of largest) {
      keep[m] = 1;
    }
  }
  for (let i = 0; i < w * h; i++) {
    if (keep[i] === 0) {
      rgba[i * 4 + 3] = 0;
    }
  }
}

function cropMetrics(
  rgba: Uint8ClampedArray,
  w: number,
  h: number
): { density: number; centeredness: number; completeness: number } {
  let pixelCount = 0;
  let sumX = 0;
  let sumY = 0;
  let borderHits = 0;

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      if ((rgba[(py * w + px) * 4 + 3] ?? 0) > 0) {
        pixelCount++;
        sumX += px;
        sumY += py;
        if (px === 0 || px === w - 1 || py === 0 || py === h - 1) {
          borderHits++;
        }
      }
    }
  }

  if (pixelCount === 0) {
    return { density: 0, centeredness: 0, completeness: 1 };
  }

  const density = pixelCount / (w * h);
  const centroidX = sumX / pixelCount;
  const centroidY = sumY / pixelCount;
  const centeredness =
    1 -
    Math.max(
      Math.abs(centroidX - w / 2) / (w / 2),
      Math.abs(centroidY - h / 2) / (h / 2)
    );
  const perimeter = 2 * (w + h);
  const completeness = perimeter > 0 ? 1 - borderHits / perimeter : 1;

  return { density, centeredness, completeness };
}

function sharpnessFromColor(
  data: Uint8ClampedArray,
  w: number,
  h: number
): number {
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

function findCluster(
  clusters: SpriteCluster[],
  hash: bigint
): SpriteCluster | undefined {
  for (const cluster of clusters) {
    for (const h of cluster.hashes) {
      if (hammingDist(hash, h) < HASH_THRESHOLD) {
        return cluster;
      }
    }
  }
  return undefined;
}

/**
 * Process candidate rects from one frame through the culling pipeline.
 */
export function processCandidates(
  state: CandidateQueueState,
  candidates: Rect[],
  binary: Uint8Array,
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
    keepLargestIsland(cropData, cw, ch);

    const metrics = cropMetrics(cropData, cw, ch);
    if (
      metrics.density < MIN_DENSITY ||
      metrics.completeness < MIN_COMPLETENESS
    ) {
      continue;
    }

    const sharp = sharpnessFromColor(cropData, cw, ch);
    const normalizedSharpness = Math.min(sharp / 500, 1.0);

    const score =
      0.35 * normalizedSharpness +
      0.25 * metrics.density +
      0.25 * metrics.centeredness +
      0.15 * metrics.completeness;

    if (score < MIN_CROP_SCORE) {
      continue;
    }

    const hash = perceptualHashCrop(cropData, cw, ch);
    const cluster = findCluster(state.clusters, hash);

    let justSolved = false;

    if (cluster) {
      if (cluster.solved) {
        continue;
      }
      cluster.hashes.push(hash);
      cluster.crops.push({
        rect: paddedRect,
        score,
        frame: state.frameCount,
        data: cropData,
        w: cw,
        h: ch,
      });
      cluster.totalQuality += score;
      if (cluster.totalQuality >= QUALITY_BUDGET) {
        cluster.solved = true;
        justSolved = true;
      }
    } else {
      const c: SpriteCluster = {
        hashes: [hash],
        crops: [
          {
            rect: paddedRect,
            score,
            frame: state.frameCount,
            data: cropData,
            w: cw,
            h: ch,
          },
        ],
        totalQuality: score,
        solved: score >= QUALITY_BUDGET,
      };
      state.clusters.push(c);
      if (c.solved) {
        justSolved = true;
      }
    }

    if (!justSolved) {
      continue;
    }

    // Emit best crop from solved cluster as the canonical
    const solved = cluster ?? state.clusters[state.clusters.length - 1];
    if (!solved) {
      errorLog('[candidate-queue] solved cluster missing after solve');
      continue;
    }
    const best = solved.crops.reduce((a, b) => (b.score > a.score ? b : a));

    const result: CandidateResult = {
      rect: cand,
      paddedRect: best.rect,
      hash,
      density: metrics.density,
      centeredness: metrics.centeredness,
      completeness: metrics.completeness,
      sharpness: sharp,
      score: best.score,
      cropData: best.data,
      cropW: best.w,
      cropH: best.h,
    };
    accepted.push(result);
    state.results.push(result);
  }

  return accepted;
}
