# Plan — F1: Subresource Integrity

Spec: [`docs/specs/f1-sri.md`](../specs/f1-sri.md)

Task numbering continues from m6 (last task = 18). Two tasks total.

**Scope.** Make the federation load path tamper-evident. Hash-of-hashes
chain: the shell's `main.ts` carries the manifest hash; the manifest
carries each `remoteEntry.json` hash; each `remoteEntry.json` carries the
hash of every module it owns. Trust root is the shell itself — whoever
controls `main.js` controls everything below.

**SRI is production-only.** Dev mode (`pnpm run dev`) stays SRI-free so
watch-rebuilds don't cascade across packages. Hash algorithm: SHA-384
throughout. Hash injection into `main.ts` via build-time string
replacement (esbuild `define` or a small codegen step), not post-build
bundle patching.

**Flexibility clause.** The executing agent may adjust scope and ordering
based on more up-to-date context discovered during implementation, as
long as each task still satisfies the sizing rules in `/plan`.

When a task is finished (DONE or BLOCKED), close it with the
`/wrap-up N` → `/commit N` pair. `/wrap-up N` writes or extends
`docs/task-log/task-{N}-{slug}.md` and is safe to run multiple times
across sessions — it merges. `/commit N` reads that log, stages code +
summary, and commits them together after showing the plan and waiting
for confirmation. Optionally run `/review` (quick per-task, full before
a PR) between wrap-up and commit; a second `/wrap-up N` can absorb the
review findings.

---

## Task 19: Remotes and host emit integrity hashes

**Instructions.**

Enable `features.integrityHashes: true` in all three federation configs:

- `packages/whiteboard/federation.config.js` — extend existing
  `features: { ignoreUnusedDeps: true }`.
- `packages/mermaid/federation.config.js` — extend existing
  `features: { ignoreUnusedDeps: true }`.
- `packages/shell/federation.config.mjs` — extend existing
  `features: { denseChunking: true }`. The host carries its own
  `remoteEntry.json` as a shared-deps manifest, so the flag must be
  enabled here too.

Rebuild each package (`pnpm -F <pkg> build:federate` for the remotes;
the shell's prod build for the host) and confirm each `remoteEntry.json`
now has a non-empty top-level `integrity` object keyed by emitted output
filenames with `sha384-…` values, covering exposed modules, shared
externals, and chunks.

Do **not** change `initFederation` arguments or `main.ts` in this task —
this change only adds integrity *metadata* to artifacts. No hashes are
consumed yet, so the runtime behavior must stay identical.

**Acceptance.**

- **T19-AC-01** — Each of `dist/deploy/whiteboard/remoteEntry.json`,
  `dist/deploy/mermaid/remoteEntry.json`, and the shell's own
  `dist/deploy/remoteEntry.json` contains a non-empty top-level
  `integrity` object mapping each emitted output filename (exposed
  modules, shared externals, chunks) to a `sha384-…` hash. (F1-AC-01)
- **T19-AC-02** — `pnpm run build:deploy` succeeds end-to-end and the
  served prod bundle (`mv dist/deploy dist/frankenstein-meeting-room &&
  npx serve dist -p 8088`, open
  `http://localhost:8088/frankenstein-meeting-room/`) renders both
  remotes identically to current behavior — no new console errors, same
  artifact set in the Network panel.

**Key Locations.**

- `packages/whiteboard/federation.config.js`
- `packages/mermaid/federation.config.js`
- `packages/shell/federation.config.mjs`
- Generated `dist/**/remoteEntry.json` (verification target)

**Key Discoveries.**

- `@softarc/native-federation` (remotes) and
  `@angular-architects/native-federation-v4` (shell) both expose
  `features.integrityHashes`. Extend the existing `features` object on
  each config — don't replace it (the existing `denseChunking` /
  `ignoreUnusedDeps` flags must stay).
- The shell is the host *and* ships its own `remoteEntry.json` for
  shared deps. The flag applies here too — Task 20 will hash that file.

---

## Task 20: Shell build pipeline computes and consumes integrity

**Instructions.**

Extend `scripts/build-deploy.mjs` with three SHA-384 hash computations
slotted between the existing phases:

1. **After remotes are built, before assembling the prod manifest.**
   Hash each remote's deployed `remoteEntry.json` bytes. Rewrite the
   prod manifest (`packages/shell/public/federation.manifest.json`, or a
   generated `federation.manifest.prod.json` — pick what fits cleaner
   into the existing flow) so every entry becomes object shape:
   `{ "url": "...", "integrity": "sha384-..." }`. Convert *all* entries
   to object shape; no mixed string/object form in prod.
2. **After remotes are built, before the shell builds.** Hash the
   shell's own deployed `remoteEntry.json` bytes. Expose as a build-time
   constant consumed by `main.ts`.
3. **After the shell builds, before final assembly into `dist/deploy/`.**
   Hash the final `federation.manifest.json` (the rewritten object-shape
   version from step 1). Inject as the `manifestIntegrity` literal in
   the emitted `main.js`.

Implement injection via **build-time string replacement** (esbuild
`define` plumbing wired into `packages/shell/scripts/ng-build.mjs`, or a
small codegen step that writes a generated TS file consumed by
`main.ts`). Do not post-build patch the bundle.

Update `packages/shell/src/main.ts`:

- Replace `hostRemoteEntry: './remoteEntry.json'` with
  `hostRemoteEntry: { url: './remoteEntry.json', integrity: <constant> }`.
