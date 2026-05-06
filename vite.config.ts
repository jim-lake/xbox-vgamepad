import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import path from 'node:path';
import { build } from 'vite';
import fs from 'node:fs';

import buildNumberPlugin, {
  getVersion,
} from './scripts/vite-increment-build-number';
import manifest from './manifest.json';

function injectedScriptPlugin() {
  let outDir = 'dist';
  return {
    name: 'build-injected-script',
    configResolved(config: { build: { outDir: string } }) {
      outDir = config.build.outDir;
    },
    async closeBundle() {
      await build({
        configFile: false,
        resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
        build: {
          emptyOutDir: false,
          outDir,
          sourcemap: true,
          lib: {
            entry: path.resolve(import.meta.dirname, 'src/injected/index.ts'),
            formats: ['iife'],
            name: 'xvg',
            fileName: () => 'src/injected/index.js',
          },
          rollupOptions: {
            output: { inlineDynamicImports: true },
          },
        },
        define: { 'process.env.NODE_ENV': '"production"' },
      });
      // Update manifest to add injected script to web_accessible_resources
      const manifestPath = path.resolve(outDir, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        const m = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        if (m.web_accessible_resources) {
          // Add injected script to first entry's resources
          const first = m.web_accessible_resources[0];
          if (first && !first.resources.includes('src/injected/index.js')) {
            first.resources.unshift('src/injected/index.js');
          }
        } else {
          m.web_accessible_resources = [
            {
              resources: ['src/injected/index.js'],
              matches: ['*://*.xbox.com/*', 'https://gamepad-tester.com/*', 'http://localhost:9332/*', 'http://localhost:9333/*', 'http://localhost:5173/*'],
            },
          ];
        }
        fs.writeFileSync(manifestPath, JSON.stringify(m, null, 2));
      }
    },
  };
}

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
    injectedScriptPlugin(),
  ],
  build: { outDir: mode === 'development' ? 'build' : 'dist', sourcemap: true },
  server: { cors: { origin: '*' } },
}));
