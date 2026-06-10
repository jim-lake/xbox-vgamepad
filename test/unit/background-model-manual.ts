/**
 * Manual background-model visualization (frames 150–449).
 * Loads frames, runs production processFrame (with its built-in defaults), saves output.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { rgbaToGray } from '../../src/content/image-ops.ts';
import {
  buildGaussianModel,
  processFrame,
} from '../../src/content/background-model.ts';
import { loadFrame, FRAMES } from './sprite-test-helpers.ts';

const testName = 'background-model-manual';
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

function saveRgbaMasked(
  rgba: Uint8ClampedArray,
  binary: Uint8Array,
  w: number,
  h: number,
  path: string
) {
  const png = new PNG({ width: w, height: h });
  for (let i = 0; i < binary.length; i++) {
    const off = i * 4;
    if (binary[i] !== 0) {
      png.data[off] = rgba[off] ?? 0;
      png.data[off + 1] = rgba[off + 1] ?? 0;
      png.data[off + 2] = rgba[off + 2] ?? 0;
      png.data[off + 3] = 255;
    } else {
      png.data[off] = 0;
      png.data[off + 1] = 0;
      png.data[off + 2] = 0;
      png.data[off + 3] = 0;
    }
  }
  writeFileSync(path, PNG.sync.write(png));
}

const first = loadFrame(FRAMES[0] ?? 150);
const w = first.width;
const h = first.height;
const sub = buildGaussianModel(rgbaToGray(first.rgba, w, h), w * h);

let savedCount = 0;
let learningCount = 0;
for (const num of FRAMES.slice(1)) {
  const f = loadFrame(num);
  const { binary, changeRatio } = processFrame(sub, rgbaToGray(f.rgba, w, h));

  if (binary === null) {
    learningCount++;
    console.log(
      `Frame ${num} → suppressed changeRatio=${changeRatio.toFixed(4)}`
    );
  } else {
    saveGrayPng(binary, w, h, `${outDir}/binary_${num}.png`);
    saveRgbaMasked(f.rgba, binary, w, h, `${outDir}/foreground_${num}.png`);
    console.log(
      `Frame ${num} → binary_${num}.png, foreground_${num}.png changeRatio=${changeRatio.toFixed(4)}`
    );
    savedCount++;
  }
}

const meanU8 = new Uint8Array(w * h);
for (let i = 0; i < w * h; i++) {
  meanU8[i] = Math.round(Math.max(0, Math.min(255, sub.mean[i] ?? 0)));
}
saveGrayPng(meanU8, w, h, `${outDir}/background_model.png`);
console.log(`\nLearning/suppressed frames: ${String(learningCount)}`);
console.log(`Saved ${String(savedCount)} detection frames`);
console.log(`Results → ${outDir}`);
