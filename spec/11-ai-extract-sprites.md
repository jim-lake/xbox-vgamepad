# Sprite Extraction — Implementation Plan

## Goal

Add a "Find Sprites" button to the popup's Scripts section that triggers sprite
extraction in the isolated-world content script. Extraction is keyed by the
current game — it loads existing sprites to refine or starts fresh. Progress is
shown via toast notifications in the main world.

---

## Architecture Overview

```
POPUP (src/popup/)
  └── "Find Sprites" button in Scripts section
        │  chrome.tabs.sendMessage → content script
        ▼
ISOLATED WORLD — content script (src/content/)
  ├── Orchestrates all extraction logic
  ├── Captures frames from the WebRTC <video> element via OffscreenCanvas
  ├── Builds background model (median of 15 frames)
  ├── Background subtraction → threshold → flood fill → bounding rects
  ├── Size filter → merge → density filter → perceptual hash dedup
  ├── Uses the LanguageModel global (Chrome built-in Prompt API) for sprite
  │   verification & canonical-label selection
  ├── Sends SAVE_SPRITE / LOAD_SPRITES messages to service worker for persistence
  ├── Posts SHOW_TOAST messages via window.postMessage for the main-world
  │   toast renderer
  └── Posts EXTRACT_DEBUG messages at each pipeline phase for test observability

SERVICE WORKER (src/background/service-worker.ts)
  ├── Handles SAVE_SPRITE — writes sprite PNG buffers to IndexedDB
  ├── Handles LOAD_SPRITES — reads existing sprites for a game from IndexedDB
  └── Returns results to content script via sendResponse

MAIN WORLD (src/injected/main-world.ts)
  └── Reuses the existing src/injected/toast.ts helper (already wired). A
      'SHOW_TOAST' main-world message handler calls showToast(text).
```

### Why Each Piece Lives Where It Does

| Task                | Context                   | Reason                                                                         |
| ------------------- | ------------------------- | ------------------------------------------------------------------------------ |
| Frame capture       | Content script (isolated) | `<video>` lives in main DOM; isolated world has DOM access                     |
| Image processing    | Content script (isolated) | All image data already local; no message-passing per pixel                     |
| AI verification     | Content script (isolated) | `LanguageModel` is a global available in this context [verified by smoke test] |
| Storage (IndexedDB) | Service worker            | Single owner for persistence; survives page reloads                            |
| Toast notifications | Main world                | Toast DOM must render in the visible page                                      |
| Trigger button      | Popup                     | User initiates from the config UI                                              |

---

## Chrome AI API Surface

The smoke test confirms the following work in the isolated-world content script
context with Chrome Canary + the required flags:

```ts
// Global, no namespace prefix — NOT window.ai
declare const LanguageModel: {
  availability(opts?: LanguageModelCreateCoreOptions): Promise<Availability>;
  create(opts?: LanguageModelCreateOptions): Promise<LanguageModelSession>;
};
```

- The same global is available in any extension context (popup, content
  script, service worker) — the model is profile-wide, not context-scoped.
- Types ship with the installed `@types/dom-chromium-ai` package.
- `Availability = "unavailable" | "downloadable" | "downloading" | "available"`.
- Session creation (when model is cached): ~1–2ms.
- Single-prompt latency (multimodal with image): ~21s.

### Image input format

```ts
const session = await LanguageModel.create({
  expectedInputs: [{ type: 'image' }, { type: 'text', languages: ['en'] }],
  expectedOutputs: [{ type: 'text', languages: ['en'] }],
});

const result = await session.prompt([
  {
    role: 'user',
    content: [
      { type: 'image', value: bitmap }, // ImageBitmap from createImageBitmap()
      { type: 'text', value: 'prompt text...' },
    ],
  },
]);
```

---

## Messaging Contract

### Popup → Content Script (chrome.tabs.sendMessage)

```ts
{ source: MSG_SOURCE, type: 'START_FIND_SPRITES' }
```

### Content Script → Service Worker (chrome.runtime.sendMessage)

```ts
// Save a verified sprite
{
  source: MSG_SOURCE,
  type: 'SAVE_SPRITE',
  game: string,
  spriteType: string,    // AI-assigned label
  buffer: ArrayBuffer,   // PNG-encoded
  w: number,
  h: number,
}

// Load existing sprites for the current game
{ source: MSG_SOURCE, type: 'LOAD_SPRITES', game: string }
// Response: { sprites: Array<{ spriteType: string, buffer: ArrayBuffer, w: number, h: number }> }
```

