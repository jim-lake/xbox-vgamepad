import { MSG_SOURCE } from '@/types/messages';
import { errorLog } from '@/tools/log';
import { rgbaToGray, absdiff, threshold, findBoundingRects } from './image-ops';
import type { Rect } from './image-ops';
import {
  mergeRects,
  sizeFilter,
  densityFilter,
  perceptualHash,
  isDuplicate,
  overlapsRecent,
} from './sprite-helpers';
import {
  buildMedianModel,
  detectSceneChange,
  adaptiveBlend,
} from './background-model';
import { buildExteriorMask, applyCropMask } from './sprite-crop';
import { addCandidate, initKnownLabels, resetAi, isIdle } from './ai-sprite';

const EXTRACT_CONFIG = {
  bgFrames: 15,
  bgInterval: 100,
  threshold: 35,
  sceneChangeRatio: 0.15,
  blendRate: 0.05,
  minDim: 10,
  minArea: 600,
  maxAreaRatio: 0.04,
  maxAspect: 5,
  minDensity: 0.2,
  mergeGap: 6,
  hashThreshold: 10,
  spatialCooldown: 30,
  padRatio: 0.25,
  maxCandidatesPerFrame: 3,
} as const;

const extractionState = { running: false, stopRequested: false };

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
    window.postMessage(
      { source: MSG_SOURCE, type: 'SHOW_TOAST', text: 'No game detected' },
      '*'
    );
    return;
  }

  extractionState.running = true;
  extractionState.stopRequested = false;

  function onBlur(): void {
    extractionState.stopRequested = true;
  }
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

