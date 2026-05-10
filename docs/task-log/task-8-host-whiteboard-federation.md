# Task 8 — Host integrates Whiteboard via Native Federation

### Task
Plumb the orchestrator's `NativeFederationResult` into Angular DI via the
canonical `simple/` pattern, add a `WhiteboardSlot` component that lazy-loads
the federated `<whiteboard-remote>` Custom Element, drop it into the host's
upper middle-column cell, and add the `whiteboard` entry to
`federation.manifest.json` so Excalidraw renders inside the host on `:4200`.

### Status
DONE — host-side wiring works end-to-end and the Task-7 Excalidraw runtime
blocker is resolved at the federate-build layer. Root cause identified
(NF's `node-modules-bundler` wraps `react/jsx-runtime.js` as a CJS module
whose body does `module.exports = require('./cjs/.../production.min.js')`;
the wrapper's named-export snapshot fires before the body reassigns
`module.exports`, so the published `jsx` named export is `undefined` →
Excalidraw's first JSX call → `TypeError: j is not a function`). Fix
applied: pass `adapterConfig.fileReplacements` so React's CJS dispatcher
entries resolve directly to the inner `cjs/*.production.min.js` files,
bypassing the broken nested-wrap pattern. AC-04 confirmed in debug-mode
build (NF dev pipeline, browser-verified). Prod build is structurally
fixed (jsx-runtime chunk now exports a real function — verified by reading
the rebuilt chunk) and is ready for browser smoke against AC-04–09 before
`/commit 8`.

### Files Modified
- `packages/shell/src/main.ts` (modified) — captures
  `nf: NativeFederationResult` from `initFederation`, dynamic-imports
  `./bootstrap` and calls `m.bootstrap(nf)`. Drops the M1 scaffold's early
  `.catch` (per plan §Step 1: fail fast on init errors); keeps one trailing
  `.catch` with a "[shell] federation init failed" prefix.
- `packages/shell/src/bootstrap.ts` (modified) — exports
  `bootstrap(nf: NativeFederationResult) => bootstrapApplication(App, appConfig(nf)).catch(...)`.
  No top-level call site any more.
- `packages/shell/src/app/app.config.ts` (modified) — `appConfig` is now a
  factory `(nf) => ApplicationConfig`. Adds `MODULE_LOADER = new InjectionToken<NativeFederationResult>('MODULE_LOADER')`
  and `{ provide: MODULE_LOADER, useValue: nf }`. Keeps `provideBrowserGlobalErrorListeners()`.
- `packages/shell/public/federation.manifest.json` (modified) —
  `{}` → `{ "whiteboard": "http://localhost:3000/remoteEntry.json" }`.
- `packages/shell/src/app/whiteboard-slot.ts` (new) — standalone component
  `app-whiteboard-slot`, `schemas: [CUSTOM_ELEMENTS_SCHEMA]`. `inject(MODULE_LOADER)`
  + `inject(MeetingService)`. Eager `loader.loadRemoteModule('whiteboard', './Bootstrap')`
  in constructor → toggles `remoteReady` signal. `hasMeeting = computed(() => svc.currentMeeting() !== null)`.
- `packages/shell/src/app/whiteboard-slot.html` (new) — `@if/@else if/@else`
  ladder: ready+meeting → `<whiteboard-remote class="remote-mount">`,
  not-ready → "Loading whiteboard…", else "Pick a meeting".
- `packages/shell/src/app/whiteboard-slot.css` (new) — `:host` fills the
  grid row (`display: block; height: 100%; min-height: 0; box-sizing: border-box; border: 1px dashed #cfcfcf;`),
  `.remote-mount` fills the host, `.placeholder` matches the M2 "Pick a
  meeting" styling.
- `packages/shell/src/app/app.html` (modified) — upper middle cell
  `<div class="cell placeholder">Pick a meeting</div>` → `<app-whiteboard-slot></app-whiteboard-slot>`.
  Lower middle cell unchanged (M4 fills it).
- `packages/shell/src/app/app.ts` (modified) — `WhiteboardSlot` added to
  the standalone-component `imports` array.
- `packages/whiteboard/build.mjs` (modified) — three additions:
  (a) permissive CORS headers (`Access-Control-Allow-Origin: *`,
  `Access-Control-Allow-Methods: GET, OPTIONS`, `Access-Control-Allow-Headers: *`)
  + 204 OPTIONS preflight short-circuit on the standalone dev server, so
  `:4200` can cross-origin fetch `remoteEntry.json` + chunked JS +
  `excalidraw.css` from `:3000`; (b) inline `reactReplacements` map
  (mirrors NF's internal `utils/react-replacements.js`, which is exported
  from the package's internal index but not in the public `exports` field)
  pointing `react/index.js`, `react/jsx-runtime.js`, `jsx-dev-runtime.js`,
  `react-dom/index.js` at the resolved CJS files (`*.production.min.js`
  for prod, `*.development.js` for dev); (c) `--debug` flag that flips
  `runEsBuildBuilder({ dev: isDebug })` and routes the dev replacements +
  `process.env.NODE_ENV: "development"`. The fileReplacements are wired
  via `adapterConfig.fileReplacements` (the only configuration knob
  `node-modules-bundler.js:6` reads them from). The `--debug` toggle is
  diagnostic infrastructure that proved load-bearing for the root-cause
  capture — kept in the diff (see Key Decisions §6/§7).
- `packages/whiteboard/package.json` (modified) — added
  `"build:federate:debug": "node build.mjs --federate --debug"` script.

### Files Read (Context Only)
- `docs/plans/m3-react-whiteboard-remote.md` — preamble + Task 8 block.
- `docs/task-log/task-7-whiteboard-remote-standalone.md` — direct
  predecessor; covers the federate-build pipeline, NF version pinning
  (Key Decisions #1), CSS-link-via-`import.meta.url`, the standalone↔
  federate redesign (Key Decisions #4), and the explicit forward note
  about CORS being a Task-8 prereq.
- `docs/task-log/task-2-shell-native-federation-host.md` (relevant
  ranges) — original host federation scaffold; what the `main.ts` /
  `bootstrap.ts` / `app.config.ts` refactors replace.
- `docs/task-log/task-6-meeting-service-and-details.md` (relevant
  ranges) — `MeetingService.currentMeeting` derivation, stale-update
  guard in `applyDrawingChange`, `rebroadcastCurrent` answers
  `context:request` on the bus.
- `packages/shell/src/main.ts`, `bootstrap.ts`, `app/app.config.ts`,
  `app/app.html`, `app/app.ts`, `app/meeting-details.ts`,
  `app/app.css` — confirm pre-edit shapes + grid sizing.
- `packages/shell/public/federation.manifest.json` — confirm `{}` start state.
- `packages/whiteboard/build.mjs` — confirm dev-server / federate-build
  shapes; identify the carried-forward `reactReplacements` + `--debug`
  diagnostic plumbing.
- `packages/shell/angular.json`, `packages/shell/package.json` —
  diagnose the post-build hang (Open Issue §Build hang).
- `node_modules/.../@angular-architects/native-federation-v4/.../builders/build/builder.js`
  (lines 130–340) — confirm `ng build` invokes `buildApplication` (no
  server), generator-yield pattern is the hang root cause; runtime is
  upstream `@angular/build:application` keeping event-loop refs alive.
- `node_modules/.pnpm/@softarc+native-federation-orchestrator@4.1.1/.../init-federation.contract.d.ts`
  — confirm `LoadRemoteModule = (remoteName, exposedModule) => Promise<TModule>`
  shape on `NativeFederationResult.loadRemoteModule`.

### Key Decisions

1. **`MODULE_LOADER` carries the entire `NativeFederationResult`, not just
   `loadRemoteModule`.** Mirrors the canonical `native-federation/angular-examples`
   `simple/` example. Future remotes get `initRemoteEntry` + `as<T>()`
   typed helpers for free if needed (M3 doesn't use them, but the cost of
   the wider injection surface is zero). Slot reads `loader.loadRemoteModule(...)`
   directly off the token.

2. **Eager `loadRemoteModule` in `WhiteboardSlot` constructor; the
   template gate is `remoteReady() && hasMeeting()`.** Lazy-on-first-meeting-select
   would also work but adds a `selectMeeting` subscription whose only
   purpose is to trigger loading — the fetch happens in parallel with the
   user choosing a meeting; by the time they click, the bundle is usually
   already cached. The signal-gate keeps the actual `<whiteboard-remote>`
   placement in the DOM tied to "we have a meeting AND the Custom Element
   class is registered". `customElements.define` happens as a side-effect
   of the Bootstrap chunk evaluating (Task 7 invariant), so once
   `loadRemoteModule` resolves, `<whiteboard-remote>` is globally
   constructible.

3. **CORS folded into Task 8 (not deferred to a T7 follow-up).** Task 7's
   wrap-up explicitly handed forward the choice: re-add CORS to the
   standalone dev server *or* serve `dist/` from a separate static server.
   User confirmed at task start: fold the fix in here. Implementation:
   permissive `Access-Control-Allow-Origin: *` + 204-OPTIONS short-circuit
   in `build.mjs`'s `startDevServer`. `*` is acceptable for local dev
   only — production deployments would route everything through a reverse
   proxy / ingress on a single origin (Pattern 1, no CORS at all).

4. **Diagnostic infrastructure for the blocker carried forward in
   `build.mjs`, not removed before commit.** A `reactReplacements` map
   (prod + dev) and a `--debug` flag predate this session in the working
   tree; they patch React's `index.js` / `jsx-runtime.js` / `jsx-dev-runtime.js`
   / `react-dom/index.js` to point at the resolved CJS files, bypassing
   NF's CJS-share-bundler dispatcher snippet that leaves `jsx` undefined
   in the published share. **Did not resolve the runtime error.** Kept
   in the diff because (a) the diagnostic insight (NF's CJS dispatcher
   wraps modules such that the named-export extraction runs before the
   CJS body populates `exports`) is load-bearing context for the next
   debugging session; (b) `--debug` switches the federate pipeline to
   NF dev mode (sourcemaps + readable output + dev-condition React),
   which is the right tool to capture an un-minified stack the next
   session needs. If the next session finds a different root cause and
   the `fileReplacements` plumbing turns out to be unnecessary, it can
   be reverted before `/commit 8b` (or whatever the new task number is).

5. **`appConfig` factory takes `nf` as a parameter; not a side-effect
   import.** Plan called this out. Tradeoff considered: a module-level
   `let nfRef: NativeFederationResult | null = null` populated by `main.ts`
   would let `appConfig` stay a `const`. Rejected — implicit cross-module
   state is exactly what `MODULE_LOADER` is supposed to formalize, and
   the factory shape matches the example DI pattern that the plan cited.
   Conversion blast radius is one call site (`bootstrap.ts` →
   `appConfig(nf)`).

— session 2026-05-10 (continuation: blocker resolved)

6. **Root cause of the AC-04 blocker — NF's CJS share-bundler chokes on
   `module.exports = require(...)` re-exports.** NF builds React's
   `jsx-runtime.js` as a separate share. That dispatcher's body is just
   `module.exports = require('./cjs/react-jsx-runtime.production.min.js')`.
   `@chialab/esbuild-plugin-commonjs` (used inside NF's
   `node-modules-bundler`) wraps every CJS module in a uniform pattern:
   declare local `var w, P, N`, then `if (Object.keys(p.exports).length === 3)`
   snapshot `p.exports.{Fragment,jsx,jsxs}` into the locals, then `export
   { ... P as jsx, ... }`. For a flat CJS body the wrapper sequences the
   body before the snapshot — works. For a nested `module.exports = require(...)`
   the outer body that reassigns `p.exports` runs *after* the outer
   snapshot — so the snapshot sees `{}`, `P` stays `undefined`, the
   exported `jsx` is `undefined`, and Excalidraw's first JSX call throws.
   The bug is specifically the wrapper's snapshot-vs-body sequencing for
   the dispatcher pattern, not a general CJS↔ESM impedance issue (flat
   CJS shares like the inner `react-jsx-runtime.production.min.js`
   translate cleanly). Standalone never hit it because esbuild inlines
   `react/jsx-runtime` into the consumer in a single pass — no separate
   wrap, no snapshot.
7. **Fix mechanism — `adapterConfig.fileReplacements` redirects React's
   dispatcher entries to the resolved CJS files.** NF already ships a
   `reactReplacements` table at `utils/react-replacements.js` for exactly
   this case but does not auto-apply it; consumers using the low-level
   `runEsBuildBuilder` directly (us — the Angular-CLI wrappers do plumb
   it) must pass it themselves. The package's `exports` field doesn't
   expose `utils/`, so a direct deep import fails with
   `ERR_PACKAGE_PATH_NOT_EXPORTED`. Three options were weighed:
   (A) inline-copy the 12-line table — **chosen**. Stable across React
   18.x, no internal-path dependency, easy to drop when NF ships a
   structural fix upstream. (B) load via `createRequire` + file-URL
   import — fragile against NF's internal layout changes. (C) `pnpm patch`
   to add `./utils` to NF's exports — introduces a patch artefact that
   must be rebased on NF updates, oversized for a 12-line workaround.
   Inline duplication is acceptable because the table targets a
   well-known file layout (`react/cjs/react.production.min.js` etc.)
   that hasn't moved across React majors and is conceptually a Workaround,
   not a config.
8. **NF cache invalidation gotcha — the federation cache key does not
   include `fileReplacements`.** First post-fix rebuild produced an
   identical chunk because NF reused the previously-cached share bundle
   (cached at `node_modules/.cache/native-federation/<projectName>/`);
   `fileReplacements` change → same checksum input → cache hit → no
   actual rebuild. Cleared the cache once via Node fs and re-ran;
   subsequent rebuilds work normally (because the new chunk content
   differs and re-caches under a different hash bucket). Documented in
   Open Issues for any future config drift; a `clean:federation-cache`
   script is a sensible addition if this recurs.
9. **Don't decouple sourcemaps from NF's `dev` flag.** Considered
   patching NF (or injecting an esbuild plugin that mutates
   `build.initialOptions`) to enable sourcemaps in prod-mode federate
   builds — to debug the production stack without flipping React's
   resolveConditions. Rejected: NF's `dev: true` already wires sourcemaps
   + readable output + dev-conditioned React, and (a) the bug surface
   was useful in dev mode (cleaner React errors) and (b) the prod fix
   doesn't actually need a debug build any more — the fix was identified
   by reading the bundled chunk text directly (grep for the `j` import
   binding, then read the wrapper structure). Decoupling sourcemaps via
   pnpm patch would have been the right move only if the bug had
   resisted static analysis.

### Test Evidence

— session 2026-05-10

- `pnpm -F shell build` — green. Output verified at
  `packages/shell/dist/shell/browser/`: `main-EQNHDWND.js` + `chunk-KS2FUGSF.js`
  (bootstrap, 259 KB) + `_angular_*.<hash>.js` vendor chunks +
  `federation.manifest.json` containing the `whiteboard` entry +
  `importmap.json`. Build itself is 1.1 s ("Application bundle generation
  complete."). Process does not terminate cleanly afterwards — see Open
  Issues §Build hang.
- Browser smoke (user-driven): host on `:4200` boots, slot renders
  "Loading whiteboard…" briefly, Network tab shows successful cross-origin
  fetches of `:3000/remoteEntry.json` + `Bootstrap-<hash>.js` +
  `excalidraw.css`. No CORS errors after the `build.mjs` headers landed.
  After clicking "Architecture Review", `<whiteboard-remote>` mounts but
  Excalidraw's first React render throws a minified-var-not-defined
  exception ("j is not a function" / similar). Standalone path
  (`pnpm -F whiteboard start` then browse `:3000`) renders Excalidraw
  cleanly — confirms the bug is federation-pipeline-specific.
- `pnpm -F whiteboard build:federate:debug` (the new dev-mode federate
  build) — **not yet exercised in-browser** by this session; ready as
  the first diagnostic step for the next session.

— session 2026-05-10 (continuation)

- `pnpm -F whiteboard build:federate:debug` exercised end-to-end:
  `importmap.json` references `*-dev.js` chunks, sourcemaps land at
  `dist/*.js.map`. Browser-verified by the user: Excalidraw renders
  cleanly inside the federated `<whiteboard-remote>` on `:4200`, no
  runtime error. Confirms the issue is bundler-emitted shape, not host
  wiring or Excalidraw itself.
- Static analysis of the prod jsx-runtime chunk before/after the fix —
  before fix (cache from prior session, with no `fileReplacements`):
  `dist/react_jsx_runtime.lQ2ymSe76U.js` (78 lines) ended with
  `export { w as Fragment, K as default, P as jsx, N as jsxs }` where
  `P` is set conditionally inside `Object.keys(p.exports).length === 3 && (... P = p.exports.jsx ...)`
  at module top — `p.exports` is `{}` at that point, so `P` stays
  `undefined`. Bundle license footer listed both
  `react-jsx-runtime.development.js` and `*.production.min.js`,
  confirming the dispatcher was wrapped along with both inner files.
  After fix (NF cache cleared via Node `fs.rmSync` on
  `node_modules/.cache/native-federation`, rebuild with `fileReplacements`):
  `react_jsx_runtime.lQ2ymSe76U.js` shrinks to 41 lines (license
  footer lists only `*.production.min.js`); body now runs
  `l.Fragment = x; l.jsx = d; l.jsxs = d;` *before* the size-3 snapshot,
  so `O = l.jsx = d` (the actual jsx fn) at export time. Export line
  `export { w as Fragment, j as default, O as jsx, E as jsxs }` is now
  exporting a real function for `jsx`.
- Prod-build browser verification (Excalidraw render + bus log entries
  on AC-04, drawing persistence on AC-05–08, federation-init failure
  on AC-09) **deferred to a smoke pass** before `/commit 8`. Static
  evidence + debug-mode browser verification together give high
  confidence; full AC sweep is a 10-minute click-through.

### Acceptance Coverage

(IDs from `docs/plans/m3-react-whiteboard-remote.md` Task 8 §Acceptance.)

- **T8-AC-01** — `pnpm -F shell build` completes after refactors —
  `passed`. Build artifacts verified under `packages/shell/dist/shell/browser/`;
  manifest contains the whiteboard entry. `ng build` doesn't terminate
  cleanly (see Open Issues §Build hang) but the build itself succeeds.
- **T8-AC-02** — `:4200` boots, Network shows fetch of `:3000/remoteEntry.json`
  + chunked JS — `passed` (after the CORS fix).
- **T8-AC-03** — Pre-click state: "Loading whiteboard…" then "Pick a
  meeting" — `passed`.
- **T8-AC-04** — Click "Architecture Review" → Excalidraw renders +
  bus log shows `event:selected` + `context:request` — `partial`.
  Excalidraw render verified in browser against the debug build; prod
  build is structurally fixed (jsx export now bound to a real function,
  per static analysis above). Bus log re-emit half not exercised in
  this session — pending the smoke pass.
- **T8-AC-05** — Drawing → debounced `drawing:changed` + LocalStorage
  write — `skipped` (pending smoke pass; infrastructure ready).
- **T8-AC-06** — Reload restores drawing — `skipped` (pending smoke pass).
- **T8-AC-07** — Sprint Retro switch + clean canvas + isolation —
  `skipped` (pending smoke pass).
- **T8-AC-08** — Stale-guard sanity (DevTools-injected `drawing:changed`
  for non-current meeting) — `skipped` (pending smoke pass).
- **T8-AC-09** — Stop `:3000`, reload, federation-init failure visible —
  `skipped` (pending smoke pass).

### Open Issues

- **AC-04–09 prod-build smoke pass before `/commit 8`.** All
  acceptance criteria are exercisable now that the runtime blocker is
  resolved; debug-mode rendering and prod-build static analysis both
  pass. The smoke pass is mechanical (10 minutes click-through against
  `pnpm -F whiteboard build:federate` + `start` + shell start). Run it
  before committing; if anything fails, re-open Status → BLOCKED and
  re-run `/wrap-up 8`.
- **`pnpm -F shell build` doesn't terminate cleanly.** Build is
  successful (~1.1 s, "Application bundle generation complete."), but
  the Node process hangs and must be killed manually (`Ctrl+C`).
  Verified upstream: `@angular-architects/native-federation-v4:build@21.2.1`
  is an async generator that yields `ngBuildStatus`; in non-watch /
  non-devServer mode (`builder.js:235–245`) it calls
  `@angular/build:application` directly. The build emits its result and
  is finished, but `@angular/build:application` (Angular 21.2) keeps
  event-loop refs alive — likely TypeScript-compiler workers, in-memory
  build cache, or telemetry handles. CI pipelines must wrap with
  `timeout` or hard-kill. Not worth a workaround in M3 (`timeout 60 ng build`
  in the package.json script would mask real hangups). Tracking only;
  upstream issue.
- **`packages/whiteboard/build.mjs` `reactReplacements` is duplicated from
  NF internals.** The 12-line map mirrors
  `@softarc/native-federation-esbuild/src/lib/utils/react-replacements.js`,
  which the package re-exports internally but does not list in the
  public `exports` field. If NF upstream changes the React file paths
  (or React's `cjs/` layout shifts in a future version), this map
  drifts silently. Acceptable now (table is conceptually a workaround,
  not config; React 18.x layout has been stable). Revisit when bumping
  to React 19 or if NF ships a structural fix that obsoletes the
  workaround. An upstream PR to expose `./utils` (or to auto-apply
  `reactReplacements` when React appears in the share map) would be
  the right escalation.
- **NF federation cache (`node_modules/.cache/native-federation/`) is
  not invalidated by `fileReplacements` changes.** Hit during the fix
  — the first post-fix rebuild served stale chunks. Workaround was a
  one-time `fs.rmSync` on the cache directory. Optional follow-up:
  add a `clean:federation-cache` script under
  `packages/whiteboard/package.json` that wipes the directory; or
  document the gotcha in the project README. Low priority — the
  cache invalidation only matters when build-config changes.
- **`dist/` mixes standalone + federate artefacts** (carried over from
  Task 7). Not a Task-8-introduced issue; harmless functionally;
  cleanup can wait for a `clean` script when needed.
- **`handoff.md` is now stale** (described the blocker that's now
  resolved). Delete it as part of `/commit 8` staging, or fold the
  resolution status into a comment if the file should persist as a
  decision record.

### Context for Next Task

Task 8's host-integration + federate runtime fix are landed and ready
for `/commit 8` after a smoke pass against AC-04–09. M4 picks up from a
working `<whiteboard-remote>` mounted in the upper middle slot.

Stable surface for M4 and beyond:
- `MODULE_LOADER` `InjectionToken<NativeFederationResult>` exported from
  `packages/shell/src/app/app.config.ts` — additional remotes plumb
  through the same DI seam.
- `WhiteboardSlot` mounts `<whiteboard-remote>` once `loadRemoteModule`
  resolves AND `MeetingService.currentMeeting() !== null`. Eager-load
  pattern (constructor-time `loadRemoteModule`) is the template for
  future federated slots.
- Bus contract unchanged from M2: Custom Element subscribes
  `event:selected`, emits `drawing:changed` (500 ms debounced) +
  `context:request` on mount. Host's `MeetingService.rebroadcastCurrent`
  answers `context:request`. `structuredClone` boundary at the bus.
- CORS on `:3000`'s dev server in place; production deploy story is
  Pattern 1 (single-origin reverse proxy) — re-evaluate when staging.

Federate-build invariants to remember:
- Any new React-using remote MUST pass `adapterConfig.fileReplacements`
  with the React CJS-dispatcher entries pre-resolved. Copy the
  `reactReplacements` map from `packages/whiteboard/build.mjs`. NF does
  not auto-apply.
- After `fileReplacements` or other build-config changes, clear
  `node_modules/.cache/native-federation/<projectName>/` once. The
  cache key doesn't include these inputs.

Smoke-pass checklist before `/commit 8`:
1. `pnpm -F whiteboard build:federate` (prod chunks, no `-dev` suffix
   in `importmap.json`).
2. `pnpm -F whiteboard start` + `pnpm -F shell start`.
3. Open `:4200`, click "Architecture Review" → Excalidraw renders,
   bus log shows `event:selected` + `context:request` + re-emitted
   `event:selected` (AC-04).
4. Draw a shape → `drawing:changed` in bus log (debounced ~500 ms),
   LocalStorage entry under `frankenstein.meetings.{id}` (AC-05).
5. Hard reload → drawing restored (AC-06).
6. Switch to "Sprint Retro" → clean canvas, no overlap with the
   architecture-review drawing (AC-07).
7. DevTools console: emit `drawing:changed` with mismatching
   `meetingId` → no LocalStorage write (AC-08).
8. Stop `:3000`, hard reload `:4200` → `[shell] federation init failed`
   in console, host doesn't crash (AC-09).

If all green: stage code + this log + delete `handoff.md` + run
`/commit 8`. If any AC fails: re-run `/wrap-up 8` with Status → BLOCKED
and the failing AC details.

### Git State

```
git diff --stat
 packages/shell/public/federation.manifest.json |  4 +-
 packages/shell/src/app/app.config.ts           | 17 +++++---
 packages/shell/src/app/app.html                |  2 +-
 packages/shell/src/app/app.ts                  |  3 +-
 packages/shell/src/bootstrap.ts                |  6 ++-
 packages/shell/src/main.ts                     | 10 ++---
 packages/whiteboard/build.mjs                  | 56 ++++++++++++++++++++++++--
 packages/whiteboard/package.json               |  3 +-
 8 files changed, 82 insertions(+), 19 deletions(-)

git status --short
 M packages/shell/public/federation.manifest.json
 M packages/shell/src/app/app.config.ts
 M packages/shell/src/app/app.html
 M packages/shell/src/app/app.ts
 M packages/shell/src/bootstrap.ts
 M packages/shell/src/main.ts
 M packages/whiteboard/build.mjs
 M packages/whiteboard/package.json
?? handoff.md
?? packages/shell/src/app/whiteboard-slot.css
?? packages/shell/src/app/whiteboard-slot.html
?? packages/shell/src/app/whiteboard-slot.ts
```

Stage on `/commit 8`: the eight modified files + the three new
`whiteboard-slot.*` files + this log. `handoff.md` should be deleted
(stale after blocker resolution); decide at commit time whether to
delete it via `git rm` in the same commit or as a separate cleanup.
Do NOT stage: `docs/m1-article-draft.md` and the harness home-dir
files (`.bash_profile`, `.bashrc`, `.zshrc`, `.zprofile`, `.profile`,
`.gitconfig`, `.gitmodules`, `.mcp.json`, `.ripgreprc`, `.vscode/`,
`.claude/`).
