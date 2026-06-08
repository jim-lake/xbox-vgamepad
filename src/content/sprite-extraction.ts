import { MSG_SOURCE } from '@/types/messages';
import type { LoadSpritesResponse } from '@/types/messages';
import { rgbaToGray, absdiff, threshold, findBoundingRects } from './image-ops';

const extractionState = { running: false, stopRequested: false };

function postToast(text: string): void {
  window.postMessage({ source: MSG_SOURCE, type: 'SHOW_TOAST', text }, '*');
}

function postCandidate(
  rect: { x: number; y: number; w: number; h: number },
  index: number,
  frameNum: number,
  buffer: ArrayBuffer
): void {
  window.postMessage(
    {
      source: MSG_SOURCE,
      type: 'CANDIDATE_FOUND',
      rect,
      index,
      frameNum,
      buffer,
    },
    '*'
  );
}

export function stopFindSprites(): void {
  extractionState.stopRequested = true;
}

export async function startFindSprites(gameName: string | null): Promise<void> {
  if (extractionState.running) {
    extractionState.stopRequested = true;
    await new Promise<void>((r) => setTimeout(r, 100));
  }

  if (!gameName) {
    postToast('No game detected');
    return;
  }

  extractionState.running = true;
  extractionState.stopRequested = false;

  const onBlur = (): void => {
    extractionState.stopRequested = true;
  };
  window.addEventListener('blur', onBlur);

  try {
    await runExtraction(gameName);
  } finally {
    window.removeEventListener('blur', onBlur);
    extractionState.running = false;
  }
}

/** Merge overlapping or nearby bounding rects into larger rects. */
function mergeRects(
  rects: Array<{ x: number; y: number; w: number; h: number }>,
  gap: number
): Array<{ x: number; y: number; w: number; h: number }> {
  if (rects.length === 0) {
    return [];
  }
  const merged: Array<{ x: number; y: number; w: number; h: number }> = [];
  const used = new Uint8Array(rects.length);

  for (let i = 0; i < rects.length; i++) {
    if (used[i]) {
      continue;
    }
    const rect = rects[i];
    if (!rect) {
      continue;
    }
    let { x, y } = rect;
    let x2 = x + rect.w;
    let y2 = y + rect.h;
    let changed = true;

    while (changed) {
      changed = false;
      for (let j = i + 1; j < rects.length; j++) {
        if (used[j]) {
          continue;
        }
        const r = rects[j];
        if (!r) {
          continue;
        }
        const rx2 = r.x + r.w;
        const ry2 = r.y + r.h;
        // Check if rects overlap or are within gap pixels
        if (
          r.x <= x2 + gap &&
          rx2 >= x - gap &&
          r.y <= y2 + gap &&
          ry2 >= y - gap
        ) {
          x = Math.min(x, r.x);
          y = Math.min(y, r.y);
          x2 = Math.max(x2, rx2);
          y2 = Math.max(y2, ry2);
          used[j] = 1;
          changed = true;
        }
      }
    }
    merged.push({ x, y, w: x2 - x, h: y2 - y });
  }
  return merged;
}

/** Spatial key for deduplication — grid cell at 64px resolution. */
function spatialKey(rect: {
  x: number;
  y: number;
  w: number;
  h: number;
}): string {
  const cx = Math.round((rect.x + rect.w / 2) / 64);
  const cy = Math.round((rect.y + rect.h / 2) / 64);
  const sw = Math.round(rect.w / 32);
  const sh = Math.round(rect.h / 32);
  return `${cx},${cy},${sw},${sh}`;
}

