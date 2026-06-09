import { MSG_SOURCE } from '@/types/messages';
import { errorLog } from '@/tools/log';
import { rgbaToGray, absdiff, threshold, findBoundingRects } from './image-ops';
import { addCandidate, initKnownLabels, resetAi, isIdle } from './ai-sprite';

const extractionState = { running: false, stopRequested: false };

function postToast(text: string): void {
  window.postMessage({ source: MSG_SOURCE, type: 'SHOW_TOAST', text }, '*');
}

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

function emitCandidatesDone(): void {
  window.postMessage(
    { source: MSG_SOURCE, type: 'EXTRACT_CANDIDATES_DONE' },
    '*'
  );
}

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

export async function startFindSprites(
  gameName: string | null,
  videoStartTime?: number,
  videoEndTime?: number
): Promise<void> {
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
    resetAi();
    await initKnownLabels(gameName);
    await runExtraction(gameName, videoStartTime, videoEndTime);
  } catch (err: unknown) {
    errorLog('[sprite-extraction] runExtraction error:', err);
  } finally {
    window.removeEventListener('blur', onBlur);
    extractionState.running = false;
  }
}

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

function hammingDist(a: string, b: string): number {
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      d++;
    }
  }
  return d;
}

async function runExtraction(
  gameName: string,
  videoStartTime?: number,
  videoEndTime?: number
): Promise<void> {
  postToast(`Finding sprites for ${gameName}…`);

  const video = document.querySelector('video');
  if (!video) {
    postToast('No video element found');
    return;
  }

  const w = video.videoWidth || 1920;
  const h = video.videoHeight || 1080;
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }

  // If videoStartTime specified, seek to it
  if (videoStartTime !== undefined) {
    video.currentTime = videoStartTime;
    await new Promise<void>((r) => {
      video.addEventListener(
        'seeked',
        () => {
          r();
        },
        { once: true }
      );
    });
    await video.play();
  }

  // --- STEP 1: Build background model (median of N frames) ---
  const BG_FRAMES = 15;
  const BG_INTERVAL = 100;
  const frameHistory: Uint8Array[] = [];

  for (let i = 0; i < BG_FRAMES; i++) {
    if (extractionState.stopRequested) {
      return;
    }
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(video, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    frameHistory.push(rgbaToGray(imgData.data, w, h));
    await new Promise<void>((r) => setTimeout(r, BG_INTERVAL));
  }

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

  const bgPng = await grayToPng(bgModel, w, 0, 0, w, h);
  emitDebug('background_model', { w, h, frames: BG_FRAMES }, bgPng);

  // --- STEP 2: Frame loop — extract candidates, push to AI module ---
  let frameCount = 0;
  let candidateIndex = 0;
  const seenHashes: string[] = [];
  const HASH_THRESHOLD = 10;
  const maxDim = Math.min(w, h) * 0.2;

  // Spatial dedup: track recent candidate positions
  const recentRects: Array<{
    x: number;
    y: number;
    w: number;
    h: number;
    frame: number;
  }> = [];
  const SPATIAL_COOLDOWN = 30; // frames to remember a position

  function overlapsRecent(
    rect: { x: number; y: number; w: number; h: number },
    currentFrame: number
  ): boolean {
    for (let i = recentRects.length - 1; i >= 0; i--) {
      const r = recentRects[i]!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
      if (currentFrame - r.frame > SPATIAL_COOLDOWN) {
        recentRects.splice(0, i + 1);
        break;
      }
      // Compute overlap ratio (intersection / smaller area)
      const ix = Math.max(rect.x, r.x);
      const iy = Math.max(rect.y, r.y);
      const ix2 = Math.min(rect.x + rect.w, r.x + r.w);
      const iy2 = Math.min(rect.y + rect.h, r.y + r.h);
      if (ix < ix2 && iy < iy2) {
        const intersection = (ix2 - ix) * (iy2 - iy);
        const smaller = Math.min(rect.w * rect.h, r.w * r.h);
        if (intersection / smaller > 0.4) {
          return true;
        }
      }
    }
    return false;
  }

  const processFrame = async (): Promise<void> => {
    frameCount++;

    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(video, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const gray = rgbaToGray(imageData.data, w, h);

    const diff = absdiff(gray, bgModel);
    const binary = threshold(diff, 35);

    // Scene change detection
    let changedPixels = 0;
    for (let i = 0; i < binary.length; i++) {
      if (binary[i] !== 0) {
        changedPixels++;
      }
    }
    const changeRatio = changedPixels / pixelCount;
    if (changeRatio > 0.15) {
      for (let i = 0; i < pixelCount; i++) {
        bgModel[i] = gray[i] ?? 0;
      }
      emitDebug('scene_change', { frameNum: frameCount, changeRatio });
      return;
    }

    // Adaptive background blending
    for (let i = 0; i < pixelCount; i++) {
      if (binary[i] === 0) {
        bgModel[i] = Math.round(
          (bgModel[i] ?? 0) * 0.95 + (gray[i] ?? 0) * 0.05
        );
      }
    }

    const emitFrameDebug = frameCount <= 25;

    if (emitFrameDebug) {
      const diffPng = await grayToPng(binary, w, 0, 0, w, h);
      emitDebug(
        'binary_diff',
        { frameNum: frameCount, changedPixels, changeRatio },
        diffPng
      );
    }

    const rawRects = findBoundingRects(binary, w, h);

    // Size filter
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

    if (emitFrameDebug) {
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
    }

    // Merge nearby fragments
    const merged = mergeRects(sizeFiltered, 6);

    if (emitFrameDebug) {
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
    }

    // Density + constraint filter
    const candidates: Array<{ x: number; y: number; w: number; h: number }> =
      [];
    const rejected: Array<{
      rect: { x: number; y: number; w: number; h: number };
      reason: string;
    }> = [];
    for (const rect of merged) {
      const area = rect.w * rect.h;
      if (area < 600) {
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

    // Limit to top 3 candidates per frame (largest area = most likely real sprites)
    candidates.sort((a, b) => b.w * b.h - a.w * a.h);
    const frameCandidates = candidates.slice(0, 3);

    if (emitFrameDebug) {
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
    }

    // Crop, dedup, and send to AI module
    for (const cand of frameCandidates) {
      const pad = Math.round(Math.max(cand.w, cand.h) * 0.25);
      const cx = Math.max(0, cand.x - pad);
      const cy = Math.max(0, cand.y - pad);
      const cw = Math.min(w - cx, cand.w + pad * 2);
      const ch = Math.min(h - cy, cand.h + pad * 2);

      // Spatial overlap dedup — skip if similar position was recently extracted
      const paddedRect = { x: cx, y: cy, w: cw, h: ch };
      if (overlapsRecent(paddedRect, frameCount)) {
        continue;
      }

      // Perceptual hash dedup
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
      recentRects.push({ ...paddedRect, frame: frameCount });

      // Build background-removed crop
      const cropCanvas = new OffscreenCanvas(cw, ch);
      const cropCtx = cropCanvas.getContext('2d');
      if (!cropCtx) {
        continue;
      }

      const exterior = new Uint8Array(cw * ch);
      const floodStack: number[] = [];
      for (let px = 0; px < cw; px++) {
        if (binary[cy * w + (cx + px)] === 0) {
          floodStack.push(px);
        }
        if (binary[(cy + ch - 1) * w + (cx + px)] === 0) {
          floodStack.push((ch - 1) * cw + px);
        }
      }
      for (let py = 1; py < ch - 1; py++) {
        if (binary[(cy + py) * w + cx] === 0) {
          floodStack.push(py * cw);
        }
        if (binary[(cy + py) * w + (cx + cw - 1)] === 0) {
          floodStack.push(py * cw + cw - 1);
        }
      }
      for (const idx of floodStack) {
        exterior[idx] = 1;
      }
      while (floodStack.length > 0) {
        const idx = floodStack.pop()!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
        const px = idx % cw;
        const py = (idx - px) / cw;
        const neighbors = [
          py > 0 ? idx - cw : -1,
          py < ch - 1 ? idx + cw : -1,
          px > 0 ? idx - 1 : -1,
          px < cw - 1 ? idx + 1 : -1,
        ];
        for (const n of neighbors) {
          if (n >= 0 && exterior[n] === 0) {
            const nx = n % cw;
            const ny = (n - nx) / cw;
            if (binary[(cy + ny) * w + (cx + nx)] === 0) {
              exterior[n] = 1;
              floodStack.push(n);
            }
          }
        }
      }

      const cropData = cropCtx.createImageData(cw, ch);
      for (let py = 0; py < ch; py++) {
        for (let px = 0; px < cw; px++) {
          const srcIdx = ((cy + py) * w + (cx + px)) * 4;
          const dstIdx = (py * cw + px) * 4;
          cropData.data[dstIdx] = imageData.data[srcIdx] ?? 0;
          cropData.data[dstIdx + 1] = imageData.data[srcIdx + 1] ?? 0;
          cropData.data[dstIdx + 2] = imageData.data[srcIdx + 2] ?? 0;
          cropData.data[dstIdx + 3] = exterior[py * cw + px] !== 0 ? 0 : 255;
        }
      }

      // Emit candidate debug
      cropCtx.putImageData(cropData, 0, 0);
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

      // Send to AI module
      addCandidate(gameName, cropData);
      candidateIndex++;
    }
  };

  // Determine if we have a bounded time range
  const hasBounds = videoStartTime !== undefined && videoEndTime !== undefined;

  // Frame loop
  await new Promise<void>((resolve) => {
    let loopCount = 0;
    const loop = (): void => {
      if (extractionState.stopRequested) {
        resolve();
        return;
      }
      // Stop if video time exceeded the end bound
      if (hasBounds && video.currentTime >= videoEndTime) {
        resolve();
        return;
      }

      loopCount++;
      if (loopCount % 5 !== 0) {
        if ('requestVideoFrameCallback' in video) {
          (
            video as HTMLVideoElement & {
              requestVideoFrameCallback: (cb: () => void) => void;
            }
          ).requestVideoFrameCallback(loop);
        } else {
          setTimeout(loop, 1000 / 12);
        }
        return;
      }

      void processFrame().then(() => {
        if (extractionState.stopRequested) {
          resolve();
          return;
        }
        if (hasBounds && video.currentTime >= videoEndTime) {
          resolve();
          return;
        }
        if ('requestVideoFrameCallback' in video) {
          (
            video as HTMLVideoElement & {
              requestVideoFrameCallback: (cb: () => void) => void;
            }
          ).requestVideoFrameCallback(loop);
        } else {
          setTimeout(loop, 1000 / 12);
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
  });

  postToast('Sprite extraction stopped');
  emitCandidatesDone();

  // If AI has no pending work, emit idle immediately
  if (isIdle()) {
    window.postMessage({ source: MSG_SOURCE, type: 'EXTRACT_AI_IDLE' }, '*');
  }
}
