// Stub navigator.userAgent for script-helpers.ts (used at module load time)
Object.defineProperty(globalThis.navigator, 'userAgent', {
  value: '',
  configurable: true,
});

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

register(pathToFileURL(resolve('./test/unit/loader.mjs')).href);
