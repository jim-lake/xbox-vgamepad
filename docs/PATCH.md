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
4. **Source rewrite via string replacement** — patches the method body, replacing all hardcoded `0` with `t`
5. **`new Function()` replacement** — replaces the module factory before webpack processes it

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

Use `Object.defineProperty` with getter/setter on the array's `push` property. When webpack assigns `.push = webpackJsonpCallback`, our setter fires, and we wrap THEIR callback so our patch logic runs BEFORE webpack processes the modules:

```javascript
Object.defineProperty(realArray, 'push', {
  configurable: true,
  get() {
    return currentWrappedPush;
  },
  set(newPush) {
    // Webpack is overwriting .push — wrap their version
    const theirPush = newPush;
    currentWrappedPush = function (...args) {
      // OUR PATCH RUNS FIRST
      for (const chunk of args) {
        scanAndPatchModules(chunk[1]);
      }
      // THEN webpack's jsonpCallback processes the (now-patched) factories
      return theirPush.apply(realArray, args);
    };
  },
});
```

This ensures our source rewrite happens BEFORE webpack calls the module factory.

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
- The `lt` class is defined inside a webpack module in the `8128` chunk (26 modules)
- The webpack chunk global is `self.__LOADABLE_LOADED_CHUNKS__`
- `lt` is a local class (NOT exported) — cannot be accessed from module exports
- The `r()` helper is Babel's `_defineProperty` — uses `Object.defineProperty` internally
- Modules are structured as `51879(e, t, i) { ... }` (shorthand method syntax)
- Module detection is content-based (searches for `gamepadMappingsToSend` + `onGamepadChanged`), not by module ID which changes per build
- The minified source preserves property/method names (they're runtime identifiers)

---

## Build Requirement: inlineMainWorldPlugin (vite.config.ts)

The `@crxjs/vite-plugin` wraps content scripts in an async loader (`await import(...)`) when the chunk has imports, dynamic imports, or exports. This causes our interception code to run AFTER xCloud's chunks have already loaded.

**Solution:** The `inlineMainWorldPlugin` in `vite.config.ts` runs as an `enforce: 'pre'` plugin BEFORE crxjs's `generateBundle` hook. It:

1. Finds the main-world chunk in the bundle
2. Inlines all its imported chunks (e.g. `messages`, `gamepad`) directly into it
3. Strips all `import` statements from the code
4. Clears the `imports`, `dynamicImports`, and `exports` arrays on the chunk object

When crxjs's `generateBundle` runs next, it sees a chunk with zero imports/exports and skips the async loader, wrapping it in a synchronous IIFE instead. **No crxjs fork needed.**

---

## Still TODO

1. **Patch `sendKeepAliveGamepadInput`** — hardcodes `0 === i.GamepadIndex` check, only sends keepalive for slot 0.
2. **Remove debug logging** — the `console.log("[COOP-PATCH] ...")` statements in the patched methods should be removed or gated behind a debug flag for production.
3. **Gate behind config flag** — the patch should only activate when co-op mode is enabled in the extension settings.

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

---

## Test Design: `test/patch/`

### Overview

A standalone integration test that validates the co-op patch is intercepting `onGamepadChanged` correctly on a live xCloud session. Runs via `npm run test:patch`, independent of all other test infrastructure.

### Requirements

- **Chrome For Testing** with a persistent user data directory (real cookie store for Xbox auth)
- **No headless** — xCloud requires a real browser session with valid auth cookies
- **Extension loaded** — the built extension (with patch enabled) loaded via `--load-extension`
- **Logging** — the patch logs `[COOP-PATCH] onGamepadChanged intercepted: index=<N>` to the page console whenever it fires, proving interception is working

### Test Flow

1. Build the extension with the co-op patch enabled (`vite build --mode test`)
2. Launch Chrome For Testing with persistent profile (pre-authed Xbox cookies)
3. Navigate to `https://www.xbox.com/en-US/play`
4. Wait for game stream to initialize
5. Connect virtual gamepad at index 1 (pad 2), then disconnect it
6. Assert console logs contain `[COOP-PATCH] onGamepadChanged intercepted: index=1` for both connect and disconnect

### Initial Auth Setup

```bash
"/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing" \
  --user-data-dir=test/patch/profile
```

Log into xbox.com, then close. Cookies persist for subsequent automated runs.
