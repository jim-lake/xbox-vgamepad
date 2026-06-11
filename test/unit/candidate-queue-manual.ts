/**
 * Manual candidate-queue visualization test.
 * Runs background model + findCandidateRects + candidate-queue culling,
 * outputs accepted candidates as PNG crops for manual/AI evaluation.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { rgbaToGray } from '../../src/content/image-ops.ts';
import { findCandidateRects } from '../../src/content/bounding-rect.ts';
import {
  buildGaussianModel,
  processFrame,
} from '../../src/content/background-model.ts';
import {
  createCandidateQueue,
  processCandidates,
} from '../../src/content/sprite-candidate-queue.ts';
import { loadFrame, FRAMES } from './sprite-test-helpers.ts';

const testName = 'candidate-queue-manual';
const startTime = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = `/tmp/${testName}-${startTime}`;
mkdirSync(outDir, { recursive: true });
mkdirSync(resolve(outDir, 'crops'), { recursive: true });

function saveRgbaPng(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  path: string
) {
  const png = new PNG({ width: w, height: h });
  png.data = Buffer.from(data);
  writeFileSync(path, PNG.sync.write(png));
}

const first = loadFrame(FRAMES[0] ?? 150);
const w = first.width;
const h = first.height;
const maxDim = Math.min(w, h) * 0.2;
const sub = buildGaussianModel(rgbaToGray(first.rgba, w, h), w * h);
const queue = createCandidateQueue();

let totalCandidates = 0;
const summary: Array<{
  frame: number;
  index: number;
  score: number;
  density: number;
  centeredness: number;
  completeness: number;
  sharpness: number;
  rect: { x: number; y: number; w: number; h: number };
}> = [];

for (const num of FRAMES.slice(1)) {
  const f = loadFrame(num);
  const gray = rgbaToGray(f.rgba, w, h);
  const { binary } = processFrame(sub, gray);
  if (binary === null) {
    continue;
  }

  const rects = findCandidateRects(binary, w, h, maxDim);
  const accepted = processCandidates(queue, rects, binary, gray, f.rgba, w, h);

  for (const result of accepted) {
    const idx = totalCandidates++;
    saveRgbaPng(
      result.cropData,
      result.cropW,
      result.cropH,
      resolve(
        outDir,
        'crops',
        `candidate_${String(idx).padStart(4, '0')}_frame${num}.png`
      )
    );
    summary.push({
      frame: num,
      index: idx,
      score: result.score,
      density: result.density,
      centeredness: result.centeredness,
      completeness: result.completeness,
      sharpness: result.sharpness,
      rect: result.paddedRect,
    });
  }
}

writeFileSync(
  resolve(outDir, 'summary.json'),
  JSON.stringify(summary, null, 2)
);

console.log(`\nCandidate queue results:`);
console.log(`  Total accepted: ${String(totalCandidates)}`);
console.log(`  Output dir: ${outDir}`);
console.log(`  Crops: ${outDir}/crops/`);
console.log(`  Summary: ${outDir}/summary.json`);
