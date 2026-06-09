import { log } from '@/tools/log';

const TAG = '[COOP-PATCH]';

function extractMethod(
  src: string,
  methodName: string,
  paramCount: number
): { start: number; end: number; body: string; params: string[] } | null {
  // Use negative lookbehind for '.' to skip call sites like this.x.onGamepadChanged(...)
  const re = new RegExp(
    '(?<!\\.)' + methodName + '\\s*\\(([^)]+)\\)\\s*\\{',
    'g'
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    if (!m[1]) {
      continue;
    }
    const params = m[1].split(',').map((p) => p.trim());
    if (params.length !== paramCount) {
      continue;
    }

    let braceCount = 0;
    let methodEnd = -1;
    const bodyStart = src.indexOf('{', m.index + m[0].length - 1);
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
      continue;
    }

    return {
      start: m.index,
      end: methodEnd,
      body: src.slice(m.index, methodEnd),
      params,
    };
  }
  return null;
}

function patchOnGamepadChanged(
  method: string,
  params: [string, string, string]
): string {
  const [sourceParam, indexParam, connectedParam] = params;
  let patched = method;

  // Insert logging + prototype exposure at method start
  const sigEnd = patched.indexOf('{');
  if (sigEnd !== -1) {
    patched =
      patched.slice(0, sigEnd + 1) +
      'if(!self.__XBVG__coopClass_prototype__){self.__XBVG__coopClass_prototype__=Object.getPrototypeOf(this);}' +
      `console.log("[COOP-PATCH] onGamepadChanged intercepted: source="+${sourceParam}+", index="+${indexParam}+", connected="+${connectedParam});` +
      patched.slice(sigEnd + 1);
  }

  // All hardcoded 0s in gamepadStates access → use the index param
  patched = patched.replace(
    /this\.gamepadStates\.get\(\d+\)/g,
    `this.gamepadStates.get(${indexParam})`
  );
  patched = patched.replace(
    /this\.gamepadStates\.set\(\d+,/g,
    `this.gamepadStates.set(${indexParam},`
  );
  patched = patched.replace(
    /this\.gamepadStates\.delete\(\d+\)/g,
    `this.gamepadStates.delete(${indexParam})`
  );

  // GamepadIndex property — always should be the index param
  patched = patched.replace(
    /GamepadIndex:\s*\d+/g,
    `GamepadIndex:${indexParam}`
  );

  // inputSink.onGamepadChanged first arg
  patched = patched.replace(
    /this\.inputSink\.onGamepadChanged\(\d+,/g,
    `this.inputSink.onGamepadChanged(${indexParam},`
  );

  // Comparisons: `0 === X.GamepadIndex` or `X.GamepadIndex === 0`
  patched = patched.replace(
    /\d+\s*===\s*(\w+)\.GamepadIndex/g,
    `${indexParam}===$1.GamepadIndex`
  );
  patched = patched.replace(
    /(\w+)\.GamepadIndex\s*===\s*\d+/g,
    `$1.GamepadIndex===${indexParam}`
  );

  return patched;
}

function patchOnGamepadInput(
  method: string,
  params: [string, ...string[]]
): string {
  const [sourceParam] = params;
  let patched = method;

  // The pattern in the for-of loop (with any variable names):
  //   <v1> = <sourceParam> + <v2>.GamepadIndex, <v3> = 0, <v4> = this.gamepadStates.get(<v3>)
  // We replace <v3> = 0 with <v3> = <v2>.GamepadIndex
  const re = new RegExp(
    '(\\w)\\s*=\\s*' +
      escapeRegExp(sourceParam) +
      '\\s*\\+\\s*(\\w)\\.GamepadIndex\\s*,\\s*(\\w)\\s*=\\s*\\d+\\s*,\\s*(\\w)\\s*=\\s*this\\.gamepadStates\\.get\\(\\3\\)',
    'g'
  );
  patched = patched.replace(
    re,
    `$1=${sourceParam}+$2.GamepadIndex,$3=$2.GamepadIndex,$4=this.gamepadStates.get($3)`
  );

  return patched;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function patchModuleSource(src: string): string | null {
  const changed = extractMethod(src, 'onGamepadChanged', 3);
  if (!changed) {
    log(TAG, 'could not find onGamepadChanged(3) signature');
    return null;
  }

  const patchedChanged = patchOnGamepadChanged(
    changed.body,
    changed.params as [string, string, string]
  );
  let result =
    src.slice(0, changed.start) + patchedChanged + src.slice(changed.end);

  log(TAG, 'Patching onGamepadChanged params:', changed.params.join(','));

  const input = extractMethod(result, 'onGamepadInput', 4);
  if (input) {
    const patchedInput = patchOnGamepadInput(
      input.body,
      input.params as [string, ...string[]]
    );
    result =
      result.slice(0, input.start) + patchedInput + result.slice(input.end);
    log(TAG, 'onGamepadInput patched');
  } else {
    log(TAG, 'WARNING: could not find onGamepadInput signature');
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
        'FOUND target module at key:',
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
          log(TAG, 'module', key, 'REPLACED successfully');
          return true;
        } catch (err: unknown) {
          log(TAG, 'ERROR creating patched function:', err);
        }
      }
      return false;
    }
  }
  return false;
}

if (localStorage.getItem('xvg-patchRemoteMultigamepad') === 'false') {
  log(TAG, 'patch disabled via settings (reload required to re-enable)');
} else {
  log(TAG, 'installing interceptor');

  const g = self as unknown as Record<string, unknown>;

  let patchApplied = false;

  let realArray: unknown[][] =
    (g['__LOADABLE_LOADED_CHUNKS__'] as unknown[][] | undefined) ?? [];

  function processChunks(args: unknown[]): void {
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
      const count = Object.keys(modules).length;
      log(TAG, 'chunk has', String(count), 'modules');
      patchApplied = scanAndPatchModules(modules);
    }
  }

  function installPushTrap(arr: unknown[][]): void {
    const nativePush = arr.push.bind(arr);
    function defaultPush(...args: unknown[]): number {
      return nativePush(...(args as unknown[][]));
    }
    let currentPush: (...args: unknown[]) => number = defaultPush;

    Object.defineProperty(arr, 'push', {
      configurable: true,
      enumerable: false,
      get() {
        return currentPush;
      },
      set(newPush: (...args: unknown[]) => number) {
        // Webpack is overwriting .push with jsonpCallback — wrap it
        log(TAG, '.push overwritten, wrapping');
        const theirPush = newPush;

        currentPush = function (...args: unknown[]): number {
          if (!patchApplied) {
            processChunks(args);
          }
          return theirPush.apply(arr, args);
        };
      },
    });
  }

  installPushTrap(realArray);

  Object.defineProperty(g, '__LOADABLE_LOADED_CHUNKS__', {
    configurable: true,
    get() {
      return realArray;
    },
    set(newVal: unknown) {
      if (Array.isArray(newVal)) {
        realArray = newVal as unknown[][];
        if (!patchApplied) {
          processChunks(realArray);
          installPushTrap(realArray);
        }
      }
    },
  });

  processChunks(realArray);

  log(TAG, 'interceptor installed, patchApplied:', String(patchApplied));
}
