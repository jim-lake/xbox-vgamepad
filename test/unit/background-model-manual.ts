/**
 * Manual background-removal visualization.
 * Outputs background model, binary masks, and foreground-only images to /tmp/.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { rgbaToGray, absdiff, threshold } from '../../src/content/image-ops.ts';
import { buildMedianModel } from '../../src/content/background-model.ts';
import {
  loadFrame,
  BG_MODEL_FRAMES,
  PROCESSING_FRAMES,
} from './sprite-test-helpers.ts';

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

// Build background model
const bgGrayFrames: Uint8Array[] = [];
let frameW = 0;
let frameH = 0;
for (const num of BG_MODEL_FRAMES) {
  const f = loadFrame(num);
  frameW = f.width;
  frameH = f.height;
  bgGrayFrames.push(rgbaToGray(f.rgba, f.width, f.height));
}
const pixelCount = frameW * frameH;
const bgModel = buildMedianModel(bgGrayFrames, pixelCount);

// Save background model
saveGrayPng(bgModel, frameW, frameH, `${outDir}/background_model.png`);
console.log(`Background model → ${outDir}/background_model.png`);

// Process each frame: save binary mask + foreground-only
for (const num of PROCESSING_FRAMES) {
  const f = loadFrame(num);
  const gray = rgbaToGray(f.rgba, f.width, f.height);
  const diff = absdiff(gray, bgModel);
  const bin = threshold(diff, 35);

  saveGrayPng(bin, frameW, frameH, `${outDir}/binary_${num}.png`);
  saveRgbaMasked(
    f.rgba,
    bin,
    frameW,
    frameH,
    `${outDir}/foreground_${num}.png`
  );
  console.log(`Frame ${num} → binary_${num}.png, foreground_${num}.png`);
}

console.log(`\nResults → ${outDir}`);
