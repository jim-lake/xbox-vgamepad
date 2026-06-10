/**
 * Per-pixel adaptive Gaussian background model for sprite extraction.
 * All pure functions — no module-level state.
 */

export interface BGSubtractor {
  mean: Float32Array;
  variance: Float32Array;
  state: 'learning' | 'running';
  framesInState: number;
}

const DEFAULT_K = 2.5;
const DEFAULT_RUNNING_ALPHA = 0.005;
const DEFAULT_LEARNING_ALPHA = 0.05;
const DEFAULT_LEARN_FRAMES = 60;
const DEFAULT_INITIAL_VARIANCE = 200;
const DEFAULT_VARIANCE_FLOOR = 25;

export function buildGaussianModel(
  firstFrame: Uint8Array,
  pixelCount: number
): BGSubtractor {
  const mean = new Float32Array(pixelCount);
  const variance = new Float32Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    mean[i] = firstFrame[i] ?? 0;
    variance[i] = DEFAULT_INITIAL_VARIANCE;
  }
  return { mean, variance, state: 'learning', framesInState: 0 };
}

export function gaussianSubtract(
  gray: Uint8Array,
  mean: Float32Array,
  variance: Float32Array,
  k: number = DEFAULT_K
): Uint8Array {
  const out = new Uint8Array(gray.length);
  const kSq = k * k;
  for (let i = 0; i < gray.length; i++) {
    const d = (gray[i] ?? 0) - (mean[i] ?? 0);
    out[i] = d * d > kSq * (variance[i] ?? 0) ? 255 : 0;
  }
  return out;
}

export function gaussianUpdate(
  mean: Float32Array,
  variance: Float32Array,
  gray: Uint8Array,
  binary: Uint8Array,
  alpha: number = DEFAULT_RUNNING_ALPHA,
  varianceFloor: number = DEFAULT_VARIANCE_FLOOR
): void {
  for (let i = 0; i < mean.length; i++) {
    if ((binary[i] ?? 0) === 0) {
      const x = gray[i] ?? 0;
      const m = mean[i] ?? 0;
      const v = variance[i] ?? 0;
      const newMean = (1 - alpha) * m + alpha * x;
      const d = x - newMean;
      mean[i] = newMean;
      variance[i] = Math.max((1 - alpha) * v + alpha * d * d, varianceFloor);
    }
  }
}

export function detectSceneChange(
  binary: Uint8Array,
  pixelCount: number,
  threshold: number
): { isSceneChange: boolean; changeRatio: number } {
  let changedPixels = 0;
  for (let i = 0; i < binary.length; i++) {
    if ((binary[i] ?? 0) !== 0) {
      changedPixels++;
    }
  }
  const changeRatio = changedPixels / pixelCount;
  return { isSceneChange: changeRatio > threshold, changeRatio };
}

export interface ProcessFrameResult {
  binary: Uint8Array | null;
  changeRatio: number;
}

export function processFrame(
  sub: BGSubtractor,
  gray: Uint8Array,
  options: {
    k?: number;
    runningAlpha?: number;
    learningAlpha?: number;
    learnFrames?: number;
    sceneChangeRatio?: number;
    suppressRatio?: number;
    initialVariance?: number;
    varianceFloor?: number;
  } = {}
): ProcessFrameResult {
  const {
    k = DEFAULT_K,
    runningAlpha = DEFAULT_RUNNING_ALPHA,
    learningAlpha = DEFAULT_LEARNING_ALPHA,
    learnFrames = DEFAULT_LEARN_FRAMES,
    sceneChangeRatio = 0.15,
    suppressRatio = 0.1,
    initialVariance = DEFAULT_INITIAL_VARIANCE,
    varianceFloor = DEFAULT_VARIANCE_FLOOR,
  } = options;

  const binary = gaussianSubtract(gray, sub.mean, sub.variance, k);
  const pixelCount = gray.length;
  const { isSceneChange, changeRatio } = detectSceneChange(
    binary,
    pixelCount,
    sceneChangeRatio
  );

  if (sub.state === 'running') {
    if (isSceneChange) {
      sub.state = 'learning';
      sub.framesInState = 0;
      for (let i = 0; i < sub.variance.length; i++) {
        sub.variance[i] = Math.max(sub.variance[i] ?? 0, initialVariance);
      }
      // just transition, don't update
      return { binary: null, changeRatio };
    }
    gaussianUpdate(
      sub.mean,
      sub.variance,
      gray,
      binary,
      runningAlpha,
      varianceFloor
    );
    if (changeRatio > suppressRatio) {
      return { binary: null, changeRatio };
    }
    return { binary, changeRatio };
  }

  // learning state
  if (isSceneChange) {
    sub.framesInState = 0;
    for (let i = 0; i < sub.variance.length; i++) {
      sub.variance[i] = Math.max(sub.variance[i] ?? 0, initialVariance);
    }
  } else {
    sub.framesInState++;
  }
  const allBg = new Uint8Array(pixelCount);
  gaussianUpdate(
    sub.mean,
    sub.variance,
    gray,
    allBg,
    learningAlpha,
    varianceFloor
  );

  if (sub.framesInState >= learnFrames) {
    sub.state = 'running';
    sub.framesInState = 0;
  }
  return { binary: null, changeRatio };
}
