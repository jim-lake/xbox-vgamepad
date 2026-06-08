import { MSG_SOURCE } from '@/types/messages';
import type { LoadSpritesResponse } from '@/types/messages';
import { errorLog } from '@/tools/log';
import { rgbaToGray, absdiff, threshold, findBoundingRects } from './image-ops';

const extractionState = { running: false, stopRequested: false };

function postToast(text: string): void {
  window.postMessage({ source: MSG_SOURCE, type: 'SHOW_TOAST', text }, '*');
}

/**
 * Emit a debug artifact from the pipeline. Tests collect these generically.
 * `phase` identifies which pipeline step produced it, `meta` carries arbitrary
 * structured data, and `buffer` is an optional PNG image.
 */
function emitDebug(
  phase: string,
  meta: Record<string, unknown>,
  buffer?: ArrayBuffer
): void {
  window.postMessage(
    { source: MSG_SOURCE, type: 'EXTRACT_DEBUG', phase, meta, buffer },
    '*'
  );
}

/** Convert a grayscale Uint8Array region to a PNG ArrayBuffer via OffscreenCanvas. */
async function grayToPng(
  gray: Uint8Array,
  frameW: number,
  x: number,
  y: number,
  w: number,
  h: number
): Promise<ArrayBuffer> {
  const oc = new OffscreenCanvas(w, h);
  const octx = oc.getContext('2d');
  if (!octx) {
    return new ArrayBuffer(0);
  }
  const imgData = octx.createImageData(w, h);
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const src = (y + py) * frameW + (x + px);
      const dst = (py * w + px) * 4;
      const v = gray[src] ?? 0;
      imgData.data[dst] = v;
      imgData.data[dst + 1] = v;
      imgData.data[dst + 2] = v;
      imgData.data[dst + 3] = 255;
    }
  }
  octx.putImageData(imgData, 0, 0);
  const blob = await oc.convertToBlob({ type: 'image/png' });
  return blob.arrayBuffer();
}

/** Draw colored rects on an ImageData and return as PNG. */
async function drawRectsOnFrame(
  imageData: ImageData,
  rects: Array<{ x: number; y: number; w: number; h: number }>,
  color: [number, number, number]
): Promise<ArrayBuffer> {
  const oc = new OffscreenCanvas(imageData.width, imageData.height);
  const octx = oc.getContext('2d');
  if (!octx) {
    return new ArrayBuffer(0);
  }
  octx.putImageData(imageData, 0, 0);
  octx.strokeStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
  octx.lineWidth = 2;
  for (const r of rects) {
    octx.strokeRect(r.x, r.y, r.w, r.h);
  }
  const blob = await oc.convertToBlob({ type: 'image/png' });
  return blob.arrayBuffer();
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
  } catch (err: unknown) {
    errorLog('[sprite-extraction] runExtraction error:', err);
  } finally {
    window.removeEventListener('blur', onBlur);
    extractionState.running = false;
  }
}

/** Merge overlapping or nearby bounding rects. */
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

/**
 * Compute a simple perceptual hash for a crop (average luminance in 8x8 grid).
 * Returns a 64-bit hash as a string of '0'/'1'.
 */
function perceptualHash(
  gray: Uint8Array,
  frameW: number,
  x: number,
  y: number,
  w: number,
  h: number
): string {
  const cellW = w / 8;
  const cellH = h / 8;
  const values: number[] = [];

  for (let cy = 0; cy < 8; cy++) {
    for (let cx = 0; cx < 8; cx++) {
      const sx = Math.floor(x + cx * cellW);
      const sy = Math.floor(y + cy * cellH);
      const ex = Math.floor(x + (cx + 1) * cellW);
      const ey = Math.floor(y + (cy + 1) * cellH);
      let sum = 0;
      let count = 0;
      for (let py = sy; py < ey; py++) {
        for (let px = sx; px < ex; px++) {
          sum += gray[py * frameW + px] ?? 0;
          count++;
        }
      }
      values.push(count > 0 ? sum / count : 0);
    }
  }

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.map((v) => (v >= mean ? '1' : '0')).join('');
}

/** Hamming distance between two hash strings. */
function hammingDist(a: string, b: string): number {
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      d++;
    }
  }
  return d;
}

