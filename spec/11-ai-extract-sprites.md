# Sprite Extraction — Implementation Plan

## Goal

Add a "Find Sprites" button to the popup's Scripts section that triggers sprite
extraction in the isolated-world content script. Extraction is keyed by the
current game — it loads existing sprites to refine or starts fresh. Progress is
shown via toast notifications in the main world.

> **Status of plan**: this spec was reviewed against the existing codebase and
> a working smoke test (`npm run test:extract:smoke` — 4/4 passing). Sections
> marked **[verified]** have been validated against either the running smoke
> test, the installed type definitions, or existing source. Sections marked
> **[to-build]** are net-new work.

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
  ├── Runs OpenCV.js for frame diffing, contour detection, candidate crops
  ├── Uses the LanguageModel global (Chrome built-in Prompt API) for sprite
  │   verification & canonical-label selection
  ├── Sends SAVE_SPRITE / LOAD_SPRITES messages to service worker for persistence
  └── Posts SHOW_TOAST messages via window.postMessage for the main-world
      toast renderer
SERVICE WORKER (src/background/service-worker.ts)
  ├── Handles SAVE_SPRITE — writes sprite PNG buffers to IndexedDB
  ├── Handles LOAD_SPRITES — reads existing sprites for a game from IndexedDB
  └── Returns results to content script via sendResponse

MAIN WORLD (src/injected/main-world.ts)
  └── Reuses the existing src/injected/toast.ts helper (already wired). A
      'SHOW_TOAST' main-world message handler calls showToast(text).
```

### Why Each Piece Lives Where It Does

| Task                | Context                   | Reason                                                      |
| ------------------- | ------------------------- | ----------------------------------------------------------- |
| Frame capture       | Content script (isolated) | `<video>` lives in main DOM; isolated world has DOM access  |
| OpenCV processing   | Content script (isolated) | All image data already local; no message-passing per pixel  |
| AI verification     | Content script (isolated) | `LanguageModel` is a global available in this context [verified by smoke test] |
| Storage (IndexedDB) | Service worker            | Single owner for persistence; survives page reloads         |
| Toast notifications | Main world                | Toast DOM must render in the visible page                   |
| Trigger button      | Popup                     | User initiates from the config UI                           |

---

## Chrome AI API Surface — [verified]

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
- Types ship with the installed `@types/dom-chromium-ai` package — no manual
  shim needed.
- `Availability = "unavailable" | "downloadable" | "downloading" | "available"`.
- `availability(...)` returning `"downloading"` is normal on first run; the
  subsequent `create(...)` call blocks until the model is fully loaded.
- Session creation (when model is cached): ~95 ms.
- Single-prompt latency (text-only smoke prompt): ~27 s.
- Sessions are NOT shareable across contexts. Each context (popup,
  content script) calls its own `create(...)`. Model bytes are downloaded
  once per profile — once the popup has triggered the download, the content
  script's own `create(...)` is cheap.

### Image input format

```ts
LanguageModelMessageValue = ImageBitmapSource | AudioBuffer | BufferSource | string;
```

For our use (passing a sprite candidate):

```ts
const session = await LanguageModel.create({
  expectedInputs: [
    { type: 'image' },
    { type: 'text', languages: ['en'] },
  ],
  expectedOutputs: [{ type: 'text', languages: ['en'] }],
});

const result = await session.prompt([
  {
    role: 'user',
    content: [
      { type: 'image', value: bitmap }, // ImageBitmap | OffscreenCanvas | Blob
      { type: 'text', value: 'Describe this sprite in one short label...' },
    ],
  },
]);
```

We will use `ImageBitmap` (cheap to construct from `OffscreenCanvas` via
`canvas.transferToImageBitmap()` or `createImageBitmap(blob)`).

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
  spriteType: string,    // canonicalized AI label
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
{ source: MSG_SOURCE, type: 'SHOW_TOAST', text: string, duration?: number }
```

The main-world handler simply calls the existing `showToast(text)` from
`src/injected/toast.ts`. The optional `duration` is forwarded if provided
(toast.ts will need a small extension to accept a duration override).

---

## Phase 1 — Popup Button + Model Readiness Gate [to-build]