async function runExtraction(
  gameName: string,
  videoStartTime?: number,
  videoEndTime?: number
): Promise<void> {
  window.postMessage(
    {
      source: MSG_SOURCE,
      type: 'SHOW_TOAST',
      text: `Finding sprites for ${gameName}…`,
    },
    '*'
  );

  const videoEl = document.querySelector('video');
  if (!videoEl) {
    window.postMessage(
      {
        source: MSG_SOURCE,
        type: 'SHOW_TOAST',
        text: 'No video element found',
      },
      '*'
    );
    return;
  }
  const video: HTMLVideoElement = videoEl;

  const w = video.videoWidth || 1920;
  const h = video.videoHeight || 1080;
  const pixelCount = w * h;
  const frameArea = w * h;
  const maxDim = Math.min(w, h) * 0.2;
  const canvas = new OffscreenCanvas(w, h);
  const ctxOrNull = canvas.getContext('2d');
  if (!ctxOrNull) {
    return;
  }
  const ctx: OffscreenCanvasRenderingContext2D = ctxOrNull;

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
  const frameHistory: Uint8Array[] = [];
  for (let i = 0; i < EXTRACT_CONFIG.bgFrames; i++) {
    if (extractionState.stopRequested) {
      return;
    }
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(video, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    frameHistory.push(rgbaToGray(imgData.data, w, h));
    await new Promise<void>((r) => setTimeout(r, EXTRACT_CONFIG.bgInterval));
  }

  const bgModel = buildMedianModel(frameHistory, pixelCount);

  // --- STEP 2: Frame loop ---
  let frameCount = 0;
  let candidateIndex = 0;
  const seenHashes: string[] = [];
  const recentRects: Array<Rect & { frame: number }> = [];

  async function processFrame(): Promise<void> {
    frameCount++;

    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(video, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const gray = rgbaToGray(imageData.data, w, h);

    const diff = absdiff(gray, bgModel);
    const binary = threshold(diff, EXTRACT_CONFIG.threshold);

    // Scene change detection
    const scene = detectSceneChange(
      binary,
      pixelCount,
      EXTRACT_CONFIG.sceneChangeRatio
    );
    if (scene.isSceneChange) {
      for (let i = 0; i < pixelCount; i++) {
        bgModel[i] = gray[i] ?? 0;
      }
      return;
    }

    // Adaptive background blending
    adaptiveBlend(bgModel, gray, binary, EXTRACT_CONFIG.blendRate);

    // Size filter
    const rawRects = findBoundingRects(binary, w, h);
    const sizeFiltered = sizeFilter(rawRects, EXTRACT_CONFIG.minDim, maxDim);

    // Merge nearby fragments
    const merged = mergeRects(sizeFiltered, EXTRACT_CONFIG.mergeGap);

    // Density + constraint filter
    const { accepted: candidates } = densityFilter(
      merged,
      binary,
      w,
      frameArea,
      {
        minArea: EXTRACT_CONFIG.minArea,
        maxDim,
        maxAreaRatio: EXTRACT_CONFIG.maxAreaRatio,
        maxAspect: EXTRACT_CONFIG.maxAspect,
        minDensity: EXTRACT_CONFIG.minDensity,
      }
    );

    // Limit to top N candidates per frame (largest area = most likely real sprites)
    candidates.sort((a, b) => b.w * b.h - a.w * a.h);
    const frameCandidates = candidates.slice(
      0,
      EXTRACT_CONFIG.maxCandidatesPerFrame
    );

    // Crop, dedup, and send to AI module
    for (const cand of frameCandidates) {
      const pad = Math.round(
        Math.max(cand.w, cand.h) * EXTRACT_CONFIG.padRatio
      );
      const cx = Math.max(0, cand.x - pad);
      const cy = Math.max(0, cand.y - pad);
      const cw = Math.min(w - cx, cand.w + pad * 2);
      const ch = Math.min(h - cy, cand.h + pad * 2);

      // Spatial overlap dedup
      const paddedRect: Rect = { x: cx, y: cy, w: cw, h: ch };
      if (
        overlapsRecent(
          paddedRect,
          recentRects,
          frameCount,
          EXTRACT_CONFIG.spatialCooldown
        )
      ) {
        continue;
      }

      // Perceptual hash dedup
      const hash = perceptualHash(gray, w, paddedRect);
      if (isDuplicate(hash, seenHashes, EXTRACT_CONFIG.hashThreshold)) {
        window.postMessage(
          {
            source: MSG_SOURCE,
            type: 'EXTRACT_DEBUG',
            phase: 'dedup_rejected',
            meta: {
              frameNum: frameCount,
              candidateIndex,
              rect: paddedRect,
              hash,
            },
          },
          '*'
        );
        continue;
      }
      seenHashes.push(hash);
      recentRects.push({ ...paddedRect, frame: frameCount });

      // Build background-removed crop
      const exterior = buildExteriorMask(binary, w, cx, cy, cw, ch);
      const cropData = applyCropMask(
        imageData.data,
        w,
        exterior,
        cx,
        cy,
        cw,
        ch
      );

      const cropCanvas = new OffscreenCanvas(cw, ch);
      const cropCtx = cropCanvas.getContext('2d');
      if (!cropCtx) {
        continue;
      }
      cropCtx.putImageData(cropData, 0, 0);

      const blob = await cropCanvas.convertToBlob({ type: 'image/png' });
      const buffer = await blob.arrayBuffer();
      window.postMessage(
        {
          source: MSG_SOURCE,
          type: 'EXTRACT_DEBUG',
          phase: 'candidate',
          meta: {
            frameNum: frameCount,
            index: candidateIndex,
            rect: paddedRect,
            hash,
          },
          buffer,
        },
        '*'
      );

      // Send to AI module
      addCandidate(gameName, cropData);
      candidateIndex++;
    }
  }

  // Determine if we have a bounded time range
  const hasBounds = videoStartTime !== undefined && videoEndTime !== undefined;

  // Frame loop
  await new Promise<void>((resolve) => {
    let loopCount = 0;
    function loop(): void {
      if (extractionState.stopRequested) {
        resolve();
        return;
      }
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

  window.postMessage(
    {
      source: MSG_SOURCE,
      type: 'SHOW_TOAST',
      text: 'Sprite extraction stopped',
    },
    '*'
  );
  window.postMessage(
    { source: MSG_SOURCE, type: 'EXTRACT_CANDIDATES_DONE' },
    '*'
  );

  if (isIdle()) {
    window.postMessage({ source: MSG_SOURCE, type: 'EXTRACT_AI_IDLE' }, '*');
  }
}
