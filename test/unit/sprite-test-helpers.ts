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

/** 300 consecutive frames (150–449). */
export const FRAMES = Array.from({ length: 300 }, (_, i) => 150 + i);
