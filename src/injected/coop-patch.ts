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

function extractMethod(
  src: string,
  signature: string
): { start: number; end: number; body: string } | null {
  let methodStart = src.indexOf(signature + '{');
  if (methodStart === -1) {
    // Try with spaces
    const spaced = signature.replace(/,/g, ', ');
    methodStart = src.indexOf(spaced);
    if (methodStart === -1) {
      return null;
    }
  }

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
    return null;
  }

  return {
    start: methodStart,
    end: methodEnd,
    body: src.slice(methodStart, methodEnd),
  };
}

function patchOnGamepadChanged(method: string): string {
  let patched = method;

  // Insert logging + prototype exposure at method start
  const sigEnd = patched.indexOf('{');
  if (sigEnd !== -1) {
    patched =
      patched.slice(0, sigEnd + 1) +
      'if(!self.__XBVG__coopClass_prototype__){self.__XBVG__coopClass_prototype__=Object.getPrototypeOf(this);}' +
      'console.log("[COOP-PATCH] onGamepadChanged intercepted: source="+e+", index="+t+", connected="+i);' +
      patched.slice(sigEnd + 1);
  }

  patched = patched.replace(
    /this\.gamepadStates\.get\(0\)/g,
    'this.gamepadStates.get(t)'
  );
  patched = patched.replace(/GamepadIndex:\s*0/g, 'GamepadIndex:t');
  patched = patched.replace(
    /this\.inputSink\.onGamepadChanged\(0,/g,
    'this.inputSink.onGamepadChanged(t,'
  );
  patched = patched.replace(
    /this\.gamepadStates\.set\(0,/g,
    'this.gamepadStates.set(t,'
  );
  patched = patched.replace(
    /this\.gamepadStates\.delete\(0\)/g,
    'this.gamepadStates.delete(t)'
  );
  patched = patched.replace(/0\s*===\s*e\.GamepadIndex/g, 't===e.GamepadIndex');
  patched = patched.replace(/e\.GamepadIndex\s*===\s*0/g, 'e.GamepadIndex===t');

  return patched;
}

function patchOnGamepadInput(method: string): string {
  let patched = method;

  // Insert logging at method start
  const sigEnd = patched.indexOf('{');
  if (sigEnd !== -1) {
    patched =
      patched.slice(0, sigEnd + 1) +
      'console.log("[COOP-PATCH] onGamepadInput intercepted");' +
      patched.slice(sigEnd + 1);
  }

  // Replace the hardcoded `i = 0` in the for-of loop with `i = u.GamepadIndex`
  // Minified: `const t=e+u.GamepadIndex,i=0,n=this.gamepadStates.get(i)`
  // We need: `i=u.GamepadIndex` instead of `i=0`
  patched = patched.replace(
    /(\w)\s*=\s*e\s*\+\s*(\w)\.GamepadIndex\s*,\s*(\w)\s*=\s*0\s*,\s*(\w)\s*=\s*this\.gamepadStates\.get\(\3\)/g,
    '$1=e+$2.GamepadIndex,$3=$2.GamepadIndex,$4=this.gamepadStates.get($3)'
  );

  return patched;
}

function patchModuleSource(src: string): string | null {
  log(TAG, '  patchModuleSource: source length:', String(src.length));

  // --- Patch onGamepadChanged ---
  const changed = extractMethod(src, 'onGamepadChanged(e,t,i)');
  if (!changed) {
    log(TAG, '  could not find onGamepadChanged signature');
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
  log(TAG, '  found onGamepadChanged at offset', String(changed.start));

  const patchedChanged = patchOnGamepadChanged(changed.body);
  let result =
    src.slice(0, changed.start) + patchedChanged + src.slice(changed.end);

  // --- Patch onGamepadInput ---
  const input = extractMethod(result, 'onGamepadInput(e,t,i,n)');
  if (input) {
    log(TAG, '  found onGamepadInput at offset', String(input.start));
    const patchedInput = patchOnGamepadInput(input.body);
    result =
      result.slice(0, input.start) + patchedInput + result.slice(input.end);
    log(TAG, '  onGamepadInput patched');
  } else {
    log(TAG, '  WARNING: could not find onGamepadInput signature');
  }

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
