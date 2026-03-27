import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { glob } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import yaml from 'js-yaml';

const rootDir = join(fileURLToPath(import.meta.url), '../..');
const wsConfig = yaml.load(readFileSync(join(rootDir, 'pnpm-workspace.yaml'), 'utf8'));
const catalog = wsConfig.catalog ?? {};

// Build a map of workspace package versions for resolving workspace: protocol
const workspaceVersions = {};
for (const pattern of wsConfig.packages ?? []) {
  for await (const entry of glob(`${pattern}/package.json`, { cwd: rootDir })) {
    const pkg = JSON.parse(readFileSync(join(rootDir, entry), 'utf8'));
    if (pkg.name && pkg.version) workspaceVersions[pkg.name] = pkg.version;
  }
}

function resolveVersion(name, version) {
  if (typeof version !== 'string') return version;
  if (version === 'catalog:' || version.startsWith('catalog:')) {
    return catalog[name] ?? version;
  }
  if (version.startsWith('workspace:')) {
    return workspaceVersions[name] ? `^${workspaceVersions[name]}` : version;
  }
  return version;
}

function resolveDeps(deps) {
  if (!deps) return deps;
  return Object.fromEntries(Object.entries(deps).map(([k, v]) => [k, resolveVersion(k, v)]));
}

for (const pattern of wsConfig.packages ?? []) {
  for await (const entry of glob(`${pattern}/package.json`, { cwd: rootDir })) {
    const pkgPath = join(rootDir, entry);
    const original = readFileSync(pkgPath, 'utf8');
    const pkg = JSON.parse(original);
    if (pkg.private || !pkg.name || !pkg.version) continue;

    const patched = {
      ...pkg,
      dependencies: resolveDeps(pkg.dependencies),
      peerDependencies: resolveDeps(pkg.peerDependencies),
      optionalDependencies: resolveDeps(pkg.optionalDependencies),
    };
    writeFileSync(pkgPath, JSON.stringify(patched, null, 2) + '\n');
    try {
      execSync(`npm pack --pack-destination "${rootDir}"`, { cwd: join(rootDir, dirname(entry)), stdio: 'inherit' });
    } finally {
      writeFileSync(pkgPath, original);
    }
  }
}
