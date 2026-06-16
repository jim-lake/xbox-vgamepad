/**
 * Extract test frames from test.mp4.
 * Add spans to the array below — start_frame is computed from start_sec * 30.
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const MEDIA_DIR = resolve(import.meta.dirname, '..', 'test_media');
const VIDEO = resolve(MEDIA_DIR, 'test.mp4');
const FPS = 30;

const spans = [
  { startSec: 5, endSec: 15 },
  { startSec: 15, endSec: 85 },
  { startSec: 90, endSec: 100 },
];

function toTimestamp(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `00:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

for (const span of spans) {
  const startFrame = span.startSec * FPS;
  const lastFrame = span.endSec * FPS - 1;
  if (
    existsSync(resolve(MEDIA_DIR, `test_${startFrame}.png`)) &&
    existsSync(resolve(MEDIA_DIR, `test_${lastFrame}.png`))
  ) {
    console.log(
      `Skipping ${toTimestamp(span.startSec)} → ${toTimestamp(span.endSec)} (already extracted)`
    );
    continue;
  }
  const start = toTimestamp(span.startSec);
  const end = toTimestamp(span.endSec);
  console.log(`Extracting ${start} → ${end} (frame ${String(startFrame)})...`);
  execSync(
    `ffmpeg -y -loglevel warning -ss ${start} -to ${end} -i "${VIDEO}" -vf "fps=${String(FPS)}" -start_number ${String(startFrame)} "${MEDIA_DIR}/test_%d.png"`,
    { stdio: 'inherit' }
  );
}

console.log(`Done. Frames in ${MEDIA_DIR}/`);
