import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import path from 'node:path';

import buildNumberPlugin from './scripts/vite-increment-build-number';
import manifest from './manifest.json';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const outDir =
    mode === 'development' ? 'build' : mode === 'test' ? 'build-test' : 'dist';

  const manifestCopy = _clone(manifest);
  if (mode === 'test') {
    const testMatch = 'http://127.0.0.1:9444/*';
    for (const script of manifestCopy.content_scripts) {
      script.matches.push(testMatch);
    }
    for (const entry of manifestCopy.web_accessible_resources) {
      entry.matches.push(testMatch);
    }
  }

  return {
    resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
    plugins: [
      react(),
      buildNumberPlugin(),
      crx({ manifest: manifestCopy, mainLoaderAsync: false }),
    ],
    build: { outDir, sourcemap: true },
    server: { cors: { origin: '*' } },
  };
});
function _clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}
