import type { Plugin, UserConfig, ConfigEnv } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

const FILE = path.join(__dirname, '../package.json');

let g_version: string;

export function getVersion() {
  return g_version;
}

export default function buildNumberPlugin(): Plugin {
  return {
    name: 'vite-plugin-build-number',
    config(_config: UserConfig, env: ConfigEnv) {
      const file_json = fs.readFileSync(FILE, { encoding: 'utf8' });
      const file_object = JSON.parse(file_json) as Record<string, unknown>;
      if (env.command === 'build') {
        const old_version = file_object['version'] as string;
        const new_version = old_version.replace(/\d+$/, (d) =>
          String(parseInt(d) + 1)
        );
        g_version = new_version;
        const new_json = file_json.replace(
          `"version": "${old_version}"`,
          `"version": "${new_version}"`
        );
        fs.writeFileSync(FILE, new_json);
        console.log('📤 Build Updated:', new_version);
      } else {
        g_version = String(file_object['version']) + '-dev';
      }
    },
  };
}