async function runExtraction(gameName: string): Promise<void> {
  const resp: LoadSpritesResponse = await chrome.runtime.sendMessage({
    source: MSG_SOURCE,
    type: 'LOAD_SPRITES',
    game: gameName,
  });
  const knownLabels = new Set<string>(resp.sprites.map((s) => s.spriteType));

  postToast(`Finding sprites for ${gameName}…`);

  let session: LanguageModel;
  try {
    session = await LanguageModel.create({
      expectedInputs: [{ type: 'image' }, { type: 'text', languages: ['en'] }],
      expectedOutputs: [{ type: 'text', languages: ['en'] }],
    });
  } catch (err: unknown) {
    errorLog('[sprite-extraction] LanguageModel.create failed:', err);
    postToast('AI model unavailable — ensure Gemini Nano is downloaded');
    return;
  }

  const video = document.querySelector('video');
  if (!video) {
    postToast('No video element found');
    session.destroy();
    return;
  }

  const w = video.videoWidth || 1920;
  const h = video.videoHeight || 1080;
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    session.destroy();
    return;
  }

  // --- STEP 1: Build background model (median of N frames) ---
  const BG_FRAMES = 15;
  const BG_INTERVAL = 100; // ms between captures
  const frameHistory: Uint8Array[] = [];

  for (let i = 0; i < BG_FRAMES; i++) {
    if (extractionState.stopRequested) {
      session.destroy();
      return;
    }
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(video, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    frameHistory.push(rgbaToGray(imgData.data, w, h));
    await new Promise<void>((r) => setTimeout(r, BG_INTERVAL));
  }

  // Compute median background
  const bgModel = new Uint8Array(w * h);
  const pixelCount = w * h;
  const sortBuf = new Uint8Array(BG_FRAMES);
  for (let i = 0; i < pixelCount; i++) {
    for (let f = 0; f < BG_FRAMES; f++) {
      const frame = frameHistory[f];
      sortBuf[f] = frame ? (frame[i] ?? 0) : 0;
    }
    sortBuf.sort();
    bgModel[i] = sortBuf[Math.floor(BG_FRAMES / 2)] ?? 0;
  }

  // Emit the background model image
  const bgPng = await grayToPng(bgModel, w, 0, 0, w, h);
  emitDebug('background_model', { w, h, frames: BG_FRAMES }, bgPng);

  // --- STEP 2: Extract moving objects by subtracting background ---
  let frameCount = 0;
  let candidateIndex = 0;
  const seenHashes: string[] = [];
  const HASH_THRESHOLD = 14; // hamming distance threshold for "same" candidate
  const maxDim = Math.min(w, h) * 0.2; // sprites rarely exceed ~200px on 1080p

  const processFrame = async (): Promise<void> => {
    if (extractionState.stopRequested) {
      return;
    }

    frameCount++;
    if (frameCount % 5 !== 0) {
      return;
    }

    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(video, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const gray = rgbaToGray(imageData.data, w, h);

    // Subtract background model
    const diff = absdiff(gray, bgModel);
    const binary = threshold(diff, 35);

    // Check if this is a scene change (>15% pixels changed = camera pan)
    let changedPixels = 0;
    for (let i = 0; i < binary.length; i++) {
      if (binary[i] !== 0) {
        changedPixels++;
      }
    }
    const changeRatio = changedPixels / pixelCount;
    if (changeRatio > 0.15) {
      // Scene shift — rebuild background model from this frame
      for (let i = 0; i < pixelCount; i++) {
        bgModel[i] = gray[i] ?? 0;
      }
      emitDebug('scene_change', { frameNum: frameCount, changeRatio });
      return;
    }

    // Emit the binary diff mask for this frame
    const diffPng = await grayToPng(binary, w, 0, 0, w, h);
    emitDebug(
      'binary_diff',
      { frameNum: frameCount, changedPixels, changeRatio },
      diffPng
    );

    const rawRects = findBoundingRects(binary, w, h);

    // Filter small noise
    const sizeFiltered: Array<{ x: number; y: number; w: number; h: number }> =
      [];
    for (const rect of rawRects) {
      if (rect.w < 10 || rect.h < 10) {
        continue;
      }
      if (rect.w > maxDim || rect.h > maxDim) {
        continue;
      }
      sizeFiltered.push(rect);
    }

    emitDebug(
      'size_filter',
      {
        frameNum: frameCount,
        rawCount: rawRects.length,
        afterFilter: sizeFiltered.length,
        rects: sizeFiltered,
      },
      await drawRectsOnFrame(imageData, sizeFiltered, [0, 255, 0])
    );

    // Merge nearby fragments of the same moving object
    const merged = mergeRects(sizeFiltered, 6);

    emitDebug(
      'merge_rects',
      {
        frameNum: frameCount,
        beforeMerge: sizeFiltered.length,
        afterMerge: merged.length,
        rects: merged,
      },
      await drawRectsOnFrame(imageData, merged, [255, 255, 0])
    );

    // Filter merged candidates
    const candidates: Array<{ x: number; y: number; w: number; h: number }> =
      [];
    const rejected: Array<{
      rect: { x: number; y: number; w: number; h: number };
      reason: string;
    }> = [];
    for (const rect of merged) {
      const area = rect.w * rect.h;
      if (area < 300) {
        rejected.push({ rect, reason: 'area_too_small' });
        continue;
      }
      if (rect.w > maxDim || rect.h > maxDim) {
        rejected.push({ rect, reason: 'dim_too_large' });
        continue;
      }
      if (area > w * h * 0.04) {
        rejected.push({ rect, reason: 'area_exceeds_4pct' });
        continue;
      }
      const aspect = Math.max(rect.w, rect.h) / Math.min(rect.w, rect.h);
      if (aspect > 5) {
        rejected.push({ rect, reason: 'aspect_ratio' });
        continue;
      }
      // Reject sparse regions — require at least 20% foreground density
      let fgCount = 0;
      for (let py = rect.y; py < rect.y + rect.h; py++) {
        for (let px = rect.x; px < rect.x + rect.w; px++) {
          if (binary[py * w + px] !== 0) {
            fgCount++;
          }
        }
      }
      const density = fgCount / area;
      if (density < 0.2) {
        rejected.push({
          rect,
          reason: `density_${(density * 100).toFixed(0)}pct`,
        });
        continue;
      }
      candidates.push(rect);
    }

    emitDebug(
      'density_filter',
      {
        frameNum: frameCount,
        accepted: candidates.length,
        rejected: rejected.length,
        rejections: rejected,
        candidates,
      },
      await drawRectsOnFrame(imageData, candidates, [0, 255, 255])
    );

    // --- STEP 3: Crop with padding and fuzzy dedup ---
    for (const cand of candidates) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- externally mutated
      if (extractionState.stopRequested) {
        break;
      }

      // Pad the crop to include surrounding context (25% on each side)
      const pad = Math.round(Math.max(cand.w, cand.h) * 0.25);
      const cx = Math.max(0, cand.x - pad);
      const cy = Math.max(0, cand.y - pad);
      const cw = Math.min(w - cx, cand.w + pad * 2);
      const ch = Math.min(h - cy, cand.h + pad * 2);

      // Compute perceptual hash on the cropped gray content (position-independent)
      const hash = perceptualHash(gray, w, cx, cy, cw, ch);
      const isDup = seenHashes.some(
        (h) => hammingDist(hash, h) < HASH_THRESHOLD
      );
      if (isDup) {
        emitDebug('dedup_rejected', {
          frameNum: frameCount,
          candidateIndex,
          rect: { x: cx, y: cy, w: cw, h: ch },
          hash,
        });
        continue;
      }
      seenHashes.push(hash);

      const cropBitmap = await createImageBitmap(imageData, cx, cy, cw, ch);
      const cropCanvas = new OffscreenCanvas(cw, ch);
      const cropCtx = cropCanvas.getContext('2d');
      if (!cropCtx) {
        continue;
      }
      cropCtx.drawImage(cropBitmap, 0, 0);
      const blob = await cropCanvas.convertToBlob({ type: 'image/png' });
      const buffer = await blob.arrayBuffer();

      emitDebug(
        'candidate',
        {
          frameNum: frameCount,
          index: candidateIndex,
          rect: { x: cx, y: cy, w: cw, h: ch },
          hash,
        },
        buffer
      );

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
        emitDebug('ai_result', {
          frameNum: frameCount,
          candidateIndex,
          rawResponse: result,
          parsed,
        });

        if (parsed && parsed.accept && !knownLabels.has(parsed.label)) {
          knownLabels.add(parsed.label);
          await chrome.runtime.sendMessage({
            source: MSG_SOURCE,
            type: 'SAVE_SPRITE',
            game: gameName,
            spriteType: parsed.label,
            buffer,
            w: cw,
            h: ch,
          });
          postToast(`Found: ${parsed.label}`);
        }
      } catch (err: unknown) {
        errorLog('[sprite-extraction] AI prompt error:', err);
        emitDebug('ai_error', {
          frameNum: frameCount,
          candidateIndex,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      candidateIndex++;
    }

    // Slowly adapt background model (blend in static parts of current frame)
    for (let i = 0; i < pixelCount; i++) {
      if (binary[i] === 0) {
        bgModel[i] = Math.round(
          (bgModel[i] ?? 0) * 0.95 + (gray[i] ?? 0) * 0.05
        );
      }
    }
  };

  // Frame loop
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
  } catch (err: unknown) {
    errorLog('[sprite-extraction] parseAIResponse error:', err);
  }
  return null;
}
