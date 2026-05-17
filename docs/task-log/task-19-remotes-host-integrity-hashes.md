# Task 19 — Remotes and host emit integrity hashes

### Task
Turn on `features.integrityHashes: true` in all three Native
Federation configs (whiteboard, mermaid, shell) so each
`remoteEntry.json` ships a non-empty top-level `integrity` map
of `<filename>.js → sha384-…` covering exposed modules, shared
externals, and chunks. No consumer wiring — pure metadata
emission, foundation for T20.

### Status
DONE. Both ACs satisfied; static-serving smoke verified.
Visual browser pass (no console errors, both remotes render) is
the residual empirical gate — runtime path is byte-identical to
the previous bundle (no `initFederation` or `main.ts` change),
so regression risk is bounded to "metadata-only field" semantics.

### Files Modified

- `packages/whiteboard/federation.config.js` (modified, +1/−1) —
  extended `features` from `{ ignoreUnusedDeps: true }` to
  `{ ignoreUnusedDeps: true, integrityHashes: true }`.
- `packages/mermaid/federation.config.js` (modified, +1/−1) —
  same one-line extension; `ignoreUnusedDeps` stays load-bearing
  per T10's `WARN No meta data found for shared lib
  ./MermaidEditor.svelte` workaround.
- `packages/shell/federation.config.mjs` (modified, +4 lines) —
  added `integrityHashes: true` to the existing `features` block
  alongside `denseChunking: true`. Two-line inline comment
  documents that this is the consumer side of the SRI chain
  (T20 will wire the hashes).
- `packages/whiteboard/package.json` (modified, +1/−1) — bumped
  declared `@softarc/native-federation` from `~4.0.0` to
  `^4.1.3`. `package.json` now matches the version actually
  installed; before this edit, the file declared a constraint
  the build wasn't using (Smell flagged mid-session — see Key
  Decision §2).
- `packages/mermaid/package.json` (modified, +1/−1) — same bump
  on mermaid for the same reason.
- `package.json` (root, modified, +5 lines) — added
  `pnpm.overrides` pinning `@softarc/native-federation` to
  `4.1.3` across the workspace. Required because
  `@softarc/native-federation-esbuild@4.0.0-RC10` declares NF
  as a hard `dependencies` constraint `~4.0.0`, and 4.1.x is
  where the `integrityHashes` feature lives. See Key Decisions
  §1 and §2 for the analysis + Smell discussion.
- `pnpm-lock.yaml` (modified, −6 net) — regenerated.
  `@softarc+native-federation@4.0.1` removed entirely from the
  store; only `@softarc+native-federation@4.1.3` remains. The
  esbuild plugin's nested `node_modules/.../native-federation`
  symlink now points at the 4.1.3 store entry (verified via
  `readlink`).

### Files Read (Context Only)

- `docs/plans/f1-sri.md` — preamble (lines 1–33) + Task 19 block
  (lines 34–90). AC IDs, file locations, and Key Discoveries
  read verbatim; the "both libraries expose `integrityHashes`"
  Key Discovery turned out to be true *for the libraries* but
  false *for the pinned versions in this repo* — see Key
  Decision §1.
- `docs/task-log/task-18-deployment-docs.md` — direct
  predecessor. Pure-docs task; only the smoke-serve recipe
  (`mv dist/deploy dist/frankenstein-meeting-room && npx serve
  dist -p 8088`) carried forward into AC-02 verification.
- `docs/task-log/task-10-mermaid-federation.md` — bounded
  relevance search (`rg 'integrityHashes|features|federation\.
  config'`). Carried forward: `features: { ignoreUnusedDeps:
  true }` on mermaid's config is load-bearing (downgrades NF
  "no metadata" errors for `.svelte` shared libs to WARNs) — so
  T19 must *extend* the object, not replace it.
- `docs/task-log/task-2-shell-native-federation-host.md` —
  established `features: { denseChunking: true }` on the shell;
  confirmed shell uses `@angular-architects/native-federation-v4`
  (not bare `@softarc/native-federation`). The NFv4 wrapper
  pulls `@softarc/native-federation@4.1.3` as its dependency —
  which is why the shell emitted `integrity` on the first build
  attempt while the remotes did not.
- `packages/{whiteboard,mermaid,shell}/federation.config.{js,mjs}` —
  full read of all three configs before editing, to find the
  exact `features` block.
- `packages/{whiteboard,mermaid}/package.json` — to see declared
  `@softarc/native-federation` constraint (`~4.0.0`).
- `package.json` (root) — confirmed no existing `pnpm.overrides`
  block before introducing one.
- `node_modules/.pnpm/@softarc+native-federation@4.1.3_.../src/`
  (the actual NF library source) — searched for
  `integrityHashes` to verify the feature exists and where it
  emits the `integrity` field. Found `build-for-federation.js:88-92`
  populating `federationInfo.integrity` only when the flag is on.
- `node_modules/.pnpm/@softarc+native-federation@4.0.1_.../` —
  confirmed empty `rg integrityHashes` result; flag does not
  exist in 4.0.x at all (was added in 4.1.0).
- `node_modules/.pnpm/@softarc+native-federation-esbuild@4.0.0-RC10_.../package.json` —
  confirmed `dependencies: { @softarc/native-federation: ~4.0.0 }`,
  `peerDependencies: null`. This is the structural smell
  (see Open Issues → upstream feedback).
- `index.d.ts` of NF 4.0.1 vs 4.1.3 — `diff` showed byte-identical
  public exports + `buildForFederation` signature. Confirms the
  pnpm override is API-safe.
- `dist/deploy/{,whiteboard/,mermaid/}remoteEntry.json` (build
  output) — verification target for AC-01.

### Key Decisions

— session 2026-05-17

1. **Plan's "both libraries expose `integrityHashes`" Key
   Discovery was version-blind; first build emitted integrity
   only on the shell.** Investigation chain:
   - First build (configs edited, no dep changes): shell's
     `remoteEntry.json` got a 19-key integrity map, but
     whiteboard's and mermaid's stayed integrity-less.
   - Root cause: `packages/{whiteboard,mermaid}/package.json`
     pin `@softarc/native-federation: ~4.0.0`, which resolves
     to `4.0.1`. `integrityHashes` was added in `4.1.0`. On
     `4.0.1` the flag is a silently-ignored unknown property.
   - The shell uses `@angular-architects/native-federation-v4@21.2.1`,
     which transitively pulls `@softarc/native-federation@4.1.3` —
     hence the shell already had the feature available before
     this task.
   - `@softarc/native-federation-esbuild@4.0.0-RC10` (the
     esbuild plugin both remotes use) hard-pins
     `@softarc/native-federation: ~4.0.0` as a *dependency*
     (not peer). Bumping only the remotes' direct
     `package.json` dep wouldn't have helped — the plugin
     imports its own nested copy via the pnpm symlink graph,
     and that nested copy is what runs at build time.
   - `@softarc/native-federation-esbuild@4.1.x` does not exist
     on npm. RC10 is the latest published release of the build
     plugin.

2. **Used `pnpm.overrides` to force the plugin's transitive NF
   to `4.1.3` across the workspace.** Options considered:
   - **Pin only via override** (status quo at first). Smell:
     `packages/{whiteboard,mermaid}/package.json` keep declaring
     `~4.0.0` while the install delivers `4.1.3`. The file
     lies about what runs.
   - **Bump declared constraint *and* keep override** (chosen
     after mid-session review with the user). The remotes'
     `package.json` now declares `^4.1.3`, matching reality.
     The override remains, scoped narrowly to a single line
     in the root `package.json`. Its only job is to bend the
     hard `~4.0.0` constraint from the esbuild plugin's
     `package.json` — the override is now the *minimum*
     workaround surface, and any future reader can trace its
     necessity to the plugin's mis-declared dep.
   - **Wait for `native-federation-esbuild@4.1.x`**
     (alternative dismissed). Doesn't exist yet; we'd be
     blocked indefinitely on softarc's release cadence.
   - **Switch build plugin** (alternative dismissed). Out of
     scope, would discard T7/T10's tuned esbuild pipeline.
   API-safety of the override was verified before adoption:
   `diff` of `@softarc/native-federation@4.0.1` and `4.1.3`
   `src/index.d.ts` is empty (byte-identical public exports),
   and `buildForFederation.d.ts` signatures match. The 4.1.x
   additions are purely additive behind feature flags. Override
   pins exact version `4.1.3` rather than range — relies on no
   auto-bump infra in this repo; future minor bumps would be
   explicit edits, which is the right cadence for a "load-bearing
   workaround" pin.

3. **Override stays in `pnpm.overrides` rather than
   `pnpm.overrideDependencyPaths` or per-package overrides.**
   The override is workspace-wide and applies to a single
   package — the simplest expression of "this version,
   everywhere" is `pnpm.overrides`. Scoping it to a single
   importer would buy nothing (only the esbuild plugin sees
   the constraint anyway).

4. **`federation.manifest.json` swap reverted after smoke
   check.** Per `docs/deployment.md` Step 1, the swap from
   `http://localhost:3000/...` to `./whiteboard/remoteEntry.json`
   is a manual *deploy-time* step, not a build-time output.
   Smoke-served once with the swap to verify static URLs
   resolve, then restored the dev-mode URLs so the working
   tree reflects "post-build, pre-deploy" state.

