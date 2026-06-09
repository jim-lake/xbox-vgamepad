import { MSG_SOURCE } from '@/types/messages';
import { errorLog } from '@/tools/log';

interface AiCandidate {
  gameName: string;
  imageData: ImageData;
}

interface AiState {
  queue: AiCandidate[];
  processing: boolean;
  session: LanguageModel | null;
  knownLabels: Set<string>;
}

const state: AiState = {
  queue: [],
  processing: false,
  session: null,
  knownLabels: new Set(),
};

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

function postToast(text: string): void {
  window.postMessage({ source: MSG_SOURCE, type: 'SHOW_TOAST', text }, '*');
}

function emitIdle(): void {
  window.postMessage({ source: MSG_SOURCE, type: 'EXTRACT_AI_IDLE' }, '*');
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
    errorLog('[ai-sprite] parseAIResponse error:', err);
  }
  return null;
}

async function processNext(): Promise<void> {
  if (state.processing || state.queue.length === 0) {
    return;
  }
  state.processing = true;

  while (state.queue.length > 0) {
    const candidate = state.queue.shift()!; // eslint-disable-line @typescript-eslint/no-non-null-assertion

    if (!state.session) {
      try {
        state.session = await LanguageModel.create({
          expectedInputs: [
            { type: 'image' },
            { type: 'text', languages: ['en'] },
          ],
          expectedOutputs: [{ type: 'text', languages: ['en'] }],
        });
      } catch (err: unknown) {
        errorLog('[ai-sprite] LanguageModel.create failed:', err);
        postToast('AI model unavailable — ensure Gemini Nano is downloaded');
        state.processing = false;
        emitIdle();
        return;
      }
    }

    try {
      // Render on black background for AI
      const { imageData } = candidate;
      const aiCanvas = new OffscreenCanvas(imageData.width, imageData.height);
      const aiCtx = aiCanvas.getContext('2d')!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
      aiCtx.fillStyle = '#000000';
      aiCtx.fillRect(0, 0, imageData.width, imageData.height);
      aiCtx.putImageData(imageData, 0, 0);
      const bitmap = await createImageBitmap(aiCanvas);

      const result = await Promise.race([
        state.session.prompt([
          {
            role: 'user',
            content: [
              { type: 'image', value: bitmap },
              {
                type: 'text',
                value:
                  'What is this game element? Reply ONLY with JSON: {"label":"your description","accept":true} if it is a clear game sprite or UI element, or {"label":"noise","accept":false} if not. Use a plain descriptive name like "health bar", "knight enemy", "tree", "gold coin".',
              },
            ],
          },
        ]),
        new Promise<never>((_r, reject) =>
          setTimeout(() => {
            reject(new Error('AI prompt timeout'));
          }, 90000)
        ),
      ]);

      const parsed = parseAIResponse(result);
      emitDebug('ai_result', { rawResponse: result, parsed });

      if (parsed && parsed.accept && !state.knownLabels.has(parsed.label)) {
        state.knownLabels.add(parsed.label);

        // Convert to PNG for storage
        const blob = await aiCanvas.convertToBlob({ type: 'image/png' });
        const buffer = await blob.arrayBuffer();

        await chrome.runtime.sendMessage({
          source: MSG_SOURCE,
          type: 'SAVE_SPRITE',
          game: candidate.gameName,
          spriteType: parsed.label,
          buffer,
          w: imageData.width,
          h: imageData.height,
        });
        postToast(`Found: ${parsed.label}`);
      }
    } catch (err: unknown) {
      errorLog('[ai-sprite] AI prompt error:', err);
      emitDebug('ai_error', {
        error: err instanceof Error ? err.message : String(err),
      });
      // Destroy and recreate session on error (prompt may be stuck)
      state.session.destroy();
      state.session = null;
    }
  }

  state.processing = false;
  emitIdle();
}

export function addCandidate(gameName: string, imageData: ImageData): void {
  state.queue.push({ gameName, imageData });
  void processNext();
}

export async function initKnownLabels(gameName: string): Promise<void> {
  const resp: { sprites: Array<{ spriteType: string }> } =
    await chrome.runtime.sendMessage({
      source: MSG_SOURCE,
      type: 'LOAD_SPRITES',
      game: gameName,
    });
  state.knownLabels = new Set(resp.sprites.map((s) => s.spriteType));
}

export function resetAi(): void {
  state.queue = [];
  if (state.session) {
    state.session.destroy();
    state.session = null;
  }
  state.knownLabels = new Set();
}

export function isIdle(): boolean {
  return !state.processing && state.queue.length === 0;
}
