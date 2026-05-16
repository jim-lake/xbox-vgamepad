# Co-op Patch Strategy via Main-World Extension

## Status: ✅ WORKING (both patches)

The patch successfully intercepts and rewrites both `onGamepadChanged` and `onGamepadInput` methods at runtime. `onGamepadChanged` replaces hardcoded `GamepadIndex: 0` with the actual gamepad index parameter `t`. `onGamepadInput` replaces hardcoded `i = 0` with `u.GamepadIndex` so inputs route to the correct gamepad slot.

The patched class prototype is exposed at `self.__XBVG__coopClass_prototype__` for runtime introspection.

---

## Problem

The `lt` class in xCloud's `8128.*.chunk.js` hardcodes `GamepadIndex: 0` in both `onGamepadChanged` and `onGamepadInput`. Every gamepad source is funneled into slot 0, making multi-controller co-op impossible. The parameter `t` (gamepad index) is received but ignored.

---

## Working Implementation: `src/injected/coop-patch.ts`

### Mechanism

1. **`Object.defineProperty` trap on `self.__LOADABLE_LOADED_CHUNKS__`** — intercepts any reassignment of the global
2. **`Object.defineProperty` trap on the array's `.push` property** — uses getter/setter so when webpack overwrites `.push` with its jsonpCallback, we wrap THEIR callback
3. **Content-based module detection** — searches module factory `.toString()` for both `gamepadMappingsToSend` AND `onGamepadChanged`
4. **`extractMethod` with param-count matching** — uses a regex with negative lookbehind (`(?<!\\.)`) to skip call sites, iterates all matches (global flag) to find the method definition with the correct parameter count (the module contains multiple classes with `onGamepadChanged` — one with 2 params, the target with 3)
5. **Source rewrite via string replacement** — patches the method body, replacing all hardcoded `0` with the index param
6. **`new Function()` replacement** — replaces the module factory before webpack processes it

### Key Replacements in `onGamepadChanged(e, t, i)`

| Original                                | Patched                                 |
| --------------------------------------- | --------------------------------------- |
| `this.gamepadStates.get(0)`             | `this.gamepadStates.get(t)`             |
| `GamepadIndex: 0`                       | `GamepadIndex: t`                       |
| `this.inputSink.onGamepadChanged(0, i)` | `this.inputSink.onGamepadChanged(t, i)` |
| `this.gamepadStates.set(0, o)`          | `this.gamepadStates.set(t, o)`          |
| `this.gamepadStates.delete(0)`          | `this.gamepadStates.delete(t)`          |
| `0 === e.GamepadIndex`                  | `t === e.GamepadIndex`                  |

### Key Replacements in `onGamepadInput(e, t, i, n)`

| Original                                                   | Patched                                                                 |
| ---------------------------------------------------------- | ----------------------------------------------------------------------- |
| `const t=e+u.GamepadIndex,i=0,n=this.gamepadStates.get(i)` | `const t=e+u.GamepadIndex,i=u.GamepadIndex,n=this.gamepadStates.get(i)` |

The `i=0` hardcode caused all input to look up `gamepadStates.get(0)` regardless of which gamepad sent the input. Replacing with `i=u.GamepadIndex` makes the lookup use the correct slot created by `onGamepadChanged`.

### Prototype Exposure

On first call to `onGamepadChanged`, the patch sets:

```javascript
self.__XBVG__coopClass_prototype__ = Object.getPrototypeOf(this);
```

This exposes the `lt` class prototype (which is otherwise inaccessible outside the webpack module closure) for runtime introspection and further patching if needed.

---

## Interception Architecture

The patch uses a single interception point with two layers:

```
┌─ Object.defineProperty on self.__LOADABLE_LOADED_CHUNKS__ ─┐
│  Traps reassignment of the global array                     │
│  On set: scan existing entries + installPushTrap(newArray)  │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─ installPushTrap(arr) ──────────────────────────────────────┐
│  Object.defineProperty on arr.push (getter/setter)          │
│  When webpack assigns .push = jsonpCallback:                │
│    setter wraps their callback with processChunks()         │
│  Result: our patch runs BEFORE webpack processes modules    │
└─────────────────────────────────────────────────────────────┘
```

Once `patchApplied` becomes `true`, all scanning stops immediately.

---

