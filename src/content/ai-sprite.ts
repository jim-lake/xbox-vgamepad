import { MSG_SOURCE } from '@/types/messages';
import { errorLog } from '@/tools/log';
import { arrayBufferToB64 } from '@/tools/array_b64';

interface AiCandidate {
  gameName: string;
  data: Uint8ClampedArray;
  w: number;
  h: number;
  score?: number;
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
    const candidate = state.queue.shift();
    if (!candidate) {
      errorLog('[ai-sprite] queue shift returned undefined');
      break;
    }

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
        window.postMessage(
          {
            source: MSG_SOURCE,
            type: 'SHOW_TOAST',
            text: 'AI model unavailable — ensure Gemini Nano is downloaded',
          },
          '*'
        );
        state.processing = false;
        window.postMessage(
          { source: MSG_SOURCE, type: 'EXTRACT_AI_IDLE' },
          '*'
        );
        return;
      }
    }

    try {
      const { data, w, h } = candidate;
      // Composite onto black background for AI — transparent pixels become black
      const composed = new Uint8ClampedArray(w * h * 4);
      for (let i = 0; i < w * h; i++) {
        const si = i * 4;
        const a = data[si + 3] ?? 0;
        if (a === 255) {
          composed[si] = data[si] ?? 0;
          composed[si + 1] = data[si + 1] ?? 0;
          composed[si + 2] = data[si + 2] ?? 0;
          composed[si + 3] = 255;
        } else if (a > 0) {
          const af = a / 255;
          composed[si] = Math.round((data[si] ?? 0) * af);
          composed[si + 1] = Math.round((data[si + 1] ?? 0) * af);
          composed[si + 2] = Math.round((data[si + 2] ?? 0) * af);
          composed[si + 3] = 255;
        }
        // else stays 0,0,0,255 — black
        else {
          composed[si + 3] = 255;
        }
      }

      const bitmap = await createImageBitmap(new ImageData(composed, w, h));

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
      window.postMessage(
        {
          source: MSG_SOURCE,
          type: 'EXTRACT_DEBUG',
          phase: 'ai_result',
          meta: { rawResponse: result, parsed },
        },
        '*'
      );

      if (parsed && parsed.accept && !state.knownLabels.has(parsed.label)) {
        state.knownLabels.add(parsed.label);

        // Encode PNG via blob
        const blob = new Blob([new Uint8Array(composed.buffer)], {
          type: 'image/png',
        });
        const b64 = arrayBufferToB64(await blob.arrayBuffer());

        await chrome.runtime.sendMessage({
          source: MSG_SOURCE,
          type: 'SAVE_SPRITE',
          game: candidate.gameName,
          spriteType: parsed.label,
          buffer: b64,
          w,
          h,
        });
        window.postMessage(
          {
            source: MSG_SOURCE,
            type: 'SHOW_TOAST',
            text: `Found: ${parsed.label}`,
          },
          '*'
        );
      }
    } catch (err: unknown) {
      errorLog('[ai-sprite] AI prompt error:', err);
      window.postMessage(
        {
          source: MSG_SOURCE,
          type: 'EXTRACT_DEBUG',
          phase: 'ai_error',
          meta: { error: err instanceof Error ? err.message : String(err) },
        },
        '*'
      );
      state.session.destroy();
      state.session = null;
    }
  }

  state.processing = false;
  window.postMessage({ source: MSG_SOURCE, type: 'EXTRACT_AI_IDLE' }, '*');
}

export function addCandidate(
  gameName: string,
  data: Uint8ClampedArray,
  w: number,
  h: number,
  score?: number
): void {
  const entry: AiCandidate = { gameName, data, w, h };
  if (score !== undefined) {
    entry.score = score;
  }
  state.queue.push(entry);
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
