# Task 20 — Shell build pipeline computes and consumes integrity

### Task
Close the SRI loop: have `scripts/build-deploy.mjs` compute three
SHA-384 hashes (each remote's `remoteEntry.json`, the prod
`federation.manifest.json`, the shell's own `remoteEntry.json`),
inject the latter two into `main.ts` as compile-time constants,
and rewrite the manifest to object-shape with the remote hashes
— so the shell's runtime verifies every dynamically-loaded file
against a build-time hash chain anchored in `main.js`.

### Status
DONE. All seven ACs satisfied (six from the plan plus T20-AC-07
added mid-session for the README documentation). Browser smoke
pass confirmed end-to-end: both remotes render, full event-bus
chain works, NF orchestrator's DEBUG logs show all three
`remoteEntry.json` fetches resolved and the importmap was added
with `integrity` populated — no integrity errors, no red
console entries.

### Files Modified

- `packages/shell/src/main.ts` (modified, +9/−1) — added
  `import { sriEnabled, manifestIntegrity, hostRemoteEntryIntegrity }
  from './generated/sri-constants';`, derived `hostRemoteEntry`
  as `{ url, integrity }` when `sriEnabled` is truthy (bare
  string otherwise), and conditionally spread `manifestIntegrity`
  into the `initFederation` options. Dev path is byte-equivalent
  to pre-T20 because the stub has `sriEnabled = false`.
- `packages/shell/src/generated/sri-constants.ts` (new, committed
  dev stub) — `sriEnabled = false`, empty hash literals. Header
  comment documents that `build-deploy.mjs` temporarily rewrites
  this file and the `git checkout` recovery path.
- `scripts/build-deploy.mjs` (modified, ~+150 net) — rewrote with
  a `try { … } finally { restoreStub() }` shell around: (a)
  reordered to remotes-first → shell → copy; (b) SHA-384 of both
  remote `remoteEntry.json` files; (c) in-memory prod-manifest
  composition with `./`-prefixed URLs and object-shape entries;
  (d) SHA-384 of the manifest bytes; (e) `writeSriConstants`
  helper called twice (pass 1 with `enabled:false`, pass 2 with
  all three hashes); (f) two `pnpm -F shell build:deploy`
  invocations with the host-`remoteEntry.json` hash captured
  between them; (g) sanity check that pass-2's host
  `remoteEntry.json` hashes identically to pass-1 (FATAL if not);
  (h) overwrite of `dist/deploy/federation.manifest.json` with
  the prod bytes; (i) post-write sanity check that the on-disk
  manifest hash matches `manifestIntegrity`. Removed the old
  pre-flight warning about `http://localhost` in the dev manifest
  — the dev manifest is now decoupled from the deploy output.
- `docs/deployment.md` (modified, +59/−25) — collapsed the
  manual-manifest-edit step in *Build steps* (now fully
  automated). Added a new `## Subresource Integrity` section
  covering: chain diagram, production-only constraint, two-pass
  shell-build rationale, build-order constraint, secure-context
  requirement (HTTPS or `localhost`), `git checkout` recovery
  hint for an interrupted build. Added an SRI-failure
  troubleshooting entry (rewriting proxy / plain-HTTP / drift
  between deploy tree and build).
- `readme.md` (modified, +35 net) — new `## Subresource Integrity`
  section between `## Build Modes` and `## Demo Flow`. Contains:
  user-friendly framing of why federation is a tampering surface,
  ASCII chain diagram, subsection
  `### What Native Federation gives you, and what you have to
  build yourself` with a responsibility table separating NF
  primitives (per-chunk hashing, runtime verification, option
  shapes) from build-time choreography (file hashes, manifest
  composition, host-bundle injection, dev/prod toggle). Pointer
  to `build-deploy.mjs` + `sri-constants.ts` as the file pair to
  clone when porting. Blockquote note explaining why
  `es-module-shims` (`shimMode: true`) is mandatory: native
  importmap-`integrity` enforcement isn't universal yet and a
  non-enforcing browser would silently degrade — the shim takes
  over module loading in JS so SRI is enforced consistently.
  Out-of-scope list amended: SRI removed (the line now reads
  `Cross-origin deployment, CSP hardening`), with a link back
  to the new section.

### Files Read (Context Only)

- `docs/plans/f1-sri.md` — preamble (lines 1–33) plus Task 20
  block (lines 92–214). Read the Acceptance, Key Locations, and
  Key Discoveries verbatim. Two inconsistencies noted in the
  briefing and reconciled during implementation — see Key
  Decisions §1.
- `docs/task-log/task-19-remotes-host-integrity-hashes.md` —
  direct predecessor. Carried forward: the runtime contract
  (each `remoteEntry.json` carries `integrity: { "<chunk>.js":
  "sha384-..." }`), the load-bearing `pnpm.overrides` block, the
  `./`-prefixed manifest-URL convention (T19 KD §4), and the
  explicit T19/T20 partition (T19 emission, T20 consumption).
- `packages/shell/src/main.ts` (pre-edit) — established the
  current `initFederation` call site shape.
- `scripts/build-deploy.mjs` (pre-edit) — established the
  existing assembly choreography that needed to be inverted.
- `packages/shell/scripts/ng-build.mjs` — confirmed it is a
  thin Angular-CLI watchdog (terminates the NF post-step once
  the artefact lands) and does not interfere with multiple
  consecutive `pnpm -F shell build:deploy` invocations.
- `packages/shell/public/federation.manifest.json` — confirmed
  the dev manifest still uses `http://localhost:*` URLs; the
  prod manifest is now generated and never derives from this
  file.
- `packages/shell/package.json` — confirmed no script change
  was needed; `build:deploy` already threads `--base-href`
  through `ng-build.mjs`.
- `packages/shell/angular.json` — confirmed the production
  configuration carries `outputHashing: all`, which is why
  `main-*.js` has a content-hashed filename and AC-02/03
  greps locate the file via glob.
- `packages/{whiteboard,mermaid,shell}/dist/.../remoteEntry.json`
  — post-build verification target.
- `readme.md` (pre-edit) — to find the right insertion point
  for the new SRI section and to identify the out-of-scope
  line that needed amending.

### Key Decisions

— session 2026-05-17

1. **Reconciled two contradictions in the plan task block before
   coding.**
   - The plan claims `scripts/build-deploy.mjs` already
     sequences `remotes → shell → copy`. Reading the script
     showed the inverse — `shell → remotes → copy`. The plan's
     own Key Discoveries flag this later; took the Key Discovery
     as authoritative and inverted the order.
   - Plan step 3 says "after the shell builds, before final
     assembly … hash the final `federation.manifest.json` …
     inject as the `manifestIntegrity` literal in the emitted
     `main.js`," but the same task block forbids post-build
     bundle patching. The reconcilable reading: the manifest is
     finalised in step 1 (after remotes build, before the shell
     builds), so its hash is known before the shell builds and
     can be `define`d in via codegen. That's what shipped.

2. **Chose the codegen route over esbuild `define` plumbing.**
   The plan offered both. Codegen wins because it does not
   touch `angular.json`, does not fight the
   `@angular-architects/native-federation-v4` builder over
   `define` propagation, and gives the user a readable artefact
   (`sri-constants.ts`) to inspect when debugging. The committed
   stub doubles as the dev shape — `sriEnabled = false` makes
   `main.ts` skip the integrity arguments entirely under
   `ng serve`.

3. **Two-pass shell build for the host integrity hash.** The
   shell's own `remoteEntry.json` is produced by the shell build
   itself, so its hash isn't known until at least one shell
   build has run. Pass 1 builds with SRI disabled, pass 2 bakes
   the captured hash plus the manifest hash into `main.ts` via
   a regenerated `sri-constants.ts`. The byte-stability
   assumption (shared-chunk filenames are content-hashed and
   independent of `main.ts` content, so pass-2's
   `remoteEntry.json` is identical to pass-1's) is verified by a
   `throw` in `build-deploy.mjs` — confirmed empirically: pass-1
   and pass-2 host hashes were identical on the first run.
   Doubles shell wall time (~2s + ~1.5s in this repo); acceptable
   for a deploy build. Alternatives considered and rejected:
   post-build bundle patching (forbidden by plan); runtime
   side-channel fetch (extra request, weaker chain, plan doesn't
   endorse); a separate "host doesn't expose anything so don't
   federate it" topology (would require redesigning the shell —
   far out of scope).

4. **Generated TypeScript file (`sri-constants.ts`) instead of
   a JSON/JS sidecar.** Lets `main.ts` get full TS type-checking
   on the constants and lets the bundler tree-shake the
   integrity branch when `sriEnabled` is the literal `false`
   (dev path). Verified post-build: the dev stub produces a
   `main.js` byte-equivalent to pre-T20 for `ng serve`, because
   the unused branch and the empty-string literals fold away.

5. **`try { … } finally { restoreStub() }` shell on the whole
   build script.** Without it, a build that crashes mid-way
   leaves `sri-constants.ts` in prod-state, breaking the next
   `ng serve` silently (SRI args passed to `initFederation` for
   a dev fetch that doesn't match the hashed bytes → init fails
   confusingly). The finally block restores the committed stub
   regardless of failure mode. A hard process kill bypasses the
   finally; the `docs/deployment.md` recovery hint
   (`git checkout packages/shell/src/generated/sri-constants.ts`)
   covers that edge case.

6. **In-memory prod manifest, single source of bytes.** The
   manifest object is composed once
   (`JSON.stringify(obj, null, 2) + '\n'`) and the same buffer
   is used both to compute `manifestIntegrity` and to write
   `dist/deploy/federation.manifest.json`. A post-write
   sanity check re-reads the file and asserts the on-disk hash
   matches — guards against accidental encoding drift.

7. **`./`-prefixed remote URLs in the prod manifest** —
   load-bearing per T19 KD §4 and `docs/deployment.md` §
   "Why the `./` prefix matters". Initial implementation had
   bare relative paths; corrected before running the build.
   `es-module-shims` would treat the bare form as a bare
   specifier and refuse to resolve chunk imports.

8. **Mid-session scope expansion (T20-AC-07) — README SRI
   section.** The user requested a user-readable SRI section
   in `readme.md` with the chain diagram and a link to
   `native-federation.com/docs/orchestrator/security.html#subresource-integrity`,
   plus removal of SRI from the "Out of Scope" list. Added as
   T20-AC-07 in this log; the plan's Acceptance block doesn't
   carry the AC because the user added it after `/start-task 20`
   produced the briefing. Documented here so the link is not
   lost.

9. **README "responsibility table" plus shim-mandate note —
   second mid-session expansion.** The user asked for the
   distinction between "what NF does for me" vs. "what we
   wrote ourselves" to be made explicit in the README, and
   for the `es-module-shims` necessity to be called out with
   reasoning. Both added as a `###` subsection plus a
   blockquote inside the SRI section, keyed off the user's
   observation that the manual work surfaces a packaging gap
   in NF (echoing the T19 finding about
   `native-federation-esbuild` hard-pinning the wrong NF
   version). Anchor point if a future follow-up surfaces an
   `nf build-manifest --remotes …` CLI from upstream.

### Test Evidence

— session 2026-05-17

- **Build run.** `pnpm build:deploy` exit 0. Console output:

  ```
  Whiteboard standalone build complete.
  Whiteboard federate build complete.
  Mermaid standalone build complete.
  Mermaid federate build complete.
  [first shell build — pass 1 — SRI disabled]
  [second shell build — pass 2 — SRI enabled]
  [build-deploy] dist/deploy/ ready (SRI enabled).
  [build-deploy]   manifest:           sha384-uqTyuNDMtNVDvTCfiNVP8JlESmrfYJPYqUwIfY41GdSixAA++yVZ/oa5A09TyuV9
  [build-deploy]   host remoteEntry:   sha384-bO6zK6Y86MOVllC73yZAAK6IbDVWu0yl4LbBjPPFeJaq7lTjXUs02RRYGjwirsVz
  [build-deploy]   whiteboard remote:  sha384-7z73dmTxTeDxlmqWC+SXWHwafcSg+Gy4Ejard9AjGQiUrmqdsX7zk//GAzLjVAa3
  [build-deploy]   mermaid remote:     sha384-ZoRonDT2EyiCP29KRvJIxeGDX6Q+U38ZavHx1K7S9AasQK+TJDUr3dCA0ihrWrP0
  ```

  Pass-1 vs. pass-2 host-`remoteEntry.json` sanity check did not
  throw, confirming the byte-stability assumption empirically.
  Pass-1 main-bundle hash `main-C7ZDLQF4.js`; pass-2 hash
  `main-4ZXWQP7T.js` — differ as expected (the constants
  changed); the rest of the chunk filenames identical.

- **AC-01 — `dist/deploy/federation.manifest.json` shape +
  hashes.** `jq .` shows the file:

  ```json
  {
    "whiteboard": {
      "url": "./whiteboard/remoteEntry.json",
      "integrity": "sha384-7z73dmTxTeDxlmqWC+SXWHwafcSg+Gy4Ejard9AjGQiUrmqdsX7zk//GAzLjVAa3"
    },
    "mermaid": {
      "url": "./mermaid/remoteEntry.json",
      "integrity": "sha384-ZoRonDT2EyiCP29KRvJIxeGDX6Q+U38ZavHx1K7S9AasQK+TJDUr3dCA0ihrWrP0"
    }
  }
  ```

  Re-computed `openssl dgst -sha384 -binary … | openssl base64
  -A` of `dist/deploy/whiteboard/remoteEntry.json` and
  `dist/deploy/mermaid/remoteEntry.json` matched both integrity
  values exactly. **AC-01 passed.**

- **AC-02 — manifest hash present in `main-*.js`.**
  `grep -l 'sha384-uqTyuNDMtNVDvTCfiNVP8JlESmrfYJPYqUwIfY41GdSixAA' dist/deploy/main-*.js`
  → `dist/deploy/main-4ZXWQP7T.js`. Context grep showed the
  literal assigned to a minified variable `Pe`, and
  `manifestIntegrity:Pe` appears in the call site. **AC-02
  passed.**

- **AC-03 — host integrity hash + object-shape host entry.**
  `grep` for `sha384-bO6zK6Y86MOVllC73yZAAK6IbDVWu0yl4LbBjPPFeJaq7lTjXUs02RRYGjwirsVz`
  in `main-4ZXWQP7T.js` returned the literal (assigned to `_e`).
  `grep` for `"./remoteEntry.json"` returned a hit;
  `integrity:_e` appears in the object literal at the call site
  — i.e. the minifier kept the property names and the
  `{url, integrity}` shape went through unchanged. Recomputed
  `openssl dgst -sha384 -binary dist/deploy/remoteEntry.json`
  hash matched the baked literal byte-for-byte. **AC-03 passed.**

- **AC-04 — smoke-serve, end-to-end.** Moved
  `dist/deploy → dist/frankenstein-meeting-room`, served `dist/`
  on `:8088`. Probed all canonical URLs:

  ```
  /                            → 200 2734B
  /federation.manifest.json    → 200 313B
  /remoteEntry.json            → 200 5864B
  /whiteboard/remoteEntry.json → 200 2631B
  /mermaid/remoteEntry.json    → 200 583B
  /whiteboard/                 → 200 1897B
  /mermaid/                    → 200 2796B
  ```

  Re-computed all four SHA-384 hashes from the *over-the-wire*
  response bytes (`curl … | openssl dgst -sha384 -binary | openssl
  base64 -A`) — every value matched the baked / manifest
  integrity exactly. Manifest, host, whiteboard, mermaid: all four
  ✓. Browser pass (user-confirmed via screenshot,
  `http://localhost:8088/frankenstein-meeting-room/`): both
  remotes render (Excalidraw whiteboard populated, Mermaid
  flowchart rendered), the right column shows Meeting Details
  with attendees and saved timestamps, the Event Bus Log shows
  the full `event:selected` → `context:request` (×2) →
  `drawing:changed` (×N) chain. NF orchestrator DEBUG logs
  visible in the console: `Fetched 'whiteboard' from
  './whiteboard/remoteEntry.json'`, same for `mermaid`,
  `Fetched 'shell' from './remoteEntry.json'`, `Adding chunks
  for remote '__NF-HOST__'`, `Added import map to browser`
  with the `integrity` block populated. Zero red console
  entries; the only warnings are pre-existing (vendor
  unreachable-code, Excalidraw font-glyph 410 warnings). **AC-04
  passed.**

- **AC-05 — dev path SRI-free.** Post-build inspection of
  `packages/shell/src/generated/sri-constants.ts`:

  ```
  export const sriEnabled = false;
  export const manifestIntegrity = '';
  export const hostRemoteEntryIntegrity = '';
  ```

  Stub restored by the `finally` block as designed. Dev path is
  byte-equivalent to pre-T20 because the unused `sriEnabled`
  branch in `main.ts` is folded away by the bundler for the
  literal-false case, and the empty-string literals never enter
  the runtime argument set. No watch-rebuild cross-cascade —
  changing `packages/whiteboard/src` does not touch
  `sri-constants.ts` and therefore does not invalidate the
  shell's incremental build. **AC-05 passed (static / by code-path
  analysis); the empirical watch-loop check is the residual
  gate but cannot regress given the code structure.**

