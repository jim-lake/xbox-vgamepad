import { MSG_SOURCE } from '@/types/messages';
import { errorLog } from '@/tools/log';
import { arrayBufferToB64 } from '@/tools/array_b64';
import { rgbaToGray } from './image-ops';
import { findCandidateRects } from './bounding-rect';
import { buildGaussianModel, processFrame } from './background-model';
import { addCandidate, initKnownLabels, resetAi, isIdle } from './ai-sprite';
import {
  createCandidateQueue,
  processCandidates,
} from './sprite-candidate-queue';

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

  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(video, 0, 0, w, h);
  const firstFrame = rgbaToGray(ctx.getImageData(0, 0, w, h).data, w, h);
  const sub = buildGaussianModel(firstFrame, pixelCount);

  // Frame loop
  let candidateIndex = 0;
  const queue = createCandidateQueue();

  function processVideoFrame(): void {
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(video, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const gray = rgbaToGray(imageData.data, w, h);

    const { binary } = processFrame(sub, gray);

    if (!binary) {
      return;
    }

    const rects = findCandidateRects(binary, w, h, maxDim);
    const accepted = processCandidates(
      queue,
      rects,
      binary,
      imageData.data,
      w,
      h
    );

    for (const result of accepted) {
      const { paddedRect, cropData, cropW, cropH } = result;

      window.postMessage(
        {
          source: MSG_SOURCE,
          type: 'EXTRACT_DEBUG',
          phase: 'candidate',
          meta: {
            frameNum: queue.frameCount,
            index: candidateIndex,
            rect: paddedRect,
            hash: result.hash,
            score: result.score,
          },
          buffer: arrayBufferToB64(cropData.buffer as ArrayBuffer),
        },
        '*'
      );

      addCandidate(gameName, cropData, cropW, cropH, result.score);
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

      processVideoFrame();
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
