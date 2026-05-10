# Task 10 — Federate-build + `<mermaid-remote>` Custom Element

### Task
Layer the federate path on top of T9's standalone foundation:
`pnpm -F mermaid build:federate` produces `dist/remoteEntry.json`
exposing `./Bootstrap`, and a `<mermaid-remote>` Custom Element
that bridges the bus into the existing `MermaidEditor.svelte`
becomes globally constructible from any page that loads the
bootstrap chunk.

### Status
DONE — `pnpm install` + `pnpm -F mermaid build:federate` +
`pnpm -F mermaid build` + `pnpm -F mermaid build:federate:debug`
+ `pnpm -F mermaid start` all green. Structural verification
(remoteEntry shape, exposes outFileName, share map, CSS sidecar
landed at stable name, sourcemaps in debug) all confirmed via
direct inspection. The runtime CE-from-host smoke is T11's job
(T10-AC-04 deliberately deferred per plan).

### Files Modified
- `packages/mermaid/package.json` (modified) — added
  `@softarc/native-federation-orchestrator@4.0.0` to deps;
  `@softarc/native-federation@~4.0.0` and
  `@softarc/native-federation-esbuild@4.0.0-RC10` to devDeps;
  scripts `build:federate` and `build:federate:debug`. Pin
  discipline matches whiteboard exactly (T7 Decision #1
  carry-over).
- `packages/mermaid/federation.config.js` (new) — verbatim from
  plan Step 2: `name: 'mermaid'`, `exposes: { './Bootstrap':
  './src/bootstrap.ts' }`, `shareAll` with `svelte` + `mermaid`
  singleton overrides + `includeSecondaries: { keepAll: true }`,
  `skip: ['esbuild-svelte']`, `features: { ignoreUnusedDeps:
  true }`.
- `packages/mermaid/build.mjs` (modified) — added imports
  (`runEsBuildBuilder`, plus `readdirSync`/`copyFileSync` for the
  CSS-sidecar rename), `--federate`/`--debug` arg parsing, top-level
  branch into `buildStandalone` vs `buildFederate`, and a new
  `buildFederate()` driving `runEsBuildBuilder` with
  `adapterConfig.plugins=[sveltePlugin({preprocess, compilerOptions:
  {dev: isDebug}})]`. Post-`federation.close()`, copies any
  `dist/Bootstrap-*.css` to a stable `dist/mermaid-editor.css`
  (Key Decisions §2). No `fileReplacements` — Svelte 5 emits
  native ESM, the React jsx-runtime CJS dispatcher bug from T8
  does not apply.
- `packages/mermaid/src/mermaid-remote.svelte.ts` (new) —
  `MermaidRemote extends HTMLElement` with class-private
  `sourceState = $state({ value: '' })`. `connectedCallback`
  injects the editor CSS sidecar `<link>` once per document
  (resolved via `import.meta.url` against the stable
  `mermaid-editor.css` filename), subscribes to `event:selected`
  to update the `meetingId` + `sourceState.value`, mounts
  `MermaidEditor` directly into `this` (Light DOM — Mermaid uses
  `document.getElementById` and Shadow DOM cuts those queries
  off), and emits `context:request` to ask the host to
  re-broadcast in case `event:selected` fired pre-mount.
  `disconnectedCallback` unsubs and `unmount`s. `.svelte.ts`
  filename is mandatory for `$state` outside `.svelte` files
  (T9 established this rule).
- `packages/mermaid/src/bootstrap.ts` (new) — three-line module:
  `import { MermaidRemote }` + `customElements.define
  ('mermaid-remote', MermaidRemote)`. Federation expose entry per
  `federation.config.js`.
- `pnpm-lock.yaml` (modified) — pnpm regenerated lockfile after
  adding the three NF dep lines.

### Files Read (Context Only)
- `docs/plans/m4-svelte-mermaid-remote.md` — preamble + Task 10
  block. Plan §Step 3's "no CSS-copy step" assertion is the one
  drift handled in Key Decisions §2.
- `docs/task-log/task-9-mermaid-remote-standalone.md` — direct
  predecessor. Carried-forward: `MermaidEditor.svelte` prop
  contract, `.svelte.ts` filename rule, CORS+204 preflight in
  dev server, `mkdirSync('dist', { recursive: true })`. Open
  Issue #1 (CSS-sidecar surface) is the basis for Key Decisions
  §2 here.