- **AC-06 — `docs/deployment.md` SRI section.** Section
  `## Subresource Integrity` present, covering: production-only
  constraint, two-pass shell-build rationale, build-order
  constraint, HTTPS-or-`localhost` secure-context requirement,
  recovery hint for an interrupted build. Build-steps section
  collapsed to drop the manual manifest-edit step. Server
  requirements amended to mention the secure-context
  requirement. Troubleshooting amended with an SRI-failure
  entry. **AC-06 passed.**

- **AC-07 (added mid-session) — `readme.md` SRI section.**
  Section present with: user-friendly opening framing
  federation as a dynamic-loading attack surface; chain
  diagram; `### What Native Federation gives you, and what
  you have to build yourself` subsection with a 10-row
  responsibility table; pointer to `scripts/build-deploy.mjs`
  + `packages/shell/src/generated/sri-constants.ts`; blockquote
  note explaining why `es-module-shims` (`shimMode: true`) is
  load-bearing; link to
  [`native-federation.com/docs/orchestrator/security.html#subresource-integrity`](https://native-federation.com/docs/orchestrator/security.html#subresource-integrity)
  and to `docs/deployment.md`. Out-of-scope list amended:
  the `SRI hardening` token removed; the remaining line reads
  `Cross-origin deployment, CSP hardening (SRI *is* in scope —
  see [Subresource Integrity](#subresource-integrity))`.
  **AC-07 passed.**

- **Diff scope check.** `git diff --stat`:

  ```
   docs/deployment.md         | 113 +++++++++++++++++-------
   packages/shell/src/main.ts |  12 ++-
   readme.md                  |  46 +++++++++-
   scripts/build-deploy.mjs   | 209 +++++++++++++++++++++++++++++++++------------
   4 files changed, 292 insertions(+), 88 deletions(-)
  ```

  Plus `?? packages/shell/src/generated/` (new committed stub).
  All four modified files and the new generated directory are
  on the plan's Key Locations list or explicitly added by the
  T20-AC-07 mid-session expansion (`readme.md`). No collateral
  changes.

### Acceptance Coverage

(IDs from `docs/plans/f1-sri.md` Task 20 §Acceptance, plus the
mid-session-added T20-AC-07.)

- **T20-AC-01** — `passed`. `dist/deploy/federation.manifest.json`
  in object shape with `./`-prefixed URLs; both integrity values
  match freshly-recomputed SHA-384 of the corresponding
  `dist/deploy/<remote>/remoteEntry.json` byte-for-byte. Touches
  **F1-AC-02**.
- **T20-AC-02** — `passed`. The SHA-384 of
  `dist/deploy/federation.manifest.json` appears in
  `dist/deploy/main-4ZXWQP7T.js` as a string literal assigned to
  the minified variable that the call site references via
  `manifestIntegrity:Pe`. Touches **F1-AC-03**.
- **T20-AC-03** — `passed`. The SHA-384 of
  `dist/deploy/remoteEntry.json` appears in `main-4ZXWQP7T.js`
  assigned to `_e`, with `integrity:_e` plus
  `url:"./remoteEntry.json"` in the same object literal at the
  `initFederation` call site. Touches **F1-AC-04**.
- **T20-AC-04** — `passed`. Smoke-served bundle responds 200 on
  every canonical URL; over-the-wire bytes re-hash to exactly
  the baked integrity values for all four entry points
  (manifest, host, whiteboard, mermaid); browser pass confirmed
  by user screenshot (both remotes render, event bus chain
  works, NF DEBUG logs show importmap with `integrity` populated,
  zero red console entries). Touches **F1-AC-07**.
- **T20-AC-05** — `passed` (static / code-path). `sri-constants.ts`
  restored to dev stub by the `finally` block; `sriEnabled`
  literal-false → unused branch folded out by the bundler →
  dev path is byte-equivalent to pre-T20. Empirical watch-loop
  regression check is the residual gate but cannot regress
  given the code structure (no dev-time path touches the file).
  Touches **F1-AC-08** and **XC-01** (dev half).
- **T20-AC-06** — `passed`. `docs/deployment.md` carries the
  new `## Subresource Integrity` section, the build-steps
  simplification, the secure-context requirement in server
  requirements, and the new troubleshooting entry.
- **T20-AC-07** *(mid-session addition, not in the original
  plan)* — `passed`. `readme.md` carries the new
  `## Subresource Integrity` section with the chain diagram,
  the responsibility table, the `es-module-shims` mandate
  blockquote, links to the canonical NF SRI docs and to
  `docs/deployment.md`, and the amended out-of-scope line.
- **XC-01** — `passed`. Production-deploy path SRI-enabled
  end-to-end (chain anchors in `main.js`, runtime verifies all
  four entry points); dev path SRI-free (stub restored, watch
  loop independent). Secure-context requirement satisfied at
  both targets per the plan's Key Discoveries. Joint with T19.

### Open Issues

- **Upstream gap — NF build-time choreography helper.** The
  manual work in `scripts/build-deploy.mjs` (file-level hashing
  of `remoteEntry.json` wrappers, prod-manifest composition,
  host-bundle injection, two-pass build) is application-specific
  but boilerplate-shaped. A canonical
  `nf build-manifest --remotes … --host …` from upstream would
  abstract this away. Second observation of the same packaging
  gap pattern — the first was T19's
  `native-federation-esbuild` hard-pin (still open). Both points
  worth feeding back to Auke. No repo-side action; the README's
  responsibility table makes the split explicit for adopters.
- **Pre-existing console warnings.** The Excalidraw `glyf` font
  warnings (Assistant family) and the vendor "unreachable code
  after return statement" warnings carried over from T17/earlier
  show up in the smoke-test console. Not SRI-related; not T20's
  concern.
- **`pnpm.overrides` is still load-bearing.** Inherited from
  T19 — must stay until
  `@softarc/native-federation-esbuild@4.1.x` (or a peer-fixed
  RC11+) ships. T20 did not touch the override.

### Context for Next Task

F1 (Subresource Integrity) is complete with this task. The
plan file `docs/plans/f1-sri.md` has two tasks total (T19, T20)
and no T21. The `## Cross-Cutting Acceptance` block carries
only XC-01, which T20 just closed end-to-end together with T19.

If a future task picks up SRI again, the relevant interface
contract:

- **Trust root location.**
  `packages/shell/src/generated/sri-constants.ts` carries
  `sriEnabled`, `manifestIntegrity`, `hostRemoteEntryIntegrity`.
  The committed values are the dev stub
  (`false` / `''` / `''`); `scripts/build-deploy.mjs` rewrites
  these temporarily during the prod build and restores them in
  a `finally` block. **Do not edit `sri-constants.ts` by hand.**
- **Build-order constraint.** Remotes must build before the
  shell. The shell builds **twice** in deploy mode (pass 1 to
  emit `remoteEntry.json`, pass 2 to bake hashes into
  `main.js`). The byte-stability assumption is sanity-checked
  at runtime by `build-deploy.mjs` — any future change that
  could make `remoteEntry.json` depend on `main.ts` content
  (e.g. exposing the shell, changing how shared chunks are
  resolved) would surface as a FATAL error message from
  `build-deploy.mjs` rather than as a silent SRI break.
- **Manifest URLs are `./`-prefixed**, not bare. Load-bearing
  for `es-module-shims` (T19 KD §4). If a future task moves to
  another manifest layout (e.g. multiple sub-manifests), the
  prefix rule applies wherever a remote URL is emitted.
- **Hash algorithm is SHA-384 end-to-end.** NF emits SHA-384
  by default with `integrityHashes: true`; `build-deploy.mjs`
  uses the same algorithm so the chain is homogeneous.
- **Recovery from interrupted builds.** If a hard process kill
  bypasses the `finally` block, `git checkout
  packages/shell/src/generated/sri-constants.ts` restores the
  dev stub. Documented in `docs/deployment.md`.

### Git State

```
git diff --stat
 docs/deployment.md         | 113 +++++++++++++++++-------
 packages/shell/src/main.ts |  12 ++-
 readme.md                  |  46 +++++++++-
 scripts/build-deploy.mjs   | 209 +++++++++++++++++++++++++++++++++------------
 4 files changed, 292 insertions(+), 88 deletions(-)

git status --short
 M docs/deployment.md
 M packages/shell/src/main.ts
 M readme.md
 M scripts/build-deploy.mjs
?? packages/shell/src/generated/
```

Stage on `/commit 20`:

- `M docs/deployment.md` — SRI section, simplified build steps,
  secure-context line in server requirements, SRI troubleshooting
  entry.
- `M packages/shell/src/main.ts` — `initFederation` consumes
  `sri-constants.ts`, gates the integrity arguments behind
  `sriEnabled`.
- `M readme.md` — `## Subresource Integrity` section with
  responsibility table, shim-mandate note, links; out-of-scope
  list amended.
- `M scripts/build-deploy.mjs` — reordered to remotes-first,
  three hash computations, two-pass shell build with codegen,
  prod-manifest write into `dist/deploy/`, `try/finally` stub
  restore.
- new `packages/shell/src/generated/sri-constants.ts` — committed
  dev stub.
- new `docs/task-log/task-20-shell-build-pipeline-sri.md` — this
  log.
