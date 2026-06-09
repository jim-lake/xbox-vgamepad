/**
 * Manual background-removal visualization using Gaussian model.
 * Feeds 300 consecutive frames through processFrame, saves outputs.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { rgbaToGray } from '../../src/content/image-ops.ts';
import {
  buildGaussianModel,
  processFrame,
} from '../../src/content/background-model.ts';
import { loadFrame, FRAMES } from './sprite-test-helpers.ts';

const startTime = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = `/tmp/background-model-${startTime}`;
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

// Initialize model from first frame
const firstNum = FRAMES[0];
if (firstNum === undefined) {
  throw new Error('No frames');
}
const first = loadFrame(firstNum);
const w = first.width;
const h = first.height;
const pixelCount = w * h;
const firstGray = rgbaToGray(first.rgba, w, h);
const sub = buildGaussianModel([firstGray], pixelCount);

// Feed all frames through processFrame, save every 30th detection
let savedCount = 0;
for (const num of FRAMES) {
  const f = loadFrame(num);
  const gray = rgbaToGray(f.rgba, w, h);
  const result = processFrame(sub, gray);

  if (result !== null && num % 30 === 0) {
    saveGrayPng(result, w, h, `${outDir}/binary_${num}.png`);
    saveRgbaMasked(f.rgba, result, w, h, `${outDir}/foreground_${num}.png`);
    console.log(`Frame ${num} → binary_${num}.png, foreground_${num}.png`);
    savedCount++;
  }
}

// Save final mean as background model
const meanU8 = new Uint8Array(pixelCount);
for (let i = 0; i < pixelCount; i++) {
  meanU8[i] = Math.round(Math.max(0, Math.min(255, sub.mean[i] ?? 0)));
}
saveGrayPng(meanU8, w, h, `${outDir}/background_model.png`);
console.log(`Background model → ${outDir}/background_model.png`);
console.log(`Saved ${String(savedCount)} detection frames`);
console.log(`\nResults → ${outDir}`);
