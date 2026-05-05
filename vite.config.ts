import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import path from 'node:path';

import buildNumberPlugin, {
  getVersion,
} from './scripts/vite-increment-build-number';
import manifest from './manifest.json';

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  plugins: [
    react(),
    buildNumberPlugin(),
    {
      name: 'html-transform',
      transformIndexHtml(html: string) {
        return html.replace(/<%= __VERSION__ %>/g, getVersion());
      },
    },
    crx({ manifest }),
  ],
  build: { outDir: mode === 'development' ? 'build' : 'dist', sourcemap: true },
  server: { cors: { origin: '*' } },
}));
