#!/usr/bin/env node
import { readFileSync, rmSync, cpSync, mkdirSync, copyFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sh = (cmd) => {
  console.log(`\n[build-deploy] $ ${cmd}`);
  execSync(cmd, { cwd: repoRoot, stdio: 'inherit' });
};

const manifestPath = resolve(
  repoRoot,
  'packages/shell/public/federation.manifest.json',
);
const manifestText = readFileSync(manifestPath, 'utf8');
if (manifestText.includes('http://localhost')) {
  console.warn(
    '\n[build-deploy] WARN: packages/shell/public/federation.manifest.json still references http://localhost.',
  );
  console.warn(
    '[build-deploy] WARN: Swap to relative paths ({"whiteboard": "whiteboard/remoteEntry.json", "mermaid": "mermaid/remoteEntry.json"}) before a real deploy build.',
  );
  console.warn(
    '[build-deploy] WARN: Continuing — the produced bundle will 404 on remotes when served under the subpath.',
  );
}

sh('pnpm -F shell clean');
sh('pnpm -F whiteboard clean');
sh('pnpm -F mermaid clean');

sh('pnpm -F shell build:deploy');

sh('pnpm -F whiteboard build:standalone');
sh('pnpm -F whiteboard build:federate');

sh('pnpm -F mermaid build:standalone');
sh('pnpm -F mermaid build:federate');

const deployRoot = resolve(repoRoot, 'dist/deploy');
rmSync(deployRoot, { recursive: true, force: true });
mkdirSync(deployRoot, { recursive: true });

cpSync(
  resolve(repoRoot, 'packages/shell/dist/shell/browser'),
  deployRoot,
  { recursive: true, force: true },
);
cpSync(
  resolve(repoRoot, 'packages/whiteboard/dist'),
  resolve(deployRoot, 'whiteboard'),
  { recursive: true, force: true },
);
cpSync(
  resolve(repoRoot, 'packages/mermaid/dist'),
  resolve(deployRoot, 'mermaid'),
  { recursive: true, force: true },
);

// Remote build.mjs scripts treat public/ as dev-server read-through and don't
// emit dist/index.html. Copy each remote's standalone HTML into the assembled
// tree so /<subpath>/whiteboard/ and /<subpath>/mermaid/ resolve to the
// standalone bundle.
copyFileSync(
  resolve(repoRoot, 'packages/whiteboard/public/index.html'),
  resolve(deployRoot, 'whiteboard/index.html'),
);
copyFileSync(
  resolve(repoRoot, 'packages/mermaid/public/index.html'),
  resolve(deployRoot, 'mermaid/index.html'),
);

console.log('\n[build-deploy] dist/deploy/ ready.');
console.log('[build-deploy] Smoke-serve recipe (subpath via parent dir):');
console.log('  mv dist/deploy dist/frankenstein-meeting-room');
console.log('  npx serve dist -p 8088');
console.log('  open http://localhost:8088/frankenstein-meeting-room/');