## Critical Learning: Webpack `.push` Overwrite Race

### The Bug (original approach)

The first implementation simply did:

```javascript
const originalPush = chunks.push.bind(chunks);
chunks.push = function (...args) {
  /* patch logic */ return originalPush(...args);
};
```

This **appeared to work** (the interceptor fired, logged `chunk has 26 modules`) but **never found the target module**. The `.includes()` checks on module factory `.toString()` silently failed.

### Root Cause

Webpack's runtime overwrites `.push` on the `__LOADABLE_LOADED_CHUNKS__` array with its `webpackJsonpCallback`. The execution order was:

1. Our script runs at `document_start`, wraps `.push` (saving `Array.prototype.push` as `originalPush`)
2. Webpack's runtime loads, does: `chunkLoadingGlobal.push = webpackJsonpCallback.bind(null, 0)` — this **replaces our wrapper**
3. BUT webpack also saves a reference to the "old push" (our wrapper) and calls it after processing
4. When the 8128 chunk arrives, webpack's jsonpCallback fires FIRST, processes the original unpatched factories, THEN calls our wrapper
5. By the time our wrapper examines the modules, webpack has already consumed them — the factories may have been transformed or the module object state is different

### The Fix

Use `Object.defineProperty` with getter/setter on the array's `push` property. When webpack assigns `.push = webpackJsonpCallback`, our setter fires, and we wrap THEIR callback so our patch logic runs BEFORE webpack processes the modules.

---

## Critical Learning: Multiple Classes with Same Method Name

### The Bug