The popup is responsible for the entire model-readiness flow. It MUST NOT
send `START_FIND_SPRITES` until it has confirmed the on-device model is live
in the popup's own context. This guarantees that by the time the content
script calls `LanguageModel.create(...)`, the bytes are cached and the call
returns in ~100 ms instead of blocking for minutes.

**File:** `src/popup/find-sprites-section.tsx` (new) — rendered below the
existing Scripts section in `gamepad-config-section.tsx`.

State machine for the section:

| State           | Trigger                                                     | UI                                                                |
| --------------- | ----------------------------------------------------------- | ----------------------------------------------------------------- |
| `unsupported`   | `typeof LanguageModel === 'undefined'`                      | Disabled section + help text: "Requires Chrome Canary + flags"    |
| `unavailable`   | `availability() === 'unavailable'`                          | Same as `unsupported` plus link to flag-setup docs                |
| `downloadable`  | `availability() === 'downloadable'`                         | Button: "Download AI model (~1.5 GB)" → triggers `create(...)`    |
| `downloading`   | `availability() === 'downloading'` OR `create()` in flight  | Progress bar (from `monitor.ondownloadprogress`); button disabled |
| `ready`         | `create()` resolved successfully                            | Button: "Find Sprites" → enabled                                  |
| `error`         | `create()` rejected                                         | Error message + retry button                                      |

Implementation outline:

```ts
// On mount:
const a = await LanguageModel.availability({
  expectedInputs: [{ type: 'image' }, { type: 'text', languages: ['en'] }],
  expectedOutputs: [{ type: 'text', languages: ['en'] }],
});
setState(mapAvailabilityToState(a));

// Download / verify button:
async function ensureReady() {
  setState('downloading');
  const session = await LanguageModel.create({
    expectedInputs: [{ type: 'image' }, { type: 'text', languages: ['en'] }],
    expectedOutputs: [{ type: 'text', languages: ['en'] }],
    monitor(m) {
      m.addEventListener('downloadprogress', (e) => {
        setProgress(e.loaded / e.total);
      });
    },
  });
  // We don't keep the popup session — content script will create its own.
  // The download is now persisted to the profile.
  session.destroy();
  setState('ready');
}

// Find Sprites button (only enabled when state === 'ready'):
async function onFindSprites() {
  await sendStartFindSprites();
  window.close(); // popup closes; extraction runs in the tab.
}
```

