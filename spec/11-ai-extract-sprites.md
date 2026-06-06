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
  ├── Runs OpenCV.js for frame diffing, contour detection, candidate crops
  ├── Uses window.ai Prompt API for sprite verification & canonical selection
  ├── Sends SAVE_SPRITE / LOAD_SPRITES messages to service worker for persistence
  └── Sends SHOW_TOAST messages to main world for user-facing notifications

SERVICE WORKER (src/background/service-worker.ts)
  ├── Handles SAVE_SPRITE — writes sprite PNG buffers to IndexedDB
  ├── Handles LOAD_SPRITES — reads existing sprites for a game from IndexedDB
  └── Returns results to content script via sendResponse

MAIN WORLD (src/injected/main-world.ts)
  └── Handles SHOW_TOAST — renders toast notifications in the page DOM
```

### Why Each Piece Lives Where It Does

| Task                | Context                   | Reason                                              |
| ------------------- | ------------------------- | --------------------------------------------------- |
| Frame capture       | Content script (isolated) | Has DOM access to video element via OffscreenCanvas |
| OpenCV extraction   | Content script (isolated) | Inline processing, all image data already present   |
| AI verification     | Content script (isolated) | window.ai Prompt API available, data already local  |
| Storage (IndexedDB) | Service worker            | Single owner for persistence, avoids page context   |
| Toast notifications | Main world                | Must render in the visible page DOM                 |
| Trigger button      | Popup                     | User initiates from the config UI                   |

---

## Messaging Contract

### Popup → Content Script (chrome.tabs.sendMessage)

```ts
{ source: MSG_SOURCE, type: 'START_FIND_SPRITES' }
```

### Content Script → Service Worker (chrome.runtime.sendMessage)

```ts
// Save a verified sprite
{ source: MSG_SOURCE, type: 'SAVE_SPRITE', game: string, spriteType: string, buffer: ArrayBuffer, w: number, h: number }

// Load existing sprites for the current game
{ source: MSG_SOURCE, type: 'LOAD_SPRITES', game: string }
// Response: { sprites: Array<{ spriteType: string, buffer: ArrayBuffer, w: number, h: number }> }
```

### Content Script → Main World (window.postMessage)

```ts
{ source: MSG_SOURCE, type: 'SHOW_TOAST', text: string, duration?: number }
```

---

## Phase 1 — Popup Button

**File:** `src/popup/gamepad-config-section.tsx`

Add a "Find Sprites" section below the Scripts section with a single button.
On press, call `sendToActiveTab({ source: MSG_SOURCE, type: 'START_FIND_SPRITES' })`.

**File:** `src/popup/messaging.ts`

Add `sendStartFindSprites()` that sends the message to the active tab's content script.

**File:** `src/types/messages.ts`

Add `StartFindSpritesMessage` interface and include it in `ExtensionMessage` union.

---

## Phase 2 — Content Script Extraction Orchestrator

**File:** `src/content/sprite-extraction.ts` (new)

Handles the `START_FIND_SPRITES` message. Behavior:

1. Determine current game from `state.gameName` (abort if null).
2. Send `LOAD_SPRITES` to service worker to check for existing sprites.
3. Send `SHOW_TOAST` to main world: "Finding sprites..." (start notification).
4. Begin or resume frame capture loop.
5. On each sprite found, send `SHOW_TOAST` with sprite type info.
6. Send `SAVE_SPRITE` to service worker for persistence.

State is keyed by game name — switching games resets extraction state.

**File:** `src/content/index.ts`

Wire up the `START_FIND_SPRITES` handler in the `chrome.runtime.onMessage` listener
to invoke the extraction orchestrator.

---

## Phase 3 — Frame Capture & Candidate Extraction

**Context:** Content script (isolated world)

- Locate the `<video>` element in the DOM (xCloud's WebRTC stream).
- Use `requestVideoFrameCallback` — process every 5th frame.
- Draw to `OffscreenCanvas`, read `ImageData`.
- OpenCV.js: frame differencing → threshold → contour detection → bounding rects.
- Filter: reject < 8×8px (noise) and > 25% of frame (background shift).
- Deduplicate via pixel-sum hash.

---

## Phase 4 — AI Verification

**Context:** Content script (isolated world)

Batch candidates (up to 10), verify with `window.ai` Prompt API:

- Identify what the sprite is (no predefined type list — discovery is open-ended)
- Approve/reject based on cleanliness
- Compare against already-saved sprites to decide if it's new or a better version
- Feedback loop: adjust OpenCV params based on rejection reasons

When a new sprite is confirmed, save it immediately. When a better crop of an
existing sprite is found, replace it.

---

## Phase 5 — Storage (Service Worker)

**File:** `src/background/service-worker.ts`

Add handlers for:

- `SAVE_SPRITE`: store `{ game, spriteType, buffer, w, h }` in IndexedDB
- `LOAD_SPRITES`: return all sprites for a given game name

IndexedDB store: `sprites`, keyed by `${game}::${spriteType}`.

---

## Phase 6 — Toast Notifications (Main World)

**File:** `src/injected/main-world.ts`

Add handler for `SHOW_TOAST` messages received via `window.addEventListener('message')`.
Render a simple positioned toast element in the page DOM, auto-dismiss after duration.

Toast events:

- "Finding sprites..." — when extraction starts/resumes
- "Found sprite: {type}" — when a new sprite is verified and saved

---

## Testing

### Chrome Setup

The extraction smoke test uses **system Chrome Canary** (not Chrome for Testing,
which blocks GPU and can't run Gemini Nano inference).

Puppeteer launches with `ignoreDefaultArgs: true` because puppeteer's defaults
include `--disable-features=OptimizationHints` which kills the optimization
guide service.

**One-time model setup:**

1. Install Chrome Canary
2. Open Canary, enable flags in `chrome://flags`:
   - `#prompt-api-for-gemini-nano` → **Enabled Multilingual**
   - `#prompt-api-for-gemini-nano-multimodal-input` → **Enabled**
   - `#optimization-guide-on-device-model` → **Enabled Force Small Model**