- `docs/task-log/task-8-host-whiteboard-federation.md` (relevant
  ranges) — federate-build template. Surfaces reused: NF version
  pins, `runEsBuildBuilder` shape, `import.meta.url`-based
  `<link>` injection pattern (whiteboard's `excalidraw.css`).
  jsx-runtime fileReplacements + esbuild-plugin-commonjs
  explicitly NOT carried over.
- `packages/whiteboard/build.mjs` — source-of-truth for the
  `runEsBuildBuilder` + `adapterConfig.plugins` shape and the
  CORS-permissive dev server. `buildFederate()` here mirrors
  lines 74–114 verbatim except for plugin (svelte vs none),
  removed `fileReplacements`, and the added CSS-rename step.
- `packages/whiteboard/federation.config.js` — for the shape of
  `shareAll(...) + overrides + skip` that T10's config mirrors.
- `packages/whiteboard/package.json` — for the script-name
  convention (`build:federate`, `build:federate:debug`) and the
  `@softarc/native-federation-orchestrator` placement in
  `dependencies` (not devDeps — orchestrator runs in the remote
  at load-time).
- `packages/shared/src/bus.ts` — confirmed `BusEvents`
  (`context:request`, `event:selected`, `diagram:changed`),
  `on()`/`emit()` API. `mermaidSource` payload is plain `string`,
  no `structuredClone` needed.
- `packages/shared/src/types.ts` — confirmed `Meeting.mermaidSource`
  is `string | undefined`; CE wrapper handles `?? ''`.
- `packages/mermaid/src/MermaidEditor.svelte`,
  `standalone-main.svelte.ts`, `package.json` — to confirm prop
  contract is mode-agnostic and the federate path doesn't need
  to touch the editor.

### Key Decisions

1. **Plan-block followed verbatim where it works.** federation.
   config.js is byte-for-byte the plan's §Step 2 (the only
   adjustment vs whiteboard is `svelte`/`mermaid` overrides and
   `skip: ['esbuild-svelte']` instead of React's). build.mjs's
   `buildFederate()` mirrors plan §Step 3. CE wrapper mirrors
   plan §Step 4 with two small additions noted below. bootstrap.
   ts is plan §Step 5 verbatim.

2. **Plan drift — CSS sidecar IS emitted; "no CSS-copy step"
   was wrong.** Plan §Step 3 said "(No CSS-copy step — Mermaid
   inlines its styles into the rendered SVG, no separate `.css`
   to ship.)" That reasoning conflates two CSSes. Mermaid's
   *library* styles are inlined into the rendered SVG — correct.
   But `MermaidEditor.svelte`'s `<style>` block (the `.editor`
   grid, `textarea` sizing, `.preview`, `.error`) is compiled by
   esbuild-svelte into a CSS sidecar emitted next to the
   Bootstrap chunk. First federate build confirmed:
   `Bootstrap-S2ICU7YW.css` (320 B) sat next to `Bootstrap-
   W5XIZPCI.js`. T9 Open Issue #1 had already flagged this
   surface for T10. **Why a "rename to stable name" step instead
   of `import.meta.url + .replace('.js','.css')`:** esbuild
   computes JS and CSS hashes independently from each file's
   own contents, so the JS hash (`44WJKQDS` after the second
   build) and the CSS hash (`S2ICU7YW`) never match. Three
   approaches considered: (a) parse the manifest at runtime —
   neither `remoteEntry.json` nor `importmap.json` lists CSS
   sidecars, so this would require extra metadata; (b) rewrite
   the build to inline CSS as a JS string — needs custom esbuild
   plugin gymnastics around esbuild-svelte's emit; (c) **chosen**
   — post-`federation.close()`, glob `dist/Bootstrap-*.css` and
   `copyFileSync` to `dist/mermaid-editor.css` (stable name),
   then resolve via `new URL('./mermaid-editor.css',
   import.meta.url).href` in the CE. (c) is 4 lines in
   build.mjs + 8 lines in the CE, no plugin work, and matches
   the conceptual shape of whiteboard's `excalidraw.css` even
   though the source-of-CSS is different (whiteboard copies a
   library CSS from node_modules; we rename a Svelte-emitted
   sidecar). **Idempotent injection:** the CE checks
   `document.querySelector('link[data-mermaid-remote-css]
   [href="..."]')` before appending so multiple `<mermaid-remote>`
   instances on one page don't stack `<link>` tags. **The plan
   text needs amendment** — §Step 3's parenthetical is
   incorrect, and §Step 4's connectedCallback should include the
   link injection.