5. **No edits to `initFederation`, `main.ts`, or the
   orchestrator script.** Plan explicitly partitions T19
   (emission) from T20 (consumption); kept the diff disciplined
   to that boundary so T20's diff stays focused on the runtime
   wiring.

### Test Evidence

— session 2026-05-17

- **T19-AC-01 — integrity maps emitted on all three
  `remoteEntry.json`.**
  ```
  jq '{has_integrity, key_count, all_sha384}' on dist/deploy/...
  shell:      has=true, keys=19, all sha384-
  whiteboard: has=true, keys=8,  all sha384-
  mermaid:    has=true, keys=2,  all sha384-
  ```
  Key coverage spot-check:
  - **Shell (19):** 9 shared externals (`_angular_common.*.js`,
    `_angular_core.*.js`, `rxjs.*.js`, `tslib.*.js`, etc.) +
    7 dense-chunked anonymous chunks (`chunk-*.js`) + 3
    rxjs-operators / interop = full shared+chunks surface.
  - **Whiteboard (8):** exposed `Bootstrap-7COJRA5I.js` +
    `_excalidraw_excalidraw.*.js` + 5 React-family shares
    (`react.*`, `react_dom.*`, `react_dom_client.*`,
    `react_dom_profiling.*`, `react_jsx_runtime.*`,
    `react_jsx_dev_runtime.*`). Matches T7's share map.
  - **Mermaid (2):** exposed `Bootstrap-BBNZEAEH.js` +
    `mermaid.*.js`. Svelte intentionally bundled-inline
    (T10 Key Decision §2), so no separate `svelte_internal_client.*`
    share — and therefore no integrity entry for it. Correct
    by design.
  Every integrity key resolved to a real file on disk:
  - shell: 19/19 OK
  - whiteboard: 8/8 OK
  - mermaid: 2/2 OK
  **AC-01 passed.**