If the popup is closed while `create(...)` is in flight, the underlying
download continues (handled by Chrome's optimization-guide service). The next
popup open re-runs `availability()` and either lands in `ready` or resumes
showing progress via a fresh `create()` call.

**File:** `src/popup/messaging.ts`

```ts
export async function sendStartFindSprites(): Promise<void> {
  await sendToActiveTab({ source: MSG_SOURCE, type: 'START_FIND_SPRITES' });
}
```

**File:** `src/types/messages.ts`

Add the four new message interfaces:
- `StartFindSpritesMessage`
- `SaveSpriteMessage` + response shape
- `LoadSpritesMessage` + response shape
- `ShowToastMessage`

Include all four in the `ExtensionMessage` union.

---

## Phase 2 — Content Script Extraction Orchestrator [to-build]

**File:** `src/content/sprite-extraction.ts` (new)

Public API:

```ts
export function startFindSprites(state: TabState): Promise<void>;
export function stopFindSprites(): void;
```

Behavior:

1. Read `state.gameName` (from existing TabState in `src/content/index.ts`).
   If null, post a SHOW_TOAST "No game detected" and return.
2. Send `LOAD_SPRITES` to service worker; receive existing sprites map.
3. Post SHOW_TOAST "Finding sprites for {game}…".
4. Lazy-load OpenCV.js (see Phase 3).
5. Lazy-create the LanguageModel session with **no monitor** — the popup has
   already verified the model is downloaded, so this call should resolve
   in ~100 ms. If `create()` rejects (model went unavailable since the
   popup check, e.g. user disabled the flag), abort with a SHOW_TOAST
   error.
6. Start the capture/verify loop.
7. On each verified sprite, post SHOW_TOAST and send SAVE_SPRITE.
8. Stop the loop on:
   - Window `blur` event (registered in this module).
   - Receipt of a stop signal (e.g. another `START_FIND_SPRITES` invocation
     while running cancels the previous run before restarting — single
     in-flight run only).

**File:** `src/content/index.ts`

In the existing `chrome.runtime.onMessage` listener, when `message.type ===
'START_FIND_SPRITES'`, call `startFindSprites(state)`. Pass the existing
`TabState` so the orchestrator has access to `state.gameName`.

---

## Phase 3 — Frame Capture & Candidate Extraction [to-build]

**Context:** Content script (isolated world)

### Locating the video element

Use the same approach as `src/injected/game-detection.ts` (or a thin equivalent
in isolated world): `document.querySelector('video')`. The xCloud stream is a
single visible `<video>`.

### OpenCV.js loading

Use the npm package `@techstark/opencv-js` (maintained TypeScript-typed port).
Let Vite/crxjs handle bundling and chunk emission; do NOT vendor.

- `npm install @techstark/opencv-js` (one-time).
- Import lazily on first START_FIND_SPRITES so the ~8 MB JS+WASM is only paid
  for when the user opts in, and Vite emits it as a separate chunk:
  ```ts
  const cv = (await import('@techstark/opencv-js')).default;
  await new Promise<void>((resolve) => {
    cv.onRuntimeInitialized = resolve;
  });
  ```
- The shim fetches a sibling `.wasm` at runtime. In a Chrome extension we need
  to redirect that fetch through `chrome.runtime.getURL`. Set the
  `Module.locateFile` hook BEFORE the dynamic import resolves, e.g. via
  `globalThis.Module = { locateFile: (f) => chrome.runtime.getURL('assets/' + f) }`.
  The exact emitted asset path will be whatever crxjs names the WASM chunk —
  inspect `build-test/assets/` after a build to confirm and adjust.
- Add the WASM chunk to `manifest.json` `web_accessible_resources` so the
  content script can fetch it. The crxjs plugin auto-includes JS chunks but
  not arbitrary asset files, so an explicit entry is required:
  ```json
  { "resources": ["assets/opencv_js.wasm"], "matches": [...same as content_scripts...] }
  ```
- CSP: content scripts inherit a Chrome-extension CSP that already permits
  `wasm-unsafe-eval`, so no manifest CSP changes are needed.

### Capture loop

- Subscribe to `video.requestVideoFrameCallback`.
- Process every Nth frame (default `N = 5` → ~12 fps on 60 fps stream).
- Draw to a single reused `OffscreenCanvas` sized to the video; read
  `ImageData` for OpenCV.
- OpenCV pipeline: frame differencing vs the previous processed frame →
  threshold → `findContours` → bounding rects.
- Filter: drop rects < 8×8 px (noise) and > 25 % of frame (background shift).
- Deduplicate within the run using a cheap perceptual hash (mean pixel sum
  buckets). Persistent dedup happens when comparing against
  already-saved sprites.

### AI queue (back-pressure)

Because AI inference is ~25 s per prompt and capture produces ~12 candidates/s,
the orchestrator MUST throttle:

- Maintain a bounded ring buffer of the most-recent N (default 8) novel
  candidates.
- A single AI worker drains the buffer one item at a time; new candidates
  evict the oldest if the buffer is full.
- Optional batching: ask the model to evaluate up to 4 candidates in one
  prompt to amortize the latency.

---

## Phase 4 — AI Verification [to-build]

**Context:** Content script (isolated world)

For each candidate (or batch):

1. Convert the cropped `ImageData` to an `ImageBitmap`.
2. Prompt the session with the image and a tightly-scoped instruction:
   - Identify the visible content with a short canonical label (e.g.
     `"player_idle"`, `"enemy_zombie"`, `"hp_bar"`). No predefined list.
   - Self-rate the cleanliness (rejected / accepted).
   - Whether this is a better crop than a provided existing sprite (when
     refining).
3. Parse the model's response (we will require structured JSON output via the
   prompt template; the API supports `responseConstraint` in newer revisions
   but is not assumed here).
4. **Label canonicalization**: AI labels are free-form strings. Normalize to
   lowercase snake_case and apply a per-game alias map kept in
   `chrome.storage.local` to merge synonyms across runs (`"hp"` ↔ `"hp_bar"`).
   This avoids fragmenting the IndexedDB keyspace.
5. On accept-new: SAVE_SPRITE.
   On accept-better: SAVE_SPRITE (overwrites under same canonical key).
   On reject: discard, optionally feed rejection reason back to OpenCV
   thresholds for future frames.

