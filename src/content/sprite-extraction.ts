import { MSG_SOURCE } from '@/types/messages';
import type { LoadSpritesResponse } from '@/types/messages';
import { rgbaToGray, absdiff, threshold, findBoundingRects } from './image-ops';

const extractionState = { running: false, stopRequested: false };

function postToast(text: string): void {
  window.postMessage({ source: MSG_SOURCE, type: 'SHOW_TOAST', text }, '*');
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

    const binary = threshold(diff, 30);
    const rects = findBoundingRects(binary, w, h);

    const frameArea = w * h;
    const candidates: { x: number; y: number; w: number; h: number }[] = [];
    for (const rect of rects) {
      if (rect.w < 8 || rect.h < 8) {
        continue;
      }
      if (rect.w * rect.h > frameArea * 0.25) {
        continue;
      }
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

          const cropCanvas = new OffscreenCanvas(cand.w, cand.h);
          const cropCtx = cropCanvas.getContext('2d');
          if (!cropCtx) {
            continue;
          }
          cropCtx.drawImage(cropBitmap, 0, 0);
          const blob = await cropCanvas.convertToBlob({ type: 'image/png' });
          const buffer = await blob.arrayBuffer();

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