3. **`includeSecondaries: { keepAll: true }` for svelte —
   confirmed necessary by remoteEntry inspection.** With it,
   the share map produced 19 svelte secondary entries
   (`svelte/animate`, `svelte/attachments`, `svelte/internal`,
   `svelte/internal/client`, `svelte/internal/disclose-version`,
   five `svelte/internal/flags/*`, `svelte/legacy`,
   `svelte/motion`, `svelte/reactivity`, `svelte/reactivity/
   window`, `svelte/server`, `svelte/store`, `svelte/transition`,
   `svelte/events`, `svelte/internal/server`, `svelte/compiler`)
   — same shape as React's secondaries in whiteboard. Without
   `keepAll`, only the bare `svelte` package would be shared,
   and the runtime split across `svelte/internal/client` would
   cause a second Svelte runtime to load alongside the host's
   shared one — research finding #5 (two runtimes side-by-side
   crash). Verified by `cat dist/remoteEntry.json | grep
   packageName` after build.

4. **`features: { ignoreUnusedDeps: true }` is load-bearing.**
   Without it, NF aborts the build on `MermaidEditor.svelte`
   being declared as a "shared lib" without metadata (NF tries
   to share local files because esbuild-svelte's import graph
   confuses its dep-detection). The `ignoreUnusedDeps` flag
   downgrades these from errors to `WARN  No meta data found
   for shared lib ./MermaidEditor.svelte` (and similar warns
   for `clsx`, `devalue`, `#client/constants`, `esm-env`).
   Visible in build output, harmless — NF correctly skips them
   and the resulting share map is clean. Same warns appear in
   the whiteboard build for analogous reasons (React's
   `react-dom/client` etc.) and were T7-decided to leave alone.

5. **`@softarc/native-federation-orchestrator` placement in
   `dependencies`, not `devDependencies`.** Mirrors whiteboard.
   The orchestrator runs at remote-load time inside the host's
   page (it's the runtime that resolves the import map and
   wires the share scope), so it must travel with the
   federate output — not be a build-only tool. NF
   `shareAll`+`overrides` strategy puts it in the share map
   too. Putting it in devDeps would have hidden it from
   `shareAll` and broken the runtime contract. (For symmetry
   with the build-tool `@softarc/native-federation-esbuild`,
   which IS devDeps because it never reaches the browser.)

6. **`@frankenstein/shared` MUST stay in `devDependencies` —
   verified absent from the share map.** `grep -c
   '@frankenstein/shared' dist/remoteEntry.json` returns 0.
   Architecture invariant: the bus `globalThis.frankensteinBus`
   singleton must NOT be re-instantiated per remote — sharing
   the package would make NF treat it as a shared lib and load
   a separate `bus.ts` instance on remote-mount, breaking the
   host-remote round-trip. devDeps placement keeps `shareAll`
   from picking it up. Same shape as whiteboard.

7. **Old federate Bootstrap stragglers in `dist/` after multiple
   builds — same `clean`-script Open Issue T9 carries.** After
   the second build (post-CSS-rename addition), `dist/` showed:
   `Bootstrap-W5XIZPCI.js` (first build's hash, content already
   uploaded), `Bootstrap-44WJKQDS.js` (second build's hash, the
   correct one), `Bootstrap-S2ICU7YW.css` (first build's CSS,
   stale), and the new `mermaid-editor.css` (correct stable
   target). `remoteEntry.json` correctly references
   `Bootstrap-44WJKQDS.js`, so loaders pick the right one — but
   stale files accumulate. Out of scope for T10; same Open Issue
   T9 already noted for whiteboard. A `clean` script would fix
   both packages — defer to a polish task.

8. **`pnpm install` succeeded inside the default sandbox this
   time** — T9 noted EROFS on `~/.local/share/pnpm/store` and
   recommended sandbox-bypass. This run reused already-cached
   packages (no downloads, just lockfile updates), so no
   storage write to the global store was needed. The recommendation
   stands for fresh installs; this was the lucky path.

