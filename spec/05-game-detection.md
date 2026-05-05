# 05 — Game Detection and Injected Script Lifecycle

The injected script runs in the **page's JavaScript context** (not the extension's isolated world). It is the only component that can monkey-patch `navigator.getGamepads()`.

## Initialization (Module Load)

1. **Immediately** patch `navigator.getGamepads()` — this must happen before any page JavaScript calls it
2. Listen for the `'pageshow'` event (not `'load'`) to handle back-forward cache (bfcache) scenarios

## Message Protocol

Communication between the injected script and the content script uses `window.postMessage`. Messages are distinguished by a `source` field to filter out unrelated messages.

## Game Detection Logic

The extension determines whether the user is currently in a game:

### Non-Xbox Pages (e.g. gamepad-tester.com)
If the URL does **not** contain `'xbox.com'`, the page is always considered "in game". This allows the extension to work on gamepad-tester.com for testing.

### Xbox Pages
On xbox.com, the page is "in game" when ALL of these are true:
- No `<h1>` element exists (h1 indicates error/sign-in pages)
- No element matching `[data-id='ui-container'] [aria-label='Close']` exists (close button indicates game overlay/menu)
- An element with `id="game-stream"` exists (the actual game stream container)

```
isInGame = !h1 && !closeBtn && !!streamDiv
```

## Game Name Detection

Extracts the game name from `document.title` by splitting on the regex `/\s+\|/`:
- If exactly 2 parts, the first part is the game name (e.g. "Halo Infinite" from "Halo Infinite | Xbox Cloud Gaming...")
- Returns `null` if no match

## Lifecycle — Two Polling Phases

Both phases poll at **1000ms** intervals. Only one polling loop runs at a time.

### Phase 1: Wait for Game
- Polls the game detection check every 1 second
- When a game is detected: transition to Phase 2

### Phase 2: Connected to Game
1. Send `INITIALIZED` message (with gameName) to content script via `window.postMessage`
2. Set up a message listener for responses from the content script
3. Handle incoming messages:
   - `ACTIVATE_GAMEPAD_CONFIG`: show toast `"'{name}' preset activated"`, activate the received config
   - `DISABLE_GAMEPAD`: show toast `"Mouse/keyboard disabled"` (only if currently enabled), deactivate the config
4. Start polling every 1s to detect when the user **leaves** the game
5. When no longer in game: clear interval, disable gamepad, send `GAME_CHANGED(null)`, restart Phase 1

## Message Types

| Type | Direction | Payload | Purpose |
|------|-----------|---------|---------|
| `INJECTED` | content → background | none | "Content script loaded, enable toolbar button" |
| `INITIALIZED` | page → content → background | `gameName: string \| null` | "Game detected, send me config" |
| `GAME_CHANGED` | page → content → background | `gameName: string \| null` | "Game changed or exited" |
| `ACTIVATE_GAMEPAD_CONFIG` | background → content → page | `name: string, gamepadConfig: GamepadConfig` | "Use this config" |
| `DISABLE_GAMEPAD` | background → content → page | none | "Disable virtual gamepad" |

### Fallback Behavior
When constructing an `ACTIVATE_GAMEPAD_CONFIG` message: if the preset name or config is null/falsy, a `DISABLE_GAMEPAD` message must be sent instead. This ensures the extension disables itself if no active config exists.
