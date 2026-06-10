/**
 * Manual findCandidateRects visualization.
 * Runs background model, then draws candidate rects onto binary frames.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { rgbaToGray, drawBoundingRects } from '../../src/content/image-ops.ts';
import { findCandidateRects } from '../../src/content/bounding-rect.ts';
import {
  buildGaussianModel,
  processFrame,
} from '../../src/content/background-model.ts';
import { loadFrame, FRAMES } from './sprite-test-helpers.ts';

const testName = 'bounding-rects-manual';
const startTime = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = `/tmp/${testName}-${startTime}`;
mkdirSync(outDir, { recursive: true });

function saveGrayPng(data: Uint8Array, w: number, h: number, path: string) {
  const png = new PNG({ width: w, height: h });
  for (let i = 0; i < data.length; i++) {
    const v = data[i] ?? 0;
    png.data[i * 4] = v;
    png.data[i * 4 + 1] = v;
    png.data[i * 4 + 2] = v;
    png.data[i * 4 + 3] = 255;
  }
  writeFileSync(path, PNG.sync.write(png));
}

const first = loadFrame(FRAMES[0] ?? 150);
const w = first.width;
const h = first.height;
const maxDim = Math.min(w, h) * 0.2;
const sub = buildGaussianModel(rgbaToGray(first.rgba, w, h), w * h);

let savedCount = 0;
for (const num of FRAMES.slice(1)) {
  const f = loadFrame(num);
  const { binary } = processFrame(sub, rgbaToGray(f.rgba, w, h));
  if (binary === null) {
    continue;
  }
  const rects = findCandidateRects(binary, w, h, maxDim);
  const drawn = drawBoundingRects(binary, w, h, rects);
  saveGrayPng(drawn, w, h, `${outDir}/bound_${num}.png`);
  console.log(
    `Frame ${num} → bound_${num}.png (${String(rects.length)} rects)`
  );
  savedCount++;
}

console.log(`\nSaved ${String(savedCount)} frames → ${outDir}`);