async function runExtraction(gameName: string): Promise<void> {
  // Load existing sprites
  const resp: LoadSpritesResponse = await chrome.runtime.sendMessage({
    source: MSG_SOURCE,
    type: 'LOAD_SPRITES',
    game: gameName,
  });
  const knownLabels = new Set<string>(resp.sprites.map((s) => s.spriteType));

  postToast(`Finding sprites for ${gameName}…`);

  // Create AI session
  let session: LanguageModel;
  try {
    session = await LanguageModel.create({
      expectedInputs: [{ type: 'image' }, { type: 'text', languages: ['en'] }],
      expectedOutputs: [{ type: 'text', languages: ['en'] }],
    });
  } catch {
    postToast('AI model unavailable — ensure Gemini Nano is downloaded');
    return;
  }

  // Find video element
  const video = document.querySelector('video');
  if (!video) {
    postToast('No video element found');
    session.destroy();
    return;
  }

  // Capture and process loop
  const canvas = new OffscreenCanvas(
    video.videoWidth || 1920,
    video.videoHeight || 1080
  );
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    session.destroy();
    return;
  }
  let prevGray: Uint8Array | null = null;
  let frameCount = 0;
  const seenSpatialKeys = new Set<string>();
  let candidateIndex = 0;

  const processFrame = async (): Promise<void> => {
    if (extractionState.stopRequested) {
      return;
    }

    frameCount++;
    if (frameCount % 5 !== 0) {
      return;
    }

    const w = video.videoWidth || 1920;
    const h = video.videoHeight || 1080;
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(video, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);

    const gray = rgbaToGray(imageData.data, w, h);

    if (!prevGray) {
      prevGray = gray;
      return;
    }

    const diff = absdiff(gray, prevGray);
    prevGray = gray;

    const binary = threshold(diff, 40);
    const rawRects = findBoundingRects(binary, w, h);

    // Filter by size
    const frameArea = w * h;
    const sizeFiltered: Array<{ x: number; y: number; w: number; h: number }> =
      [];
    for (const rect of rawRects) {
      if (rect.w < 12 || rect.h < 12) {
        continue;
      }
      if (rect.w * rect.h > frameArea * 0.25) {
        continue;
      }
      sizeFiltered.push(rect);
    }

    // Merge nearby rects (fragments of same sprite)
    const merged = mergeRects(sizeFiltered, 8);

    // Filter merged: require minimum area and reasonable aspect ratio
    const candidates: Array<{ x: number; y: number; w: number; h: number }> =
      [];
    for (const rect of merged) {
      const area = rect.w * rect.h;
      if (area < 400) {
        continue; // at least 20x20 equivalent
      }
      const aspect = Math.max(rect.w, rect.h) / Math.min(rect.w, rect.h);
      if (aspect > 10) {
        continue; // too thin/long — likely an edge artifact
      }
      // Deduplicate by spatial position
      const key = spatialKey(rect);
      if (seenSpatialKeys.has(key)) {
        continue;
      }
      seenSpatialKeys.add(key);
      candidates.push(rect);
    }

    for (const cand of candidates) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- externally mutated via blur/stop
      if (extractionState.stopRequested) {
        break;
      }

      const cropBitmap = await createImageBitmap(
        imageData,
        cand.x,
        cand.y,
        cand.w,
        cand.h
      );

      const cropCanvas = new OffscreenCanvas(cand.w, cand.h);
      const cropCtx = cropCanvas.getContext('2d');
      if (!cropCtx) {
        continue;
      }
      cropCtx.drawImage(cropBitmap, 0, 0);
      const blob = await cropCanvas.convertToBlob({ type: 'image/png' });
      const buffer = await blob.arrayBuffer();

      postCandidate(cand, candidateIndex++, frameCount, buffer);

      try {
        const result = await session.prompt([
          {
            role: 'user',
            content: [
              { type: 'image', value: cropBitmap },
              {
                type: 'text',
                value:
                  'What is this game element? Reply ONLY with JSON: {"label":"your description","accept":true} if it is a clear game sprite or UI element, or {"label":"noise","accept":false} if not. Use a plain descriptive name like "health bar", "knight enemy", "tree", "gold coin".',
              },
            ],
          },
        ]);

        const parsed = parseAIResponse(result);
        if (parsed && parsed.accept && !knownLabels.has(parsed.label)) {
          knownLabels.add(parsed.label);

          await chrome.runtime.sendMessage({
            source: MSG_SOURCE,
            type: 'SAVE_SPRITE',
            game: gameName,
            spriteType: parsed.label,
            buffer,
            w: cand.w,
            h: cand.h,
          });

          postToast(`Found: ${parsed.label}`);
        }
      } catch {
        // AI prompt failed for this candidate, skip
      }
    }
  };

  // Frame loop using requestVideoFrameCallback or fallback
  const loop = (): void => {
    if (extractionState.stopRequested) {
      return;
    }
    void processFrame().then(() => {
      if (!extractionState.stopRequested) {
        if ('requestVideoFrameCallback' in video) {
          (
            video as HTMLVideoElement & {
              requestVideoFrameCallback: (cb: () => void) => void;
            }
          ).requestVideoFrameCallback(loop);
        } else {
          setTimeout(loop, 1000 / 12);
        }
      }
    });
  };

  if ('requestVideoFrameCallback' in video) {
    (
      video as HTMLVideoElement & {
        requestVideoFrameCallback: (cb: () => void) => void;
      }
    ).requestVideoFrameCallback(loop);
  } else {
    setTimeout(loop, 1000 / 12);
  }

  // Wait until stop
  await new Promise<void>((resolve) => {
    const check = setInterval(() => {
      if (extractionState.stopRequested) {
        clearInterval(check);
        resolve();
      }
    }, 200);
  });

  session.destroy();
  postToast('Sprite extraction stopped');
}

function parseAIResponse(
  text: string
): { label: string; accept: boolean } | null {
  try {
    const match = text.match(/\{[^}]+\}/);
    if (!match) {
      return null;
    }
    const obj = JSON.parse(match[0]) as Record<string, unknown>;
    if (
      typeof obj['label'] === 'string' &&
      typeof obj['accept'] === 'boolean'
    ) {
      return { label: obj['label'].trim(), accept: obj['accept'] };
    }
  } catch {
    // parse error
  }
  return null;
}