3. Relaunch, go to `chrome://components` → "Optimization Guide On Device Model" → Check for update

**Running:**

- `npm run test:extract:smoke:setup` — builds extension, launches Canary with Prompt API, leaves open
- `npm run test:extract:smoke` — runs the automated smoke test

Both use a persistent profile at `test/extract/profile/`. Chrome Canary
finds its own downloaded model automatically. Session creation is ~55ms;
inference takes ~25s per prompt (on-device, no network).

### Extraction Tests (`npm run test:extract`)

Independent integration test of the extraction/training loop using `test_media/test.mp4`.

**Test page:** `test/extract/extract-exerciser.html`

- Loads `test_media/test.mp4` in a `<video>` element (plays on loop)
- Mimics the xCloud video structure so the content script can find and capture from it
- Served by the test harness HTTP server

**Test suite:** `test/extract/`

- Builds the extension in test mode
- Launches Chromium with the extension loaded, navigates to the exerciser page
- Triggers `START_FIND_SPRITES` via the content script message
- Lets extraction run against the mp4 video frames
- Asserts sprites are found and saved to IndexedDB
- Verifies toast messages are dispatched to the main world

**npm script:**

```json
"test:extract": "... builds test mode + runs extraction test suite against test_media/test.mp4"
```

The test page should set a fake game name so extraction has a key to work with.

---

## File Changes Summary

| File                                   | Change                                                                                       |
| -------------------------------------- | -------------------------------------------------------------------------------------------- |
| `src/types/messages.ts`                | Add `StartFindSpritesMessage`, `SaveSpriteMessage`, `LoadSpritesMessage`, `ShowToastMessage` |
| `src/popup/messaging.ts`               | Add `sendStartFindSprites()`                                                                 |
| `src/popup/gamepad-config-section.tsx` | Add "Find Sprites" button below Scripts section                                              |
| `src/content/sprite-extraction.ts`     | New — extraction orchestrator                                                                |
| `src/content/index.ts`                 | Wire `START_FIND_SPRITES` to orchestrator                                                    |
| `src/background/service-worker.ts`     | Add `SAVE_SPRITE` and `LOAD_SPRITES` IndexedDB handlers                                      |
| `src/injected/main-world.ts`           | Add `SHOW_TOAST` handler with DOM toast rendering                                            |
| `manifest.json`                        | Add `opencv.js` to `web_accessible_resources` if loaded externally                           |
| `test/extract/extract-exerciser.html`  | New — test page that loads `test_media/test.mp4` as video source                             |
| `test/extract/extract.test.ts`         | New — extraction integration test suite                                                      |
| `package.json`                         | Add `test:extract` script                                                                    |

---

## Dependencies

| Library   | Context        | Use                            | Size |
| --------- | -------------- | ------------------------------ | ---- |
| opencv.js | Content script | Contour extraction, frame diff | ~8MB |
| window.ai | Content script | Built-in Chrome Prompt API     | —    |

---

## Lifecycle

Extraction runs indefinitely — there is no stopping condition. The system does
not know how many sprites exist or when it's "done." It continuously:

1. Captures frames and extracts candidates
2. Verifies new candidates against what's already been found
3. Refines existing sprites when a better crop is detected
4. Saves new/updated sprites as they're found

Extraction **stops** automatically when the window loses focus (`blur` event) —
this covers the user opening the popup, switching tabs, or moving to another
window. Once stopped, the user must click "Find Sprites" again to restart.

On restart, it loads existing sprites from IndexedDB and continues from where
it left off — deduplicating against known sprites and only saving genuinely new
or better crops.

---

## What This Does NOT Produce

- No ML model, weights, or embeddings
- No runtime AI dependency beyond extraction phase
- Just PNGs in IndexedDB, used at runtime via FFT cross-correlation
