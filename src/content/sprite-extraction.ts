import { MSG_SOURCE } from '@/types/messages';
import type { LoadSpritesResponse } from '@/types/messages';

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

  // Load OpenCV
  const cv = await loadOpenCV();
  if (!cv) {
    postToast('Failed to load OpenCV');
    session.destroy();
    return;
  }

  // Capture and process loop
  const canvas = new OffscreenCanvas(video.videoWidth || 1920, video.videoHeight || 1080);
  const ctx = canvas.getContext('2d');
  if (!ctx) {return;}
  const cvState: { prevGray: CVMat | null } = { prevGray: null };
  let frameCount = 0;

  const processFrame = async (): Promise<void> => {
    if (extractionState.stopRequested) {return;}

    frameCount++;
    if (frameCount % 5 !== 0) {return;}

    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const frame = cv.matFromImageData(imageData);
    const gray = new cv.Mat();
    cv.cvtColor(frame, gray, cv.COLOR_RGBA2GRAY);
    frame.delete();

     
    if (!cvState.prevGray) {
      cvState.prevGray = gray;
      return;
    }

    const diff = new cv.Mat();
    cv.absdiff(gray, cvState.prevGray, diff);
    cvState.prevGray.delete();
    cvState.prevGray = gray;

    const thresh = new cv.Mat();
    cv.threshold(diff, thresh, 30, 255, cv.THRESH_BINARY);
    diff.delete();

    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    thresh.delete();
    hierarchy.delete();

    const candidates: { x: number; y: number; w: number; h: number }[] = [];
    const frameArea = canvas.width * canvas.height;
    for (let i = 0; i < contours.size(); i++) {
      const rect = cv.boundingRect(contours.get(i));
      if (rect.width < 8 || rect.height < 8) {continue;}
      if (rect.width * rect.height > frameArea * 0.25) {continue;}
      candidates.push({ x: rect.x, y: rect.y, w: rect.width, h: rect.height });
    }
    contours.delete();

    for (const cand of candidates.slice(0, 2)) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- externally mutated via blur/stop
      if (extractionState.stopRequested) {break;}

      const cropBitmap = await createImageBitmap(
        imageData, cand.x, cand.y, cand.w, cand.h
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
                  'Identify this game sprite/UI element. Respond with JSON: {"label":"short_snake_case_label","accept":true/false}. Accept if this is a clear, distinct game sprite or UI element. Reject noise or background fragments.',
              },
            ],
          },
        ]);

        const parsed = parseAIResponse(result);
        if (parsed && parsed.accept && !knownLabels.has(parsed.label)) {
          knownLabels.add(parsed.label);

          const cropCanvas = new OffscreenCanvas(cand.w, cand.h);
          const cropCtx = cropCanvas.getContext('2d');
          if (!cropCtx) {continue;}
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
    if (extractionState.stopRequested) {return;}
    void processFrame().then(() => {
      if (!extractionState.stopRequested) {
        if ('requestVideoFrameCallback' in video) {
          (video as HTMLVideoElement & { requestVideoFrameCallback: (cb: () => void) => void })
            .requestVideoFrameCallback(loop);
        } else {
          setTimeout(loop, 1000 / 12);
        }
      }
    });
  };

  if ('requestVideoFrameCallback' in video) {
    (video as HTMLVideoElement & { requestVideoFrameCallback: (cb: () => void) => void })
      .requestVideoFrameCallback(loop);
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

  if (cvState.prevGray) {
    cvState.prevGray.delete();
  }
  session.destroy();
  postToast('Sprite extraction stopped');
}

function parseAIResponse(text: string): { label: string; accept: boolean } | null {
  try {
    const match = text.match(/\{[^}]+\}/);
    if (!match) {return null;}
    const obj = JSON.parse(match[0]) as Record<string, unknown>;
    if (typeof obj['label'] === 'string' && typeof obj['accept'] === 'boolean') {
      return {
        label: obj['label'].toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        accept: obj['accept'],
      };
    }
  } catch {
    // parse error
  }
  return null;
}

// OpenCV types (minimal interface for what we use)
interface CVMat {
  delete(): void;
}

interface CVMatVector {
  size(): number;
  get(i: number): CVMat;
  delete(): void;
}

interface OpenCVModule {
  Mat: new () => CVMat;
  MatVector: new () => CVMatVector;
  matFromImageData(data: ImageData): CVMat;
  cvtColor(src: CVMat, dst: CVMat, code: number): void;
  absdiff(a: CVMat, b: CVMat, dst: CVMat): void;
  threshold(src: CVMat, dst: CVMat, thresh: number, maxval: number, type: number): void;
  findContours(src: CVMat, contours: CVMatVector, hierarchy: CVMat, mode: number, method: number): void;
  boundingRect(contour: CVMat): { x: number; y: number; width: number; height: number };
  COLOR_RGBA2GRAY: number;
  THRESH_BINARY: number;
  RETR_EXTERNAL: number;
  CHAIN_APPROX_SIMPLE: number;
}

let cvModule: OpenCVModule | null = null;

async function loadOpenCV(): Promise<OpenCVModule | null> {
  if (cvModule) {return cvModule;}
  try {
    const mod = await import('@techstark/opencv-js');
    const cv = mod.default as unknown as OpenCVModule & { onRuntimeInitialized?: () => void };
    if (typeof cv.onRuntimeInitialized === 'undefined') {
      cvModule = cv;
      return cv;
    }
    await new Promise<void>((resolve) => {
      cv.onRuntimeInitialized = resolve;
    });
    cvModule = cv;
    return cv;
  } catch {
    return null;
  }
}