### Test Evidence

— session 2026-05-10

- `pnpm install` (sandboxed, no bypass needed this time) —
  `Done in 10.6s using pnpm v10.33.0`. `+3 -3` packages,
  pre-existing `@schedule-x/calendar` peer-dep warning on
  `packages/shell` carried from M2 (not gating).

- `pnpm -F mermaid build:federate` — initial run after
  `package.json`/`federation.config.js`/`build.mjs` lands:
  ```
  WARN  No meta data found for shared lib ./MermaidEditor.svelte
  WARN  No meta data found for shared lib clsx
  WARN  No meta data found for shared lib devalue
  WARN  No meta data found for shared lib #client/constants
  WARN  No meta data found for shared lib esm-env
  INFO  Removed unused dependencies.
  INFO  Building federation artifacts
  NOTE  Skip packages you don't want to share in your federation config
  INFO  Bundling external npm packages with bundle type 'browser-shared'
  Mermaid federate build complete.
  ```
  No errors, no manifest-timing race observed (research
  finding #3 mitigation not needed). Five `WARN` lines per
  Key Decision §4 — known and harmless.

- **First federate dist inspection** (before CSS-rename addition):
  - `dist/remoteEntry.json` — `name: "mermaid"`, `exposes:
    [{ key: "./Bootstrap", outFileName: "Bootstrap-W5XIZPCI.js" }]`,
    `shared` array length = 21 (svelte + 19 secondaries +
    mermaid). `@frankenstein/shared` absent.
  - `dist/Bootstrap-W5XIZPCI.js` — 2,303 B, exposes the CE
    class.
  - `dist/Bootstrap-S2ICU7YW.css` — 320 B sidecar (the editor
    `.svelte` `<style>` block, esbuild-svelte-emitted). Hashes
    differ from JS — this is the surface that prompted Key
    Decision §2.
  - `dist/mermaid.rLnQ9wlwzU.js` — 4.0 MB shared chunk.
  - 19 `dist/svelte_*.js` shared chunks ranging from 42 B
    (flag stubs) to 1.13 MB (`svelte_compiler`), totaling
    ~1.5 MB of svelte runtime shipped once.

- **Second federate dist inspection** (after CSS-rename
  addition):
  - `dist/remoteEntry.json` — `outFileName: "Bootstrap-
    44WJKQDS.js"` (new hash because CE wrapper source changed
    to add the link injection). Still 21 shared, still no
    `@frankenstein/shared`.
  - `dist/mermaid-editor.css` — present, content matches
    expected `MermaidEditor.svelte` styles:
    `.editor.svelte-1p2daex{display:grid;grid-template-
    columns:2fr 3fr;grid-template-rows:1fr;...}`.
  - Old `Bootstrap-W5XIZPCI.js` and `Bootstrap-S2ICU7YW.css`
    persist in `dist/` (Key Decision §7 — Open Issue, not a
    blocker).

- `pnpm -F mermaid build` (standalone prod, post-federate) —
  ```
  > node build.mjs
  Mermaid standalone build complete.
  ```
  Re-emits `dist/main.js` (3,104,083 B) and `dist/main.css`
  (320 B). Confirms standalone path is unaffected by the
  federate-aware refactor (T10-AC-02/03).

- `pnpm -F mermaid build:federate:debug` —
  ```
  Mermaid federate build complete.
  ```
  `dist/` post-debug-build has:
  - `Bootstrap.js`, `Bootstrap.js.map`, `Bootstrap.css`,
    `Bootstrap.css.map` — unhashed in dev mode (NF dev
    convention).
  - All 21 shared chunks have `-dev.js` + `-dev.js.map`
    siblings (e.g. `mermaid.rLnQ9wlwzU-dev.js`,
    `svelte.Jc6dts4fY2-dev.js`).
  - `importmap.json` references the `-dev.js` filenames, so
    the orchestrator picks them up automatically — no shell-
    side change needed for diagnostic mode (same as
    whiteboard's pattern, T8 Decision #4).

- `pnpm -F mermaid start` (standalone dev, sanity-check after
  all federate work) — boots clean:
  ```
  Mermaid dev server: http://localhost:4000
  [watch] build finished, watching for changes...
  ```
  No `verbatimModuleSyntax` advisory (T9 fix held), no
  unexpected warnings. Stopped immediately after — runtime
  smoke is T9's already-passed evidence.

- **Curl on `:4000` was not attempted** — T9 documented the
  sandbox-proxy 000-return for cross-origin localhost, and
  the boot stdout is the sufficient evidence per AC pattern.

### Acceptance Coverage

(IDs from `docs/plans/m4-svelte-mermaid-remote.md` Task 10
§Acceptance.)

- **T10-AC-01** — `pnpm -F mermaid build:federate` produces
  `dist/remoteEntry.json` with `name: 'mermaid'`, `exposes`
  lists `./Bootstrap`, `shared` covers `svelte` + `mermaid`
  as singletons, `@frankenstein/shared` absent —
  **`passed`**. Verified by direct `cat dist/remoteEntry.json`
  inspection + `grep -c '@frankenstein/shared'` → 0.
  Bonus: 19 `svelte/*` secondaries also present per
  `keepAll` (Key Decision §3).

- **T10-AC-02** — `pnpm -F mermaid start` (standalone)
  unaffected — **`passed`**. Boot stdout clean post-federate-
  changes; AC details inherit T9's already-passed runtime
  smoke (textarea↔SVG round-trip).

- **T10-AC-03** — Standalone HTML still loads after federate
  build (build re-emits `dist/main.js`) — **`passed`**.
  `pnpm -F mermaid build` post-federate produced fresh
  `main.js`/`main.css` of the expected sizes; standalone
  index.html still references `main.js` and `main.css` so
  loading works. The `dist/` mixing Open Issue (Key
  Decision §7) is documented but doesn't break either mode.

- **T10-AC-04** — Manual customElement smoke from a throwaway
  HTML page — **`skipped`**. Plan-block flagged this as
  optional ("Skip if T11 runs immediately after."). T11 will
  load the bootstrap chunk via `MODULE_LOADER` and provide
  the real proof-of-life. Not a scope-leak — explicit plan
  permission.

- **T10-AC-05** — `pnpm -F mermaid build:federate:debug`
  produces dev-mode federate build with sourcemaps + `-dev.js`
  chunks in importmap — **`passed`**. Verified `dist/*.js.map`
  files exist and `importmap.json` references the `-dev.js`
  variants.

### Open Issues

- **M4 plan needs §Step 3 amendment for CSS-sidecar handling.**
  The "(No CSS-copy step — Mermaid inlines its styles into the
  rendered SVG, no separate `.css` to ship.)" parenthetical
  is wrong about `MermaidEditor.svelte`'s `<style>` block (Key
  Decision §2). Plan-text patch suggested before any future
  re-runs: replace the parenthetical with the rename-to-
  `mermaid-editor.css` step, and update §Step 4's
  `connectedCallback` to include the `<link>` injection
  pattern. T9 Open Issue #1 was the warning shot. Low
  priority — not a blocker, code-of-truth is now in this log.