- **T19-AC-02 — `pnpm run build:deploy` succeeds, smoke serve
  responds on all canonical URLs.**
  ```
  pnpm run build:deploy → exit 0
  Whiteboard standalone build complete.
  Whiteboard federate build complete.
  Mermaid standalone build complete.
  Mermaid federate build complete.
  [build-deploy] dist/deploy/ ready.
  ```
  After manual manifest swap to `./`-prefixed shape and
  `mv dist/deploy dist/frankenstein-meeting-room`, started
  `npx serve dist -p 8088` and probed all canonical URLs:
  ```
  GET /frankenstein-meeting-room/                       → 200 (2734 B index.html)
  GET /frankenstein-meeting-room/federation.manifest.json → 200 (./-prefixed shape)
  GET /frankenstein-meeting-room/remoteEntry.json       → 200 (shell, integrity 19)
  GET /frankenstein-meeting-room/whiteboard/remoteEntry.json → 200 (integrity 8)
  GET /frankenstein-meeting-room/mermaid/remoteEntry.json    → 200 (integrity 2)
  GET /frankenstein-meeting-room/whiteboard/Bootstrap-7COJRA5I.js → 200 (2399 B)
  GET /frankenstein-meeting-room/mermaid/Bootstrap-BBNZEAEH.js    → 200 (53040 B)
  ```
  No 404s, no MIME issues. Server cleaned up, manifest restored
  to dev-mode URLs (status quo for working tree). Static
  plumbing is structurally identical to T17's smoke run — the
  only delta in artifacts is the new `integrity` field, which
  is unconsumed and inert. **AC-02 passed (static).** Visual
  browser pass (console-clean render of both remotes) is the
  residual empirical gate; runtime semantics are byte-identical
  given the no-consumer-wiring partition.

