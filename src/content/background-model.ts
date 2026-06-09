/**
 * Stateless background model operations for sprite extraction.
 * All pure functions — no module-level state.
 */

export function buildMedianModel(
  frames: Uint8Array[],
  pixelCount: number
): Uint8Array {
  const frameCount = frames.length;
  const bgModel = new Uint8Array(pixelCount);
  const sortBuf = new Uint8Array(frameCount);

  for (let i = 0; i < pixelCount; i++) {
    for (let f = 0; f < frameCount; f++) {
      const frame = frames[f];
      sortBuf[f] = frame ? (frame[i] ?? 0) : 0;
    }
    sortBuf.sort();
    bgModel[i] = sortBuf[Math.floor(frameCount / 2)] ?? 0;
  }
  return bgModel;
}

export function detectSceneChange(
  binary: Uint8Array,
  pixelCount: number,
  threshold: number
): { isSceneChange: boolean; changeRatio: number } {
  let changedPixels = 0;
  for (let i = 0; i < binary.length; i++) {
    if (binary[i] !== 0) {
      changedPixels++;
    }
  }
  const changeRatio = changedPixels / pixelCount;
  return { isSceneChange: changeRatio > threshold, changeRatio };
}

/** Mutates bgModel in-place — blends static pixels toward current frame. */
export function adaptiveBlend(
  bgModel: Uint8Array,
  gray: Uint8Array,
  binary: Uint8Array,
  rate: number
): void {
  for (let i = 0; i < bgModel.length; i++) {
    if (binary[i] === 0) {
      bgModel[i] = Math.round(
        (bgModel[i] ?? 0) * (1 - rate) + (gray[i] ?? 0) * rate
      );
    }
  }
}