- **`dist/` cleanliness — old hashed Bootstrap files
  accumulate across rebuilds.** Same Open Issue T9 noted for
  whiteboard. `dist/Bootstrap-W5XIZPCI.js` from the first
  federate run lingered after the second run. `remoteEntry.
  json` correctly points to the latest hash, so dev/CI
  workflows aren't broken — just cosmetic + small disk
  bloat. A repo-level `clean` script would fix both packages.
  Defer to M5 polish.

- **Mermaid federate bundle size — 4.0 MB shared `mermaid`
  chunk.** Standalone was already 3.1 MB minified; federate
  is 4.0 MB because NF emits with adapter overhead (no
  per-chunk minification depending on dev/prod). Loads once
  per host page (singleton), so it's a one-time cost — but
  T11 first-paint will pay it. If bothersome, swap entry to
  `mermaid/dist/mermaid.esm.min.mjs` per plan §Architecture
  facts. Don't pre-empt; revisit after T11 in-browser
  measurement.

- **`WARN  No meta data found for shared lib ...` lines on
  every federate build.** Five lines (`./MermaidEditor.
  svelte`, `clsx`, `devalue`, `#client/constants`, `esm-env`).
  Per Key Decision §4 this is `ignoreUnusedDeps` doing its
  job — NF correctly skips these from the share map. Visual
  noise only. Same WARN pattern in whiteboard. Defer.