---

## Phase 5 — Storage (Service Worker) [to-build]

**File:** `src/background/service-worker.ts`

Add an IndexedDB wrapper module `src/background/sprite-store.ts`:

```ts
interface SpriteRecord {
  game: string;
  spriteType: string;       // canonical key
  buffer: ArrayBuffer;      // PNG-encoded
  w: number;
  h: number;
  updatedAt: number;
}

await db.put('sprites', record, `${game}::${spriteType}`);
await db.getAllForGame(game);
```

In the existing `chrome.runtime.onMessage` listener, handle `SAVE_SPRITE` and
`LOAD_SPRITES`. Both must use `sendResponse` and the listener must
`return true` to keep the channel open for the async reply. **Service workers
support IndexedDB natively** — confirmed.

---

## Phase 6 — Toast Notifications (Main World) [to-build]

**File:** `src/injected/main-world.ts`

In the existing `window.addEventListener('message', …)` block, add a branch:

```ts
} else if (data.type === 'SHOW_TOAST') {
  showToast(data.text); // imported from ./toast
}
```

Reuse `src/injected/toast.ts`. If a configurable duration is needed, extend
`showToast(message, durationMs?)` rather than inventing a new renderer.

---

## Testing

### Existing infrastructure — [verified]

- **`npm run test:extract:smoke`** — runs Chrome Canary + Gemini Nano model
  inference smoke test. Currently passes 4/4. Validates:
  - Isolated-world execution context can be located.
  - `LanguageModel` global is defined.
  - `LanguageModel.availability(...)` returns a non-`unavailable` status.
  - `LanguageModel.create(...)` + `session.prompt(...)` succeeds.
- **`npm run test:extract:smoke:setup`** — builds + launches Canary with the
  required flags and the persistent profile, leaves the browser open.
- Persistent profile: `test/extract/profile/` (gitignored). Keeps the
  downloaded ~1.5 GB Gemini Nano model between runs.
- Chrome Canary path defaults to
  `/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary`,
  override with `CHROME_PATH=...`.
- Required Canary flags (one-time, in `chrome://flags`):
  - `#prompt-api-for-gemini-nano` → **Enabled Multilingual**
  - `#prompt-api-for-gemini-nano-multimodal-input` → **Enabled**
  - `#optimization-guide-on-device-model` → **Enabled Force Small Model**
- After enabling flags, visit `chrome://components` → "Optimization Guide On
  Device Model" → Check for update.
- Puppeteer launches with `ignoreDefaultArgs: true` to avoid the default
  `--disable-features=OptimizationHints` flag that would otherwise kill the
  optimization guide service.

### Real extraction test — [to-build]

**Test page:** `test/extract/extract-exerciser.html`

- Loads `test_media/test.mp4` in a `<video>` element (`autoplay`, `muted`,
  `loop`, `playsinline`).
- Includes minimal scaffolding to mirror what the content script's
  game-detection module looks for, OR exposes a hook for the test to inject a
  fake game name into the existing TabState (preferred; cleanest seam).

**Test runner:** `test/extract/extract.test.cjs` (CommonJS, matching project
convention; the existing `extract-smoke.test.cjs` is the template).

It must:

1. Build the extension in test mode (already wired via the
   `vite build --mode test` step in the npm script).
2. Start an HTTP server on port 9444 serving `extract-exerciser.html` and
   `test_media/test.mp4`.
3. Launch Chrome Canary with the same args as the smoke test (persistent
   profile, AI flags).
4. Open the exerciser URL — the test-mode manifest already includes
   `http://127.0.0.1:9444/*` in `content_scripts.matches` (handled in
   `vite.config.ts`).
5. Inject a fake game name into the content script (via window.postMessage of
   a synthetic INITIALIZED message OR via a small test-only hook on
   `state.gameName`).
6. Trigger `START_FIND_SPRITES`.
7. Allow extraction to run for a bounded time budget (e.g. 90 s).
8. Assertions:
   - At least one sprite is saved to IndexedDB.
   - At least one SHOW_TOAST is dispatched.
   - No errors are thrown in the console.

**npm scripts** (`package.json`) — needs an update. Currently:

```json
"test:extract": "vite build --mode test && node test/extract/extract-smoke.test.cjs"
```

