import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rgbaToGray } from '../../src/content/image-ops.ts';
import {
  buildGaussianModel,
  gaussianSubtract,
  gaussianUpdate,
  detectSceneChange,
  processFrame,
} from '../../src/content/background-model.ts';
import type { BGSubtractor } from '../../src/content/background-model.ts';
import { loadFrame, FRAMES } from './sprite-test-helpers.ts';

// --- Unit tests for individual functions ---

void test('buildGaussianModel: sets mean to pixel values and variance to initialVariance', () => {
  const frame = new Uint8Array([100, 150, 200]);
  const sub = buildGaussianModel(frame, 3);
  assert.equal(sub.mean[0], 100);
  assert.equal(sub.mean[1], 150);
  assert.equal(sub.mean[2], 200);
  assert.equal(sub.variance[0], 200);
  assert.equal(sub.variance[1], 200);
  assert.equal(sub.variance[2], 200);
  assert.equal(sub.state, 'learning');
});

void test('gaussianSubtract: identical frame produces all zeros', () => {
  const mean = new Float32Array([100, 150, 200]);
  const variance = new Float32Array([25, 25, 25]);
  const gray = new Uint8Array([100, 150, 200]);
  const binary = gaussianSubtract(gray, mean, variance);
  assert.equal(binary[0], 0);
  assert.equal(binary[1], 0);
  assert.equal(binary[2], 0);
});

void test('gaussianSubtract: large delta with low variance → foreground', () => {
  const mean = new Float32Array([100]);
  const variance = new Float32Array([25]);
  const gray = new Uint8Array([150]);
  const binary = gaussianSubtract(gray, mean, variance, 2.5);
  assert.equal(binary[0], 255);
});

void test('gaussianSubtract: small delta with high variance → background', () => {
  const mean = new Float32Array([100]);
  const variance = new Float32Array([200]);
  const gray = new Uint8Array([103]);
  const binary = gaussianSubtract(gray, mean, variance, 2.5);
  assert.equal(binary[0], 0);
});

void test('gaussianUpdate: converges mean toward repeated value', () => {
  const mean = new Float32Array([0]);
  const variance = new Float32Array([100]);
  const gray = new Uint8Array([100]);
  const bg = new Uint8Array([0]);
  for (let i = 0; i < 500; i++) {
    gaussianUpdate(mean, variance, gray, bg, 0.05);
  }
  assert.ok(
    Math.abs((mean[0] ?? 0) - 100) < 1,
    `mean converged to ${String(mean[0])}`
  );
});

void test('gaussianUpdate: does not modify foreground pixels', () => {
  const mean = new Float32Array([50, 50]);
  const variance = new Float32Array([25, 25]);
  const gray = new Uint8Array([200, 200]);
  const fg = new Uint8Array([255, 255]);
  gaussianUpdate(mean, variance, gray, fg, 0.05);
  assert.equal(mean[0], 50);
  assert.equal(mean[1], 50);
  assert.equal(variance[0], 25);
  assert.equal(variance[1], 25);
});

void test('gaussianUpdate: alpha=1.0 sets mean to gray instantly', () => {
  const mean = new Float32Array([0]);
  const variance = new Float32Array([100]);
  const gray = new Uint8Array([77]);
  const bg = new Uint8Array([0]);
  gaussianUpdate(mean, variance, gray, bg, 1.0);
  assert.ok(Math.abs((mean[0] ?? 0) - 77) < 0.01);
});

void test('detectSceneChange: low change returns false', () => {
  const binary = new Uint8Array(100);
  binary[0] = 255;
  const { isSceneChange } = detectSceneChange(binary, 100, 0.15);
  assert.equal(isSceneChange, false);
});

void test('detectSceneChange: high change returns true', () => {
  const binary = new Uint8Array(100).fill(255);
  const { isSceneChange } = detectSceneChange(binary, 100, 0.15);
  assert.equal(isSceneChange, true);
});

void test('processFrame: running state with scene change transitions to learning', () => {
  const sub: BGSubtractor = {
    mean: new Float32Array(100).fill(0),
    variance: new Float32Array(100).fill(25),
    state: 'running',
    framesInState: 10,
  };
  const gray = new Uint8Array(100).fill(200);
  const result = processFrame(sub, gray, { sceneChangeRatio: 0.15 });
  assert.equal(result.binary, null);
  assert.equal(sub.state, 'learning');
});

void test('processFrame: learning transitions to running after learnFrames', () => {
  const sub: BGSubtractor = {
    mean: new Float32Array(10).fill(100),
    variance: new Float32Array(10).fill(25),
    state: 'learning',
    framesInState: 0,
  };
  const gray = new Uint8Array(10).fill(100);
  for (let i = 0; i < 60; i++) {
    processFrame(sub, gray, { learnFrames: 60 });
  }
  assert.equal(sub.state, 'running');
});