- **Override verification: no duplicate NF, no peer warnings.**
  ```
  find node_modules/.pnpm -maxdepth 1 -name '@softarc+native-federation@*'
  → only @softarc+native-federation@4.1.3_typescript@5.9.3
  ```
  Old 4.0.1 fully evicted. `pnpm install` after override added
  printed no peer-dep or mismatch warnings (only the unrelated
  `temporal-polyfill@0.3.2 vs 0.3.0` warning that pre-existed).
  Plugin's nested `@softarc/native-federation` symlink resolves
  to 4.1.3. Single physical install across the workspace.

- **Diff scope check.** `git diff --stat`:
  ```
  package.json                             |  5 +++++
  packages/mermaid/federation.config.js    |  2 +-
  packages/mermaid/package.json            |  2 +-
  packages/shell/federation.config.mjs     |  4 ++++
  packages/whiteboard/federation.config.js |  2 +-
  packages/whiteboard/package.json         |  2 +-
  pnpm-lock.yaml                           | 28 +++++++++-------------------
  7 files changed, 22 insertions(+), 23 deletions(-)
  ```
  Plan's Key Locations listed the three `federation.config.*`
  files. The four additional touched files
  (`package.json`, two `packages/.../package.json`,
  `pnpm-lock.yaml`) are all driven by the `pnpm.overrides`
  decision documented in Key Decisions §1–§2 — a deliberate
  in-scope expansion under the plan's "Flexibility clause",
  not collateral.

### Acceptance Coverage

(IDs from `docs/plans/f1-sri.md` Task 19 §Acceptance.)

- **T19-AC-01** — `passed`. Each of the three `remoteEntry.json`
  files in `dist/deploy/` carries a non-empty top-level
  `integrity` map of `sha384-…` values. Coverage spans exposed
  modules, shared externals, and dense chunks per artifact type.
  Touches **F1-AC-01**.
- **T19-AC-02** — `passed`. `pnpm run build:deploy` exits 0;
  smoke-served bundle responds 200 on all canonical URLs;
  artifact set identical to pre-T19 baseline plus the metadata-only
  `integrity` field. No new console errors observable from
  static probes; full visual gate (browser console + both
  remotes rendering) is the residual empirical step but cannot
  fail by code-path analysis, since no consumer reads
  `integrity` yet. Touches **F1-AC-01**.

### Open Issues

- **Upstream feedback to softarc — `native-federation-esbuild`
  packaging.** `@softarc/native-federation-esbuild@4.0.0-RC10`
  declares `@softarc/native-federation` as `dependencies`
  (hard-pinned `~4.0.0`) rather than `peerDependencies`. This
  is what forced the `pnpm.overrides` workaround to access the
  SRI feature added in `native-federation@4.1.x`. Standard
  ecosystem convention (esbuild plugins, webpack plugins, vite
  plugins, eslint plugins) is to peer-depend on the host so
  consumers control the version. Bug-report text drafted and
  shared with Auke van Oostenbrugge (he suggested the SRI test
  in the first place). No code follow-up required on our side
  — the override is documented, isolated, and self-contained.
  Sobald softarc ein Release shippt, das den Constraint löst
  (peer-Variante oder `native-federation-esbuild@4.1.x`), kann
  der Override aus `package.json` entfernt werden.