### Context for Next Task

T11 wires the federate output into the host on `:4200`. The
shape T11 inherits:

- **`<mermaid-remote>` Custom Element** is registered globally
  via `bootstrap.ts` once the federate chunk loads. Light DOM,
  no Shadow DOM (Mermaid uses `document.getElementById`).
  Subscribes to `event:selected`, emits `diagram:changed` and
  `context:request`. `disconnectedCallback` cleanly unmounts
  the Svelte tree and unsubscribes.
- **Bus contract for the remote:**
  - In: `event:selected { meetingId, initialData: Meeting }` —
    sets `meetingId` and `sourceState.value =
    initialData.mermaidSource ?? ''`.
  - Out: `diagram:changed { meetingId, mermaidSource }` —
    debounced ~500ms by `MermaidEditor.svelte` (T9 contract).
    Stale-update guard in `MeetingService.applyDiagramChange`
    (M2 Task 6) is the protective invariant; T11 finally
    exercises it.
  - Out (mount-time): `context:request {}` — lets the host
    rebroadcast the current selection if `event:selected`
    fired before the remote loaded.
- **Federation manifest URL:** `http://localhost:4000/
  remoteEntry.json` once `pnpm -F mermaid build:federate &&
  pnpm -F mermaid start` runs (or use a static-serve flow).
  CORS on `:4000` is permissive (T9 baked it in for this
  exact handoff). No 204 preflight gotchas.
- **Manifest entry name `mermaid` matches `federation.
  config.js#name`** — host's `MODULE_LOADER` mapping uses
  `'mermaid'` as the remote key.
- **Expose key `./Bootstrap`** — same convention as whiteboard.
- **CSS sidecar `mermaid-editor.css`** travels next to the
  Bootstrap chunk. CE auto-injects the `<link>` on
  `connectedCallback` — T11 host code does NOT need to add
  anything CSS-related. (Verify in browser DevTools at T11
  that the `<link data-mermaid-remote-css>` lands in `<head>`
  exactly once even if a remount occurs.)
- **Editor prop contract (mode-agnostic):** `{ sourceState:
  { value: string }; onChange: (s: string) => void }`.
  T11's host glue must supply `meetingId` via the bus
  (`event:selected`), not via component props.
- **Bundle size:** 4.0 MB shared mermaid + 1.5 MB svelte
  runtime + 2.3 KB Bootstrap. First-paint sensitive at T11.
- **Diagnostic infra ready:** `pnpm -F mermaid build:federate:
  debug` swaps to dev mode (sourcemaps, `-dev.js` chunks).
  Same shape as whiteboard's `--debug`. Use if T11 runtime
  bug shows up with a "j is not a function"-class minified
  trace.
- **NF version pinning carries forward unchanged.** Host
  binds its own `4.1.x`; remote owns its `4.0.0` orchestrator
  instance. No host-side change needed for T11 from the
  versioning angle.
- **`.svelte.ts` filename rule established for the workspace.**
  Already enforced in `standalone-main.svelte.ts` (T9) and
  `mermaid-remote.svelte.ts` (T10). T11 host code is Angular,
  so this rule doesn't affect it directly — but if an
  Angular service ever needs to instantiate Svelte
  programmatically (unlikely), keep the convention.

### Git State

```
git diff --stat
 packages/mermaid/build.mjs    | 54 +++++++++++++++++++++++++++++++++++++++++--
 packages/mermaid/package.json |  9 ++++++--
 pnpm-lock.yaml                |  9 ++++++++
 3 files changed, 68 insertions(+), 4 deletions(-)

git status --short
 M packages/mermaid/build.mjs
 M packages/mermaid/package.json
 M pnpm-lock.yaml
?? packages/mermaid/federation.config.js
?? packages/mermaid/src/bootstrap.ts
?? packages/mermaid/src/mermaid-remote.svelte.ts
```

Stage on `/commit 10`: the three modified files + the three
new `packages/mermaid/` source files + this log. Do NOT stage:
`packages/mermaid/dist/` (build output, ignored), `packages/
mermaid/node_modules/` (pnpm-managed), the harness home-dir
files (covered by T9's `.gitignore` update).