The target webpack module (key 51879, ~137KB) contains MULTIPLE classes that define `onGamepadChanged`. The first occurrence has 2 parameters `(e,t)` (a different class's version), while the target `lt` class has 3 parameters `(e,t,i)`.

The original `extractMethod` used `re.exec()` once — it found the 2-param version first, failed the param count check, and returned null.

### The Fix

`extractMethod` now uses the `g` (global) flag and loops with `while ((m = re.exec(src)) !== null)` to find the match with the correct parameter count. It also uses a negative lookbehind `(?<!\\.)` to skip method CALL sites (like `this.inputSink.onGamepadChanged(0, i)`) and only match method DEFINITIONS.

---

## Verified Non-Working Approaches

1. **Simple `.push` wrapper** — Webpack overwrites `.push` with jsonpCallback, processing modules before our wrapper runs (see above).

2. **`Object.defineProperty` trap on `Object.prototype.gamepadMappingsToSend`** — Does NOT fire. The `r()` helper (Babel's `_defineProperty`) calls `Object.defineProperty(obj, key, {value: ...})` directly on the instance, bypassing prototype chain setters.

3. **Wrapping `Object.defineProperty` itself** — The `r()` helper fires for EVERY property on EVERY class instance. Thousands of calls to filter through, and by the time `gamepadMappingsToSend` is set, the class is already defined.

4. **Intercepting via `Map.prototype.set`** — `this` inside `Map.prototype.set` is the Map, not the `lt` instance. No way to walk back to the owner.

5. **Wrapping `EventTarget.prototype.addEventListener` for `gamepadconnected`** — Can detect handler registration but cannot access closure variables to get the `lt` instance reference.

---

## Key Facts

- Our script runs at `document_start` in the MAIN world, before xCloud loads
- The `lt` class is defined inside a webpack module in the `8128` chunk (~26 modules in that chunk)
- The webpack chunk global is `self.__LOADABLE_LOADED_CHUNKS__`
- `lt` is a local class (NOT exported) — cannot be accessed from module exports
- The `r()` helper is Babel's `_defineProperty` — uses `Object.defineProperty` internally
- Module detection is content-based (searches for `gamepadMappingsToSend` + `onGamepadChanged`), not by module ID which changes per build
- The target module (key 51879, ~137KB) contains multiple classes — method extraction must handle same-name methods with different param counts
- The minified source preserves property/method names (they're runtime identifiers)

---

## Still TODO

1. **Patch `sendKeepAliveGamepadInput`** — hardcodes `0 === i.GamepadIndex` check, only sends keepalive for slot 0.
2. **Remove debug logging** — the `console.log("[COOP-PATCH] ...")` statements in the patched methods should be removed or gated behind a debug flag for production.
3. **Gate behind config flag** — the patch should only activate when co-op mode is enabled in the extension settings.

---

## Testing

### Integration Test: `npm run test:patch`

A standalone integration test that validates the co-op patch on a live xCloud session. Located in `test/patch/`.

#### Prerequisites

- **Chrome For Testing** installed (or set `CHROME_PATH` env var)
- A persistent Chrome profile at `test/patch/profile/` with valid Xbox auth cookies

#### Initial Auth Setup

```bash
npm run test:patch:setup
```

Or manually:

```bash
"/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing" \
  --user-data-dir=test/patch/profile \
  --no-first-run \
  --no-default-browser-check \
  https://www.xbox.com/en-US/play
```

Log into your Xbox account, then close the browser. Cookies persist for subsequent runs.

#### What It Does

1. Builds the extension in test mode (`vite build --mode test` → `build-test/`)
2. Launches Chrome with the pre-authed profile and extension loaded
3. Navigates to xbox.com/play and launches a game (Gang Beasts)
4. Waits for `#game-stream` element (game stream active)
5. Sends `ACTIVATE_GAMEPAD_CONFIG` message with a config using gamepad index 1
6. Asserts console logs contain patch application and interception at index 1
7. Sends `DISABLE_GAMEPAD` message and asserts disconnect interception

#### Assertions (3 checks)

| Assertion                        | Log pattern checked               |
| -------------------------------- | --------------------------------- |
| Patch was applied                | `"Patching onGamepadChanged"`     |
| Gamepad 1 connect intercepted    | `"index=1"` + `"connected=true"`  |
| Gamepad 1 disconnect intercepted | `"index=1"` + `"connected=false"` |

#### Troubleshooting

- **Timeout waiting for `#game-stream`**: Ensure you're logged in. You may need to manually click a game title.
- **Auth expired**: Re-run `npm run test:patch:setup` to refresh cookies.
- **Chrome still running from previous test**: Kill it with `pkill -f "Google Chrome for Testing"` before re-running.
- **Patch finds module but can't find signature**: xCloud may have updated their bundle. Check the debug output — the `extractMethod` regex may need adjustment for new minification patterns.
- The `test/patch/profile/` directory is gitignored — don't commit it.

---

## Function to be Patched (prettified from minified source)

```javascript
onGamepadChanged(e, t, i) {
    const n = e + t;
    let o = this.gamepadStates.get(0);
    if (i) {
      const e = { mapping: s()(s()({}, b.iz), {}, { GamepadIndex: 0 }) };
      (o ||
        (this.inputSink.onGamepadChanged(0, i),
        (o = {
          lastGamepadMapping: s()(s()({}, b.iz), {}, { GamepadIndex: 0 }),
          sources: new Map(),
        }),
        this.gamepadStates.set(0, o),
        this.gamepadMappingsToSend.push(
          s()(s()({}, b.iz), {}, { GamepadIndex: 0 })
        )),
        o.sources.set(n, e));
    } else {
      if (!o || !o.sources.has(n)) return;
      if (1 === o.sources.size) {
        (this.inputSink.onGamepadChanged(0, i), this.gamepadStates.delete(0));
        const e = this.gamepadMappingsToSend.findIndex(
          (e) => 0 === e.GamepadIndex
        );
        -1 !== e && this.gamepadMappingsToSend.splice(e, 1);
      } else o.sources.delete(n);
    }
  }
```

---

## Stack Trace (for reference)

On game start:

```
onGamepadChanged (8128.*.chunk.js:1)
onGamepadChanged (8128.*.chunk.js:1)
addGamepad (web-rtc-stream.*.chunk.js:1)
start (web-rtc-stream.*.chunk.js:1)
connectAsync (web-rtc-stream.*.chunk.js:1)
doConnectAsync (8128.*.chunk.js:1)
connectAsync (8128.*.chunk.js:1)
connectToSession (game-stream.*.chunk.js:1)
cloudConnect (game-stream.*.chunk.js:1)
```

On gamepad connect (from our extension):

```
onGamepadChanged (8128.*.chunk.js:1)
addGamepad (web-rtc-stream.*.chunk.js:1)
onGamepadConnected (web-rtc-stream.*.chunk.js:1)
enable (gamepad-simulator.ts.js)
activate (input-processor.ts.js)
applyPendingConfig (main-world.ts.js)
```
