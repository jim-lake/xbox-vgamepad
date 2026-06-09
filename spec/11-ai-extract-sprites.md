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
  ├── Builds per-pixel Gaussian background model (mean + variance)
  ├── k-sigma foreground detection with state machine (learning/running)
  ├── Size filter → merge → density filter → perceptual hash + spatial dedup
  ├── Background-removed crop (exterior flood-fill → transparent)
  ├── Async AI queue: LanguageModel (Gemini Nano) for sprite verification
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

### Step 1 — Background Model (Per-Pixel Gaussian, 1.5s startup)

Captures 15 frames at 100ms intervals and builds a per-pixel Gaussian model
via `buildGaussianModel()` from `src/content/background-model.ts`.

- Each pixel gets its own `mean` and `variance` in `Float32Array`s
- Multiple frames: mean = average, variance = measured (floored at `varianceFloor=25`)
- Single frame fallback: mean = pixel value, variance = `initialVariance=200`
- Model starts in `learning` state — detection suppressed for first 60 frames

### Step 2 — Foreground Detection (k-sigma + State Machine)

Each processed frame (every 5th via `requestVideoFrameCallback`) goes through
`processFrame()` which manages detection and model adaptation:

1. Convert RGBA → grayscale
2. `gaussianSubtract(gray, mean, variance, k=2.5)` → binary mask
   - Foreground if `(x - μ)² > k² * σ²` — per-pixel adaptive threshold
3. Scene change detection: if >15% of pixels differ → transition to `learning`:
   - Output suppressed (`null` returned), no candidates generated
   - Variance widened to `initialVariance`, alpha raised to 0.05
   - After 60 stable frames, transitions back to `running`
4. During `running`: update mean/variance at `runningAlpha=0.005` (background pixels only)
5. Variance floor (`25`) prevents zero-width detection bands

### Step 3 — Contour Detection + Size Filter

Flood-fill connected components in the binary mask → bounding rects.

Filter: reject rects < 10×10px (noise) or > 20% of frame height (~216px at 1080p).

### Step 4 — Merge + Density + Constraint Filter

1. **Merge**: combine rects within 6px gap (fragments of same sprite)
2. **Area**: reject < 600px² or > 4% of frame area
3. **Aspect ratio**: reject > 5:1 (edge artifacts)
4. **Density**: count binary-active pixels within rect; reject if < 20% of
   bounding box area (sparse compression artifacts)

### Step 5 — Deduplication (Perceptual Hash + Spatial Overlap)

Two complementary dedup layers:

1. **Perceptual hash**: 64-bit hash (8×8 grid of average luminance) on padded crop.
   Reject if hamming distance < 10 from any previously seen hash.
2. **Spatial overlap**: Reject if candidate overlaps >40% with any candidate seen
   within the last 30 frames. Prevents same sprite generating candidates every frame.

Limit: max 3 candidates per frame (largest area first).

### Step 6 — Background-Removed Crop + AI Verification

1. Pad candidate rect by 25% on each side (captures full sprite beyond motion boundary)
2. `buildExteriorMask()`: Flood-fill from crop edges through background pixels (binary=0)
   to identify connected exterior regions
3. `applyCropMask()`: Copy pixel data, setting exterior pixels to alpha=0 (transparent)
4. Encode as PNG, emit `EXTRACT_DEBUG` candidate event
5. Send to AI queue (`addCandidate()` in `ai-sprite.ts`)
6. AI processes asynchronously: prompt Gemini Nano for `{"label": "...", "accept": true/false}`
7. If accepted and label not already known → SAVE_SPRITE to IndexedDB

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

### `src/content/image-ops.ts` — Basic pixel ops

- `rgbaToGray(data, w, h)` → Uint8Array
- `absdiff(a, b)` → Uint8Array
- `threshold(src, thresh)` → Uint8Array (binary 0/255)
- `findBoundingRects(binary, w, h)` → Array<Rect> (flood-fill connected components)

### `src/content/background-model.ts` — Gaussian model

- `buildGaussianModel(frames, pixelCount, varianceFloor?)` → BGSubtractor
- `gaussianSubtract(gray, mean, variance, k?)` → Uint8Array (binary mask)
- `gaussianUpdate(mean, variance, gray, binary, alpha?)` → void (in-place)
- `detectSceneChange(binary, pixelCount, threshold)` → { isSceneChange, changeRatio }
- `processFrame(sub, gray, options?)` → Uint8Array | null (full state machine)

### `src/content/sprite-helpers.ts` — Pipeline helpers

- `mergeRects(rects, gap)` → Rect[]
- `sizeFilter(rects, minDim, maxDim)` → Rect[]
- `densityFilter(rects, binary, frameW, frameArea, config)` → { accepted, rejected }
- `perceptualHash(gray, frameW, rect)` → string (64-bit hash)
- `isDuplicate(hash, seenHashes, threshold)` → boolean
- `overlapsRecent(rect, recentRects, currentFrame, cooldown)` → boolean

### `src/content/sprite-crop.ts` — Background removal

- `buildExteriorMask(binary, frameW, cx, cy, cw, ch)` → Uint8Array (1=exterior)
- `applyCropMask(srcData, srcW, exterior, cx, cy, cw, ch)` → ImageData (transparent bg)

### `src/content/ai-sprite.ts` — AI verification queue

- `addCandidate(gameName, imageData)` → void (enqueues)
- `initKnownLabels(gameName)` → Promise<void> (loads existing from IndexedDB)
- `resetAi()` → void (clears queue and session)
- `isIdle()` → boolean (queue empty and not processing)

---

## Debug Output System

The pipeline emits `EXTRACT_DEBUG` messages via `window.postMessage`. The test
harness collects all debug entries generically and saves them to disk organized
by phase. Adding a new phase requires no test code changes.

Test output structure:

```
/tmp/extract-{testName}-{ts}/
  sprites/          # Final saved sprites
  candidates/       # All candidate crops
  debug/
    background_model/  # 1.png (grayscale mean), 1.json
    binary_diff/       # Per-frame foreground masks
    scene_change/      # Scene change events (json only)
    size_filter/       # Frame + green rects
    merge_rects/       # Frame + yellow rects
    density_filter/    # Frame + cyan rects (final accepted)
    dedup_rejected/    # Hash collision entries
    candidate/         # Individual crop PNGs (transparent bg)
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
2. Deduplicates via perceptual hash + spatial overlap against previously seen candidates.
3. Sends new candidates to the AI queue for asynchronous verification.
4. Saves accepted sprites to IndexedDB.

Extraction **stops** on window `blur` event — covers the user opening the
popup, switching tabs, or moving to another window. On restart, it loads
existing sprites from IndexedDB and skips known labels.

---

## File Changes Summary

| File                                  | Purpose                                                              |
| ------------------------------------- | -------------------------------------------------------------------- |
| `src/content/sprite-extraction.ts`    | Extraction orchestrator (pipeline coordination + config)             |
| `src/content/background-model.ts`     | Per-pixel Gaussian background model + state machine                  |
| `src/content/image-ops.ts`            | Pure TS image operations (grayscale, absdiff, threshold, flood fill) |
| `src/content/sprite-helpers.ts`       | Stateless pipeline helpers (merge, filter, hash, dedup)              |
| `src/content/sprite-crop.ts`          | Background removal (exterior flood-fill + transparent masking)       |
| `src/content/ai-sprite.ts`            | AI verification queue (session, prompt, parse, save)                 |
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
