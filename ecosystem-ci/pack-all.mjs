/**
 * Pack all non-private workspace packages into the workspace root.
 * Replicates `pnpm -r pack` behavior (pnpm places tarballs in workspace root).
import { execSync } from 'node:child_process';
 */
import { readFileSync } from 'node:fs';
import { glob } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import yaml from 'js-yaml';

const rootDir = join(fileURLToPath(import.meta.url), '../..');
const wsConfig = yaml.load(readFileSync(join(rootDir, 'pnpm-workspace.yaml'), 'utf8'));

for (const pattern of wsConfig.packages ?? []) {
  for await (const entry of glob(`${pattern}/package.json`, { cwd: rootDir })) {
    const pkg = JSON.parse(readFileSync(join(rootDir, entry), 'utf8'));
    if (pkg.private || !pkg.name || !pkg.version) continue;
    const pkgDir = join(rootDir, dirname(entry));
    execSync(`npm pack --pack-destination "${rootDir}"`, { cwd: pkgDir, stdio: 'inherit' });
  }
}
