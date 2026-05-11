// Workaround for the @angular-architects/native-federation-v4 post-step
// hanging after Angular has already written the build artifacts. The presence
// of dist/shell/browser/index.html is the truth signal: once it lands, kill
// the build process group and exit 0. If ng build itself fails (no artifact),
// propagate its exit code. A 5-minute hard ceiling guards against genuine
// stuck states.

import { spawn } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';

const ARTIFACT = 'dist/shell/browser/index.html';
const POLL_MS = 500;
const CEILING_MS = 5 * 60 * 1000;

rmSync(ARTIFACT, { force: true });

const ng = spawn('ng', ['build', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: true,
  detached: true,
});

let done = false;
const finish = (code) => {
  if (done) return;
  done = true;
  clearInterval(poll);
  clearTimeout(ceiling);
  try { process.kill(-ng.pid, 'SIGKILL'); } catch {}
  process.exit(code);
};

const poll = setInterval(() => {
  if (existsSync(ARTIFACT)) {
    console.log('\n[ng-build] artifact written → terminating NF post-step');
    finish(0);
  }
}, POLL_MS);

const ceiling = setTimeout(() => {
  console.error('[ng-build] 5min ceiling reached without artifact; aborting');
  finish(1);
}, CEILING_MS);

ng.on('close', (code) => {
  if (!done) finish(existsSync(ARTIFACT) ? 0 : (code ?? 1));
});