- Add `manifestIntegrity: <constant>` to the second-arg options.
- Gate both integrity arguments behind a build-time flag (e.g.
  `process.env.SRI_ENABLED` defined via esbuild `define`) so dev mode
  (`ng serve` / `pnpm run dev`) continues to call `initFederation`
  without integrity args. Dev must remain watch-driven and untouched.

Build-order constraint: remotes must build before the shell because the
shell needs each remote's final `remoteEntry.json` bytes to compute its
hash for the manifest. The current `scripts/build-deploy.mjs` already
sequences `remotes → shell → copy`; the hash-compute steps slot in
without restructuring that order, except that the manifest must be
rewritten *before* the shell build (so the shell embeds the hash of the
final manifest, not the dev-shape original).

Keep the existing cache-bust on the manifest fetch
(`federation.manifest.json?t=${Date.now()}` in `main.ts`) — SRI hashes
response bytes, not the URL.

Document in `docs/deployment.md`: SRI is part of the production build,
not a runtime toggle. List the secure-context requirement (HTTPS or
`localhost`) and the build-order constraint (remotes before shell).

**Acceptance.**

- **T20-AC-01** — `dist/deploy/federation.manifest.json` has every
  federated remote in object shape
  `{ "url": "...", "integrity": "sha384-..." }`, and each integrity
  value matches a freshly recomputed SHA-384 of the corresponding
  `dist/deploy/<remote>/remoteEntry.json`. (F1-AC-02)
- **T20-AC-02** — `dist/deploy/main-*.js` contains the literal SHA-384
  of `dist/deploy/federation.manifest.json` as the `manifestIntegrity`
  argument to `initFederation` (verifiable via `grep` for the hash
  string or source-map lookup). (F1-AC-03)
- **T20-AC-03** — `dist/deploy/main-*.js` passes
  `hostRemoteEntry: { url: './remoteEntry.json', integrity: 'sha384-...' }`
  to `initFederation`, and the integrity value matches a fresh SHA-384
  of `dist/deploy/remoteEntry.json`. (F1-AC-04)
- **T20-AC-04** — Untampered prod build served locally
  (`mv dist/deploy dist/frankenstein-meeting-room && npx serve dist -p 8088`)
  loads both remotes identically to current behavior — no new console
  errors, same Network-panel artifact set and load order. (F1-AC-07)
- **T20-AC-05** — `pnpm run dev` launches all three packages with no
  SRI involvement and no hash-related console errors; watch-driven
  rebuild of a single remote does not require a shell rebuild.
  (F1-AC-08, dev half — touches XC-01)
- **T20-AC-06** — `docs/deployment.md` documents SRI as a
  production-build feature, lists the secure-context requirement, and
  notes the build-order constraint.

**Key Locations.**

- `scripts/build-deploy.mjs` — three hash-compute steps slot in here.
- `packages/shell/src/main.ts` — `initFederation` call site.
- `packages/shell/public/federation.manifest.json` — current source;
  rewritten or replaced by a prod variant.
- `packages/shell/scripts/ng-build.mjs` — esbuild `define` plumbing may
  live here, or a sibling codegen step.
- `packages/shell/package.json` — may need a new `build:deploy` variant
  that threads the `SRI_ENABLED` flag and accepts injected constants.
- `docs/deployment.md` — SRI documentation block.

**Key Discoveries.**

- Current `main.ts` (`packages/shell/src/main.ts:16-22`) passes
  `hostRemoteEntry: './remoteEntry.json'` as a bare string. Under SRI
  this becomes `{ url, integrity }`. The same call site adds
  `manifestIntegrity` to the options object.
- `useShimImportMap({ shimMode: true })` **must stay**. Native browser
  support for the import-map `integrity` block is rolling out but not
  universally enforced; without `es-module-shims`, module-level SRI
  silently degrades to "best effort". Removing or downgrading to
  `useDefaultImportMap()` would silently demote SRI.
- The orchestrator hashes response bytes via `crypto.subtle.digest()`
  *before* parsing as JSON — only resolves in secure contexts (HTTPS or
  `localhost`). Both current targets (`lutzleonhardt.de/frankenstein-meeting-room/`
  and `localhost:4200`) satisfy this. Plain-HTTP staging would silently
  break SRI.
- Mixed pinning (some entries with integrity, some without) *is*
  supported by the runtime per the SRI spec, but the F1 spec mandates
  all-object shape in prod manifests for consistency.
- The build orchestration in `scripts/build-deploy.mjs` already
  sequences `pnpm -F shell clean` → `pnpm -F shell build:deploy` →
  remote builds → assemble. SRI requires inverting one ordering: the
  remote `remoteEntry.json` files must exist *before* the shell builds,
  so the shell can embed their hashes. Audit the script for that
  reordering — the current sequence builds the shell first.
- Dev mode rebuilds invalidate hashes on every change; wiring SRI into
  `pnpm run dev` would force a shell rebuild whenever any remote
  rebuilds and kill the watch-driven feedback loop. The build-time flag
  gates this cleanly.

---

## Cross-Cutting Acceptance

- **XC-01** — Production deploy under
  `https://lutzleonhardt.de/frankenstein-meeting-room/` continues to
  work end-to-end with SRI enabled; dev mode (`pnpm run dev`) continues
  to work without SRI involvement. Secure-context requirement is
  satisfied at both targets. **Touches:** T19, T20.