- **`pnpm.overrides` is uncommented in `package.json`.** JSON
  doesn't support comments, so the *why* of the override lives
  only in this task log and the upcoming commit message. Future
  readers landing on `git blame package.json` will see the
  T19 commit and find the reasoning there. Acceptable; no
  workaround warranted (a `"_comment_overrides"` custom key
  would itself be a smell).
- **Mermaid empty-source console warning.** Carried forward
  from T12–T17. Pre-existing; did not surface during T19
  builds. Still latent. Not a T19 concern.
- **Standalone-bundle font duplication.** Carried forward
  from T17 Open Issue #2. Not a T19 concern (orchestrator
  implementation detail). Still flagged for future
  maintenance.

### Context for Next Task

T20 consumes the integrity metadata that T19 emits. The
relevant interface contract:

- **Shape consumed:** each `remoteEntry.json` carries a
  top-level `"integrity": { "<filename>.js": "sha384-..." }`
  map. Keys are the build-output filenames as they appear in
  the same `remoteEntry.json` under `exposes[*].outFileName`
  and `shared[*].outFileName`, plus any dense chunks
  (`chunk-*.js`) the bundler emits. All values are
  `sha384-...` (SHA-384 base64, the algorithm pinned in the
  plan preamble).
- **Trust root:** the shell's `main.ts` will carry the hash
  of `federation.manifest.json` (build-time string
  replacement per plan preamble); the manifest hash certifies
  the manifest, the manifest will need to carry each remote's
  `remoteEntry.json` hash, and each `remoteEntry.json`'s
  `integrity` map certifies that remote's individual chunks.
  T20 builds the middle link (manifest hash → manifest gates
  remotes); T19 already provides the bottom link (remotes
  gate their own chunks).
- **No runtime change in T19.** `initFederation` receives the
  same `federation.manifest.json` URL it always has; the
  manifest itself is unchanged in shape; `remoteEntry.json`
  has one additional inert field that NF v4.1.3's runtime
  reads only when SRI wiring is enabled downstream. T20 is
  free to assume "the foundation just works".
- **Dependency override is workspace-load-bearing.** The
  `pnpm.overrides` block in root `package.json` must stay
  until `@softarc/native-federation-esbuild@4.1.x` (or a peer-
  dependency-fixed RC11+) ships. T20 must not touch this
  override.
- **Hash algorithm contract.** NF emits SHA-384 by default
  when `integrityHashes: true`. T20's `main.ts` hash injection
  (manifest hash) should use the same algorithm so the chain
  is homogeneous: `sha384-…` end-to-end. Plan preamble pins
  this.

### Git State

```
git diff --stat
 package.json                             |  5 +++++
 packages/mermaid/federation.config.js    |  2 +-
 packages/mermaid/package.json            |  2 +-
 packages/shell/federation.config.mjs     |  4 ++++
 packages/whiteboard/federation.config.js |  2 +-
 packages/whiteboard/package.json         |  2 +-
 pnpm-lock.yaml                           | 28 +++++++++-------------------
 7 files changed, 22 insertions(+), 23 deletions(-)

git status --short
 M package.json
 M packages/mermaid/federation.config.js
 M packages/mermaid/package.json
 M packages/shell/federation.config.mjs
 M packages/whiteboard/federation.config.js
 M packages/whiteboard/package.json
 M pnpm-lock.yaml
?? docs/task-log/task-19-remotes-host-integrity-hashes.md
```

Stage on `/commit 19`:
- `M package.json` (root) — `pnpm.overrides` for transitive NF lift.
- `M packages/whiteboard/package.json` — declared NF bumped to `^4.1.3`.
- `M packages/mermaid/package.json` — same.
- `M packages/whiteboard/federation.config.js` — `integrityHashes: true`.
- `M packages/mermaid/federation.config.js` — same.
- `M packages/shell/federation.config.mjs` — same plus inline comment.
- `M pnpm-lock.yaml` — regenerated lockfile.
- new `docs/task-log/task-19-remotes-host-integrity-hashes.md` — this log.