void test('processFrame: scene change mid-learning resets framesInState', () => {
  const sub: BGSubtractor = {
    mean: new Float32Array(100).fill(100),
    variance: new Float32Array(100).fill(25),
    state: 'learning',
    framesInState: 30,
  };
  const gray = new Uint8Array(100).fill(250);
  processFrame(sub, gray, { sceneChangeRatio: 0.15 });
  assert.equal(sub.state, 'learning');
  assert.equal(sub.framesInState, 1);
});

void test('processFrame: running state returns binary mask for stable frame', () => {
  const sub: BGSubtractor = {
    mean: new Float32Array(100).fill(100),
    variance: new Float32Array(100).fill(25),
    state: 'running',
    framesInState: 0,
  };
  const gray = new Uint8Array(100).fill(100);
  gray[0] = 200;
  const result = processFrame(sub, gray, { sceneChangeRatio: 0.15 });
  assert.ok(result.binary !== null);
  assert.equal(result.binary[0], 255);
  assert.equal(result.binary[1], 0);
});

// --- Integration: feed 300 consecutive frames through processFrame ---

void test('300 frames: model learns then detects foreground', () => {
  const first = loadFrame(FRAMES[0] ?? 150);
  const pixelCount = first.width * first.height;
  const firstGray = rgbaToGray(first.rgba, first.width, first.height);
  const sub = buildGaussianModel(firstGray, pixelCount);

  let nullCount = 0;
  let detectCount = 0;
  let totalFgPixels = 0;

  for (const num of FRAMES) {
    const f = loadFrame(num);
    const gray = rgbaToGray(f.rgba, f.width, f.height);
    const { binary } = processFrame(sub, gray);
    if (binary === null) {
      nullCount++;
    } else {
      detectCount++;
      for (let i = 0; i < binary.length; i++) {
        if ((binary[i] ?? 0) !== 0) {
          totalFgPixels++;
        }
      }
    }
  }

  // Learning phase should produce nulls (at least learnFrames=60)
  assert.ok(nullCount >= 60, `expected >=60 null frames, got ${nullCount}`);
  // After learning, should produce detections
  assert.ok(detectCount > 0, 'expected detection frames after learning');
  // Should find some foreground pixels in detection frames
  assert.ok(
    totalFgPixels > 0,
    'expected foreground pixels in detection output'
  );
  assert.equal(sub.state, 'running');
});

void test('300 frames: no scene change triggered during normal gameplay', () => {
  const first = loadFrame(FRAMES[0] ?? 150);
  const pixelCount = first.width * first.height;
  const firstGray = rgbaToGray(first.rgba, first.width, first.height);
  const sub = buildGaussianModel(firstGray, pixelCount);

  let sceneChanges = 0;
  let prevState: 'learning' | 'running' = 'learning';
  let reachedRunning = false;

  for (const num of FRAMES) {
    const f = loadFrame(num);
    const gray = rgbaToGray(f.rgba, f.width, f.height);
    processFrame(sub, gray);
    if (prevState === 'running' && sub.state === 'learning') {
      sceneChanges++;
    }
    if (sub.state === 'running') {
      reachedRunning = true;
    }
    prevState = sub.state;
  }

  assert.ok(reachedRunning, 'model should reach running state');
  assert.equal(
    sceneChanges,
    0,
    'no scene changes expected in continuous gameplay'
  );
});

void test('300 frames: detection frames have reasonable fg ratio', () => {
  const first = loadFrame(FRAMES[0] ?? 150);
  const pixelCount = first.width * first.height;
  const firstGray = rgbaToGray(first.rgba, first.width, first.height);
  const sub = buildGaussianModel(firstGray, pixelCount);

  const fgRatios: number[] = [];

  for (const num of FRAMES) {
    const f = loadFrame(num);
    const gray = rgbaToGray(f.rgba, f.width, f.height);
    const { binary } = processFrame(sub, gray);
    if (binary !== null) {
      let fg = 0;
      for (let i = 0; i < binary.length; i++) {
        if ((binary[i] ?? 0) !== 0) {
          fg++;
        }
      }
      fgRatios.push(fg / pixelCount);
    }
  }

  // Foreground should never exceed scene change threshold
  for (const ratio of fgRatios) {
    assert.ok(
      ratio < 0.15,
      `fg ratio ${ratio.toFixed(3)} exceeds scene threshold`
    );
  }
  // Should detect some foreground (sprites moving)
  const maxRatio = Math.max(...fgRatios);
  assert.ok(
    maxRatio > 0.001,
    `expected some fg pixels, max ratio was ${maxRatio.toFixed(4)}`
  );
});
