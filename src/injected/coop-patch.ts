/**
 * Co-op patch: Intercepts xCloud's webpack chunk loading to rewrite the
 * `onGamepadChanged` method, replacing hardcoded `0` with the `t` parameter.
 *
 * This file is a SIDE-EFFECT module — the interception installs immediately
 * when this module is evaluated (top-level code, no function wrapper).
 *
 * Mechanism: Uses a Proxy on `self.__LOADABLE_LOADED_CHUNKS__` so that ANY
 * push (including webpack's own jsonpCallback) goes through our interceptor
 * FIRST, allowing us to patch module factories before webpack processes them.
 */

import { log } from '@/tools/log';

const TAG = '[COOP-PATCH]';

// --- Patch logic ---

function patchModuleSource(src: string): string | null {
  log(TAG, '  patchModuleSource: source length:', String(src.length));

  // Find the 3-arg onGamepadChanged method — try both minified and spaced
  let methodStart = src.indexOf('onGamepadChanged(e,t,i){');
  if (methodStart === -1) {
    // Try with spaces (prettified or different minifier)
    const spaced = src.indexOf('onGamepadChanged(e, t, i)');
    if (spaced !== -1) {
      // Find the opening brace after the signature
      methodStart = spaced;
      log(TAG, '  found with spaces at offset', String(spaced));
    } else {
      log(TAG, '  could not find onGamepadChanged signature');
      // Log context around any partial match
      const partial = src.indexOf('onGamepadChanged');
      if (partial !== -1) {
        log(
          TAG,
          '  partial match at:',
          String(partial),
          src.slice(partial, partial + 80)
        );
      }
      return null;
    }
  }

  log(TAG, '  found onGamepadChanged at offset', String(methodStart));

  // Find the end of the method by counting braces
  let braceCount = 0;
  let methodEnd = -1;
  const bodyStart = src.indexOf('{', methodStart);
  for (let i = bodyStart; i < src.length; i++) {
    if (src[i] === '{') {
      braceCount++;
    } else if (src[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        methodEnd = i + 1;
        break;
      }
    }
  }

  if (methodEnd === -1) {
    log(TAG, '  could not find end of method body');
    return null;
  }

  const originalMethod = src.slice(methodStart, methodEnd);
  log(TAG, '  extracted method length:', String(originalMethod.length));

  // Do the replacements: all hardcoded 0 → t
  let patchedMethod = originalMethod;

  // Insert logging at method start (find the first { after signature)
  const sigEnd = patchedMethod.indexOf('{');
  if (sigEnd !== -1) {
    patchedMethod =
      patchedMethod.slice(0, sigEnd + 1) +
      'console.log("[COOP-PATCH] onGamepadChanged intercepted: source="+e+", index="+t+", connected="+i);' +
      patchedMethod.slice(sigEnd + 1);
  }

  patchedMethod = patchedMethod.replace(
    /this\.gamepadStates\.get\(0\)/g,
    'this.gamepadStates.get(t)'
  );
  patchedMethod = patchedMethod.replace(/GamepadIndex:\s*0/g, 'GamepadIndex:t');
  patchedMethod = patchedMethod.replace(
    /this\.inputSink\.onGamepadChanged\(0,/g,
    'this.inputSink.onGamepadChanged(t,'
  );
  patchedMethod = patchedMethod.replace(
    /this\.gamepadStates\.set\(0,/g,
    'this.gamepadStates.set(t,'
  );
  patchedMethod = patchedMethod.replace(
    /this\.gamepadStates\.delete\(0\)/g,
    'this.gamepadStates.delete(t)'
  );
  patchedMethod = patchedMethod.replace(
    /0\s*===\s*e\.GamepadIndex/g,
    't===e.GamepadIndex'
  );
  patchedMethod = patchedMethod.replace(
    /e\.GamepadIndex\s*===\s*0/g,
    'e.GamepadIndex===t'
  );

  log(TAG, '  patched method (first 300):', patchedMethod.slice(0, 300));

  const result =
    src.slice(0, methodStart) + patchedMethod + src.slice(methodEnd);
  return stripFunctionWrapper(result);
}

function stripFunctionWrapper(src: string): string {
  // toString() gives "function(e, t, i) { ... }" or "51879(e, t, i) { ... }"
  // We need just the body for new Function('e', 't', 'i', body)
  const firstBrace = src.indexOf('{');
  if (firstBrace === -1) {
    return src;
  }
  return src.slice(firstBrace + 1, src.lastIndexOf('}'));
}

function scanAndPatchModules(
  modules: Record<string | number, ((...a: unknown[]) => void) | undefined>
): boolean {
  for (const key of Object.keys(modules)) {
    const mod = modules[key];
    if (typeof mod !== 'function') {
      continue;
    }
    const modSrc = mod.toString();
    if (
      modSrc.includes('gamepadMappingsToSend') &&
      modSrc.includes('onGamepadChanged')
    ) {
      log(
        TAG,
        '*** FOUND target module at key:',
        key,
        'len:',
        String(modSrc.length)
      );

      const patched = patchModuleSource(modSrc);
      if (patched) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-implied-eval
          modules[key] = new Function('e', 't', 'i', patched) as (
            ...a: unknown[]
          ) => void;
          log(TAG, '  module', key, 'REPLACED successfully');
          return true;
        } catch (err: unknown) {
          log(TAG, '  ERROR creating patched function:', err);
        }
      } else {
        log(TAG, '  WARNING: patchModuleSource returned null');
      }
      return false;
    }
  }
  return false;
}

