import type { Plugin, UserConfig, ConfigEnv } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

const PKG_FILE = path.join(__dirname, '../package.json');
const MANIFEST_FILE = path.join(__dirname, '../manifest.json');

let g_version: string;

export function getVersion() {
  return g_version;
}

export default function buildNumberPlugin(): Plugin {
  return {
    name: 'vite-plugin-build-number',
    config(_config: UserConfig, env: ConfigEnv) {
      const pkg_json = fs.readFileSync(PKG_FILE, { encoding: 'utf8' });
      const pkg_object = JSON.parse(pkg_json) as Record<string, unknown>;
      if (env.command === 'build') {
        const old_version = pkg_object['version'] as string;
        const new_version = old_version.replace(/\d+$/, (d) =>
          String(parseInt(d) + 1)
        );
        g_version = new_version;
        const new_pkg_json = pkg_json.replace(
          `"version": "${old_version}"`,
          `"version": "${new_version}"`
        );
        fs.writeFileSync(PKG_FILE, new_pkg_json);

        const manifest_json = fs.readFileSync(MANIFEST_FILE, {
          encoding: 'utf8',
        });
        const manifest_object = JSON.parse(manifest_json) as Record<
          string,
          unknown
        >;
        const old_manifest_version = manifest_object['version'] as string;
        const new_manifest_json = manifest_json.replace(
          `"version": "${old_manifest_version}"`,
          `"version": "${new_version}"`
        );
        fs.writeFileSync(MANIFEST_FILE, new_manifest_json);

        console.log('📤 Build Updated:', new_version);
      } else {
        g_version = String(pkg_object['version']) + '-dev';
      }
    },
  };
}
