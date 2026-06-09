/**
 * Test helpers for loading PNG frames as raw pixel data for sprite unit tests.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';

const MEDIA_DIR = resolve(import.meta.dirname, '..', 'media');

export interface FrameData {
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
}

/** Load a test frame PNG and return its RGBA pixel data. */
export function loadFrame(frameNum: number): FrameData {
  const filePath = resolve(MEDIA_DIR, `test_${frameNum}.png`);
  const buf = readFileSync(filePath);
  const png = PNG.sync.read(buf);
  return {
    rgba: new Uint8ClampedArray(png.data),
    width: png.width,
    height: png.height,
  };
}

/** Frame numbers used in background model building (15 frames at 100ms from 5s). */
export const BG_MODEL_FRAMES = [
  150, 153, 156, 159, 162, 165, 168, 171, 174, 177, 180, 183, 186, 189, 192,
] as const;

/** Frame numbers for post-background processing. */
export const PROCESSING_FRAMES = [210, 240, 270, 300] as const;