Should become:

```json
"test:extract":           "vite build --mode test && node test/extract/extract.test.cjs",
"test:extract:smoke":     "node test/extract/extract-smoke.test.cjs",
"test:extract:setup":     "vite build --mode test && node test/extract/extract-setup.cjs",
"test:extract:smoke:setup": "vite build --mode test && node test/extract/extract-smoke-setup.cjs"
```

`test:extract` is **not** added to the default `npm test` chain because it
requires Chrome Canary, the on-device model, and a multi-minute first-run
download. Run it on demand.

---

## File Changes Summary

| File                                          | Change                                                                 |
| --------------------------------------------- | ---------------------------------------------------------------------- |
| `src/types/messages.ts`                       | Add `StartFindSpritesMessage`, `SaveSpriteMessage` (+ response), `LoadSpritesMessage` (+ response), `ShowToastMessage` |
| `src/popup/messaging.ts`                      | Add `sendStartFindSprites()`                                           |
| `src/popup/gamepad-config-section.tsx`        | Render the new `<FindSpritesSection/>` below the Scripts section       |
| `src/popup/find-sprites-section.tsx` (new)    | Model-readiness state machine + Find Sprites button                    |
| `src/content/sprite-extraction.ts` (new)      | Extraction orchestrator (capture loop, OpenCV, AI queue, blur stop)    |
| `src/content/index.ts`                        | Wire `START_FIND_SPRITES` → orchestrator                               |
| `src/background/service-worker.ts`            | Add `SAVE_SPRITE` / `LOAD_SPRITES` handlers (`return true` for async) |
| `src/background/sprite-store.ts` (new)        | IndexedDB wrapper (`getAllForGame`, `put`)                             |
| `src/injected/main-world.ts`                  | Branch in existing message listener: `SHOW_TOAST` → `showToast(text)`  |
| `src/injected/toast.ts`                       | Optional: extend signature to `showToast(text, durationMs?)`           |
| `manifest.json`                               | Add the emitted opencv WASM chunk to `web_accessible_resources`        |
| `test/extract/extract-exerciser.html` (new)   | Test page that plays `test_media/test.mp4`                             |
| `test/extract/extract.test.cjs` (new)         | Real extraction integration test                                       |
| `test/extract/extract-setup.cjs` (new)        | Manual launcher for the real extraction harness                        |
| `package.json`                                | Repoint `test:extract`; add `test:extract:setup`                       |

---

## Dependencies

| Library                 | Context        | Use                            | Source                                        |
| ----------------------- | -------------- | ------------------------------ | --------------------------------------------- |
| `@techstark/opencv-js`  | Content script | Contour extraction, frame diff | npm; bundled and code-split by Vite (~8 MB)   |
| `LanguageModel`         | Content script | Built-in Chrome Prompt API     | Global; types from `@types/dom-chromium-ai`   |

One new npm dependency: `@techstark/opencv-js`. `puppeteer-core` is already
installed for the smoke test.

---

## Lifecycle

Extraction runs indefinitely — there is no stopping condition. The system does
not know how many sprites exist or when it's "done." It continuously:

1. Captures frames and extracts candidates.
2. Verifies new candidates against what's already been found.
3. Refines existing sprites when a better crop is detected.
4. Saves new/updated sprites as they're found.

Extraction **stops** automatically when the window loses focus (`blur` event)
— this covers the user opening the popup, switching tabs, or moving to
another window. Once stopped, the user must click "Find Sprites" again to
restart.

On restart, it loads existing sprites from IndexedDB and continues from where
it left off — deduplicating against known sprites and only saving genuinely
new or better crops.

---

## What This Does NOT Produce

- No ML model, weights, or embeddings.
- No runtime AI dependency beyond the extraction phase.
- Just PNG buffers in IndexedDB, used at runtime via FFT cross-correlation.

---

## Open Questions for the User

1. **`test:extract` in CI** — leave it out of `npm test` (current proposal),
   or add a separate CI lane that pre-warms a profile cache?
2. **Sprite label canonicalization** — the per-game alias map in
   `chrome.storage.local` is a small extra surface. Acceptable?
3. **Toast duration** — extend `showToast` to take an optional duration, or
   keep it fixed at 3 s and ignore the `duration` field in `ShowToastMessage`?