// --- Top-level side effect: install interceptor immediately ---

log(TAG, 'Installing interceptor');

const g = self as unknown as Record<string, unknown>;

let patchApplied = false;

// Use a property descriptor trap on self so that no matter when webpack
// or loadable-component accesses __LOADABLE_LOADED_CHUNKS__, we control
// the array's push behavior.

// The real backing array
let realArray: unknown[][] =
  (g['__LOADABLE_LOADED_CHUNKS__'] as unknown[][] | undefined) ?? [];

// Wrap push on the real array — this handles the case where webpack
// overwrites .push with its jsonpCallback
function wrapPush(arr: unknown[][]): void {
  const currentPush = arr.push.bind(arr);

  arr.push = function (...args: unknown[]): number {
    if (!patchApplied) {
      for (const chunk of args) {
        if (patchApplied) {
          break;
        }
        if (!Array.isArray(chunk) || chunk.length < 2) {
          continue;
        }
        const modules = chunk[1] as Record<
          string | number,
          ((...a: unknown[]) => void) | undefined
        > | null;
        if (!modules || typeof modules !== 'object') {
          continue;
        }
        log(TAG, 'chunk has', String(Object.keys(modules).length), 'modules');
        patchApplied = scanAndPatchModules(modules);
      }
    }
    return currentPush(...(args as unknown[][]));
  };
}

wrapPush(realArray);

// Use defineProperty to intercept any reassignment of __LOADABLE_LOADED_CHUNKS__
// AND to intercept when webpack replaces .push on the array
Object.defineProperty(g, '__LOADABLE_LOADED_CHUNKS__', {
  configurable: true,
  get() {
    return realArray;
  },
  set(newVal: unknown) {
    // If webpack or loadable sets a new array, adopt it but re-wrap push
    if (Array.isArray(newVal)) {
      realArray = newVal as unknown[][];
      if (!patchApplied) {
        // Scan existing entries in the new array
        for (const chunk of realArray) {
          if (patchApplied) {
            break;
          }
          if (!Array.isArray(chunk) || chunk.length < 2) {
            continue;
          }
          const modules = chunk[1] as Record<
            string | number,
            ((...a: unknown[]) => void) | undefined
          > | null;
          if (!modules || typeof modules !== 'object') {
            continue;
          }
          patchApplied = scanAndPatchModules(modules);
        }
        wrapPush(realArray);
      }
    }
  },
});

// Also watch for .push being overwritten on the current array via defineProperty
// by using a Proxy — this is the nuclear option to ensure we always intercept
const pushDescriptor = Object.getOwnPropertyDescriptor(realArray, 'push');
if (!pushDescriptor || pushDescriptor.configurable !== false) {
  let currentWrappedPush = realArray.push;

  Object.defineProperty(realArray, 'push', {
    configurable: true,
    enumerable: false,
    get() {
      return currentWrappedPush;
    },
    set(newPush: (...args: unknown[]) => number) {
      // Someone (webpack) is overwriting .push — wrap their version too
      log(TAG, '.push was overwritten, re-wrapping');
      const theirPush = newPush;

      currentWrappedPush = function (...args: unknown[]): number {
        if (!patchApplied) {
          for (const chunk of args) {
            if (patchApplied) {
              break;
            }
            if (!Array.isArray(chunk) || chunk.length < 2) {
              continue;
            }
            const modules = chunk[1] as Record<
              string | number,
              ((...a: unknown[]) => void) | undefined
            > | null;
            if (!modules || typeof modules !== 'object') {
              continue;
            }
            log(
              TAG,
              'chunk has',
              String(Object.keys(modules).length),
              'modules'
            );
            patchApplied = scanAndPatchModules(modules);
          }
        }
        return theirPush.apply(realArray, args);
      };
    },
  });
}

// Scan any chunks already in the array
for (let ci = 0; ci < realArray.length && !patchApplied; ci++) {
  const chunk = realArray[ci];
  if (!Array.isArray(chunk) || chunk.length < 2) {
    continue;
  }
  const modules = chunk[1] as Record<
    string | number,
    ((...a: unknown[]) => void) | undefined
  > | null;
  if (!modules || typeof modules !== 'object') {
    continue;
  }
  patchApplied = scanAndPatchModules(modules);
}

log(TAG, 'Interceptor installed, patchApplied:', String(patchApplied));