### Content Script → Main World (window.postMessage)

```ts
// Toast notification
{ source: MSG_SOURCE, type: 'SHOW_TOAST', text: string }

// Debug pipeline output (tests collect these generically)
{ source: MSG_SOURCE, type: 'EXTRACT_DEBUG', phase: string, meta: Record<string, unknown>, buffer?: ArrayBuffer }
```

---

## Extraction Pipeline

### Step 1 — Background Model (1.5s startup)

Captures 15 frames at 100ms intervals and computes the **median** pixel value
at each position in grayscale. The median is robust to transient objects (they
appear in < 50% of frames and thus don't affect the median).

### Step 2 — Background Subtraction + Scene Change Detection

Each processed frame (every 5th via `requestVideoFrameCallback`) is compared
against the background model:

1. Convert RGBA → grayscale
2. `absdiff(frame, bgModel)` → difference image
3. `threshold(diff, 35)` → binary foreground mask
4. Count changed pixels — if > 15% of frame area, it's a scene change:
   - Replace background model instantly with current frame
   - Skip candidate extraction for this frame
5. For non-scene-change frames: slowly blend static pixels into background
   (5% per frame) for gradual adaptation

### Step 3 — Contour Detection + Size Filter

Flood-fill connected components in the binary mask → bounding rects.

Filter: reject rects < 10×10px (noise) or > 20% of frame height (~216px at 1080p).

### Step 4 — Merge + Density + Constraint Filter

1. **Merge**: combine rects within 6px gap (fragments of same sprite)
2. **Area**: reject < 300px² or > 4% of frame area
3. **Aspect ratio**: reject > 5:1 (edge artifacts)
4. **Density**: count binary-active pixels within rect; reject if < 20% of
   bounding box area (sparse compression artifacts)

### Step 5 — Perceptual Hash Dedup

Compute 64-bit hash (8×8 grid of average luminance) on the padded crop.
Reject if hamming distance < 14 from any previously seen hash. Prevents
identical sprites at different positions from generating duplicate candidates.

### Step 6 — Crop + AI Verification

1. Pad candidate rect by 25% on each side (captures full sprite beyond motion boundary)
2. `createImageBitmap()` from the frame's ImageData
3. Send crop + prompt to Gemini Nano multimodal
4. Parse JSON response: `{"label": "...", "accept": true/false}`
5. If accepted and label not already known → SAVE_SPRITE to IndexedDB

---

## Popup — Model Readiness Gate

**File:** `src/popup/find-sprites-section.tsx`

State machine:

| State          | Trigger                                                    | UI                                                             |
| -------------- | ---------------------------------------------------------- | -------------------------------------------------------------- |
| `unsupported`  | `typeof LanguageModel === 'undefined'`                     | Disabled section + help text                                   |
| `unavailable`  | `availability() === 'unavailable'`                         | Same + link to flag-setup docs                                 |
| `downloadable` | `availability() === 'downloadable'`                        | Button: "Download AI model (~1.5 GB)" → triggers `create(...)` |
| `downloading`  | `availability() === 'downloading'` OR `create()` in flight | Progress bar; button disabled                                  |
| `ready`        | `create()` resolved successfully                           | Button: "Find Sprites" → enabled                               |
| `error`        | `create()` rejected                                        | Error message + retry button                                   |

---

## Storage (Service Worker)

**File:** `src/background/sprite-store.ts`

```ts
interface SpriteRecord {
  game: string;
  spriteType: string; // canonical key
  buffer: ArrayBuffer; // PNG-encoded
  w: number;
  h: number;
  updatedAt: number;
}
```

IndexedDB database `xvg-sprites`, object store `sprites`, keyed by `${game}::${spriteType}`.

---

## Image Operations (No OpenCV)

**File:** `src/content/image-ops.ts`

Pure TypeScript implementations — no OpenCV, no WASM, no eval/Function (MV3 CSP safe):

- `rgbaToGray(data, w, h)` → Uint8Array
- `absdiff(a, b)` → Uint8Array
- `threshold(src, thresh)` → Uint8Array (binary 0/255)
- `findBoundingRects(binary, w, h)` → Array<{x, y, w, h}> (flood-fill connected components)

---

## Debug Output System

The pipeline emits `EXTRACT_DEBUG` messages via `window.postMessage`. The test
harness (`test/extract/shared.cjs`) collects all debug entries generically and
saves them to disk organized by phase.

Adding a new phase is a single `emitDebug('phase_name', { ...data }, optionalPngBuffer)`
call — no test code changes needed.

Each phase can emit:

- A PNG image (rendered frame with annotations, binary mask, crop, etc.)
- A JSON metadata object (rects, counts, filter reasons, AI responses)

Test output structure:

```
/tmp/extract-{testName}-{ts}/
  sprites/          # Final saved sprites
  candidates/       # All candidate crops
  debug/
    background_model/  # 1.png (grayscale bg), 1.json
    binary_diff/       # Per-frame foreground masks
    scene_change/      # Scene change events (json only)
    size_filter/       # Frame + green rects
    merge_rects/       # Frame + yellow rects
    density_filter/    # Frame + cyan rects (final accepted)
    dedup_rejected/    # Hash collision entries
    candidate/         # Individual crop PNGs
    ai_result/         # AI raw responses + parsed
    ai_error/          # AI failures
```

---

## Testing

### Test Infrastructure

- **Persistent profile**: `test/extract/profile/` (gitignored). Retains the 1.5GB model.
- **Chrome Canary** with AI flags (see EXTRACT.md for full flag list).
- **CDP extension loading**: `Extensions.loadUnpacked` (the only working method in Canary 151+).
- **`ignoreDefaultArgs: true`** required to prevent puppeteer from disabling OptimizationHints.

### Test Flow

1. Build extension in test mode
2. Start HTTP server on port 9444 serving `extract-exerciser.html` + video
3. Launch Canary with persistent profile + AI flags
4. Load extension via CDP
5. Navigate to exerciser page, wait for video ready
6. Set up `SHOW_TOAST` + `EXTRACT_DEBUG` message listeners
7. Trigger `START_FIND_SPRITES` via postMessage
8. Wait for extraction duration
9. Trigger `blur` to stop
10. Collect toasts, debug entries, candidates
11. Load sprites from IndexedDB via service worker CDP
12. Save all results to `/tmp/extract-{testName}-{ts}/`
13. Assert: extraction started, candidates found, AI verified, labels valid

---

## Lifecycle

Extraction runs indefinitely — there is no stopping condition. The system does
not know how many sprites exist or when it's "done." It continuously:

1. Captures frames and extracts candidates.
2. Deduplicates via perceptual hash against all previously seen candidates.
3. Verifies new candidates against the AI.
4. Saves accepted sprites to IndexedDB.

Extraction **stops** on window `blur` event — covers the user opening the
popup, switching tabs, or moving to another window. On restart, it loads
existing sprites from IndexedDB and skips known labels.

---

## File Changes Summary

| File                                  | Purpose                                                              |
| ------------------------------------- | -------------------------------------------------------------------- |
| `src/content/sprite-extraction.ts`    | Extraction orchestrator (background model + CV + AI pipeline)        |
| `src/content/image-ops.ts`            | Pure TS image operations (grayscale, absdiff, threshold, flood fill) |
| `src/content/index.ts`                | Wires `START_FIND_SPRITES` → orchestrator                            |
| `src/background/service-worker.ts`    | `SAVE_SPRITE` / `LOAD_SPRITES` handlers                              |
| `src/background/sprite-store.ts`      | IndexedDB wrapper                                                    |
| `src/popup/find-sprites-section.tsx`  | Model-readiness state machine + Find Sprites button                  |
| `src/popup/messaging.ts`              | `sendStartFindSprites()`                                             |
| `src/injected/main-world.ts`          | `SHOW_TOAST` → `showToast(text)`                                     |
| `test/extract/shared.cjs`             | Test infra: server, browser, extraction trigger, debug collection    |
| `test/extract/run-span.cjs`           | Generic span runner                                                  |
| `test/extract/extract-exerciser.html` | Test page: video + game title                                        |

---

## Dependencies

| Library         | Context        | Use                        | Source                                      |
| --------------- | -------------- | -------------------------- | ------------------------------------------- |
| `LanguageModel` | Content script | Built-in Chrome Prompt API | Global; types from `@types/dom-chromium-ai` |

No npm image processing dependencies. All CV operations are pure TypeScript.
`puppeteer-core` is a dev dependency for tests only.
