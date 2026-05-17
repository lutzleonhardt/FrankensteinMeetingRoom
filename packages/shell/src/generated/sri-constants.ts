// Build-time SRI constants. The committed values disable SRI for dev
// (`ng serve` / `pnpm -F shell start`). `scripts/build-deploy.mjs`
// temporarily rewrites this file with the real hashes during the two-pass
// production build and restores the stub in a `finally` block. If a build
// is killed mid-run and leaves the file in a prod state, run
// `git checkout packages/shell/src/generated/sri-constants.ts` to recover.
export const sriEnabled = false;
export const manifestIntegrity = '';
export const hostRemoteEntryIntegrity = '';
