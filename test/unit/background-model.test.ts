import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rgbaToGray, absdiff, threshold } from '../../src/content/image-ops.ts';
import {
  buildMedianModel,
  detectSceneChange,
  adaptiveBlend,
} from '../../src/content/background-model.ts';
import {
  loadFrame,
  BG_MODEL_FRAMES,
  PROCESSING_FRAMES,
} from './sprite-test-helpers.ts';

const bgGrayFrames: Uint8Array[] = [];
let bgModel: Uint8Array = new Uint8Array(0);
let frameW = 0;
let frameH = 0;
let pixelCount = 0;

// Load all background frames up front
for (const num of BG_MODEL_FRAMES) {
  const f = loadFrame(num);
  frameW = f.width;
  frameH = f.height;
  bgGrayFrames.push(rgbaToGray(f.rgba, f.width, f.height));
}
pixelCount = frameW * frameH;
bgModel = buildMedianModel(bgGrayFrames, pixelCount);

void test('bg model: loads all 15 background frames at 1920x1080', () => {
  assert.equal(bgGrayFrames.length, 15);
  assert.equal(frameW, 1920);
  assert.equal(frameH, 1080);
});

void test('bg model: buildMedianModel produces correct size output', () => {
  assert.equal(bgModel.length, pixelCount);
});

void test('bg model: median values span a realistic range', () => {
  let min = 255;
  let max = 0;
  for (let i = 0; i < bgModel.length; i++) {
    const v = bgModel[i] ?? 0;
    if (v < min) {
      min = v;
    }
    if (v > max) {
      max = v;
    }
  }
  assert.ok(min >= 0);
  assert.ok(max <= 255);
  assert.ok(max - min > 50, `expected range > 50, got ${max - min}`);
});

void test('bg model: bg frame subtraction produces low change ratio', () => {
  const firstFrame = bgGrayFrames[0];
  assert.ok(firstFrame);
  const diff = absdiff(firstFrame, bgModel);
  const bin = threshold(diff, 35);
  const { changeRatio } = detectSceneChange(bin, pixelCount, 0.15);
  assert.ok(
    changeRatio < 0.15,
    `bg frame changeRatio ${changeRatio.toFixed(3)} exceeds scene threshold`
  );
});

void test('bg model: processing frames produce some foreground pixels', () => {
  let anyForeground = false;
  for (const num of PROCESSING_FRAMES) {
    const f = loadFrame(num);
    const gray = rgbaToGray(f.rgba, f.width, f.height);
    const diff = absdiff(gray, bgModel);
    const bin = threshold(diff, 35);
    let fgPixels = 0;
    for (let i = 0; i < bin.length; i++) {
      if (bin[i] !== 0) {
        fgPixels++;
      }
    }
    if (fgPixels > 0) {
      anyForeground = true;
    }
  }
  assert.ok(
    anyForeground,
    'expected at least one processing frame with foreground pixels'
  );
});

void test('bg model: detectSceneChange returns false for normal frame', () => {
  const f = loadFrame(PROCESSING_FRAMES[0]);
  const gray = rgbaToGray(f.rgba, f.width, f.height);
  const diff = absdiff(gray, bgModel);
  const bin = threshold(diff, 35);
  const { isSceneChange } = detectSceneChange(bin, pixelCount, 0.15);
  assert.equal(isSceneChange, false);
});

void test('bg model: adaptiveBlend shifts static pixels toward current', () => {
  const f = loadFrame(PROCESSING_FRAMES[0]);
  const gray = rgbaToGray(f.rgba, f.width, f.height);
  const diff = absdiff(gray, bgModel);
  const bin = threshold(diff, 35);

  const modelCopy = new Uint8Array(bgModel);
  adaptiveBlend(modelCopy, gray, bin, 0.05);

  let shifted = 0;
  for (let i = 0; i < modelCopy.length; i++) {
    if (bin[i] === 0 && modelCopy[i] !== bgModel[i]) {
      shifted++;
    }
  }
  assert.ok(shifted > 0, 'expected adaptiveBlend to shift some static pixels');
});

void test('bg model: adaptiveBlend does not modify foreground pixels', () => {
  const f = loadFrame(PROCESSING_FRAMES[0]);
  const gray = rgbaToGray(f.rgba, f.width, f.height);
  const diff = absdiff(gray, bgModel);
  const bin = threshold(diff, 35);

  const modelCopy = new Uint8Array(bgModel);
  adaptiveBlend(modelCopy, gray, bin, 0.05);

  for (let i = 0; i < modelCopy.length; i++) {
    if (bin[i] !== 0) {
      assert.equal(modelCopy[i], bgModel[i]);
    }
  }
});
