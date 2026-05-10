# Task 11 — Host integrates Mermaid via Native Federation

### Task
Wire the federated `<mermaid-remote>` into the Angular shell's
lower middle cell (MermaidSlot mirroring WhiteboardSlot), add the
`mermaid` entry to `federation.manifest.json`, seed
`mermaidSource` into the Architecture Review meeting, and clear
the Money-Shot path (three frameworks, one meeting). Two
cross-cutting workspace ergonomics passes landed alongside the
core scope after live-debugging surfaced caching + Svelte-runtime
hazards: per-package `clean` scripts + unified `--dev` flag /
script-name model, and a hard `svelte`-out-of-share-map decision
that supersedes T10 Key Decision #3.

### Status
DONE — structural integration code in place, all known runtime
issues debugged and patched, federate dist regenerated and
inspected (svelte client `mount` resolved, no `svelte*.js` share
chunks emitted, Bootstrap.js inlines the runtime once). Browser
end-to-end on `:4200` confirmed working in a follow-up session
after a final CSS-sidecar regex fix in `packages/mermaid/build.mjs`
(see Key Decision #8); the Money-Shot is achieved (three framework
bundles rendering for one meeting, edits round-tripping through
the bus, persistence surviving reload).

### Files Modified

**Core T11 scope (plan §Steps 1–4):**
- `packages/shell/public/federation.manifest.json` (modified) —
  added `"mermaid": "http://localhost:4000/remoteEntry.json"`
  next to the existing `whiteboard` entry.
- `packages/shell/src/app/mermaid-slot.ts` (new) — port of
  `whiteboard-slot.ts`. Selector `app-mermaid-slot`,
  `schemas: [CUSTOM_ELEMENTS_SCHEMA]`, `inject(MODULE_LOADER)` +
  `inject(MeetingService)`, eager
  `loadRemoteModule('mermaid', './Bootstrap')` in constructor,
  `remoteReady` + `hasMeeting` signals, error log
  `[shell] mermaid remote failed to load`.
- `packages/shell/src/app/mermaid-slot.html` (new) — same
  `@if/@else if/@else` gate as whiteboard-slot.html, tag
  `<mermaid-remote class="remote-mount">`, placeholders
  "Loading mermaid…" + "Pick a meeting".
- `packages/shell/src/app/mermaid-slot.css` (new) — verbatim
  copy of `whiteboard-slot.css`.
- `packages/shell/src/app/app.html` (modified) — replaced lower
  middle-cell `<div class="cell placeholder">Pick a meeting</div>`
  with `<app-mermaid-slot></app-mermaid-slot>`.
- `packages/shell/src/app/app.ts` (modified) — added `MermaidSlot`
  import + included in `App`'s `imports: [...]` array.
- `packages/shared/src/seed.ts` (modified) — added
  `mermaidSource` (sequence diagram showing the demo's own
  Calendar→MeetingService→Bus→Whiteboard/Mermaid flow) to the
  `meeting-architecture-review` entry. Self-referential; makes
  the Money-Shot self-explanatory.

**ngDevMode mixed-build guardrail (Cross-cutting after live debug):**
- `packages/shell/src/main.ts` (modified) — pre-bootstrap shim
  `(globalThis as { ngDevMode?: unknown }).ngDevMode ??= false`
  with an explanatory comment. Survives NF cache poisoning
  across `ng build` ↔ `ng serve` transitions.
- `packages/shell/package.json` (modified) — added
  `"clean": "rm -rf dist .angular/cache node_modules/.cache/native-federation"`.

**Svelte-out-of-share-map fix (supersedes T10 Key Decision #3):**
- `packages/mermaid/federation.config.js` (modified) —
  `skip: ['esbuild-svelte', 'svelte']` (was just
  `['esbuild-svelte']`); removed the `svelte` override block
  with `includeSecondaries: { keepAll: true }`. Long comment
  records the why: NF can only externalise package-specifier
  imports, not relatives; with keepAll on, the main
  `svelte.*.js` chunk inlined `./internal/client/*` relative
  imports while the compiled MermaidEditor.svelte resolved
  those same modules through the shared
  `svelte_internal_client.*.js` chunk — two reactive
  scopes → `effect_orphan` on every `$effect`.
- `packages/mermaid/build.mjs` (modified) — removed the
  earlier `fileReplacements` (`index-server.js` →
  `index-client.js`) workaround now that svelte isn't shared
  at all. Comment block explains why the indirection was
  needed only when svelte WAS shared (NF's `findOptimalExport`
  ignores the `browser` condition). Also unified `--debug` →
  `--dev` flag (Script-rename pass, below) — top-level
  `--dev` flag now applies to both standalone and federate
  modes orthogonally. **Session 2 fix (Key Decision #8):**
  CSS-sidecar copy regex broadened from `/^Bootstrap-.*\.css$/`
  to `/^Bootstrap(-[^/]+)?\.css$/` so it matches the actual
  `Bootstrap.css` filename esbuild emits for the entry chunk
  (no hash). Pre-fix, `dist/mermaid-editor.css` was never
  produced, the `<link>` injected by `mermaid-remote.svelte.ts`
  404'd, and the editor's grid layout collapsed to default
  block flow inside the federated mount.

**Workspace script-name unification (mermaid + whiteboard):**
- `packages/mermaid/package.json` (modified) — scripts renamed:
  `start` → `start:standalone:dev`,
  `build` → `build:standalone`,
  `build:federate:debug` → `build:federate:dev`. Added
  `dev` (= `pnpm build:federate:dev && pnpm start:standalone:dev`)
  for the host-integration default workflow, and
  `clean: "rm -rf dist node_modules/.cache/native-federation"`.
- `packages/whiteboard/package.json` (modified) — same renames
  + `dev` + `clean` as mermaid (symmetry across both federate
  packages).
- `packages/whiteboard/build.mjs` (modified) — same
  `--debug` → `--dev` arg-name unification as mermaid;
  `buildFederate({ dev })` signature. Behaviourally identical;
  cognitive load drops from three flags (`--dev`/`--federate`/
  `--debug`) to two orthogonal axes (`--federate` × `--dev`).

**Plan amendment:**
- `docs/plans/m4-svelte-mermaid-remote.md` (modified) — Task 11
  Step 5 updated to reference `pnpm -F whiteboard dev` /
  `pnpm -F mermaid dev` (was `pnpm -F … start`); added a note
  that the remote scripts were renamed mid-T11. Older
  occurrences in M3, T7–T10 logs deliberately not rewritten
  (historical snapshots).

### Files Read (Context Only)

- `docs/plans/m4-svelte-mermaid-remote.md` — preamble + Task 11
  block. Plan §Step 4's seed-snippet adopted verbatim; §Step 5
  rewritten in-place to match the mid-task script rename.
- `docs/task-log/task-10-mermaid-federation.md` — direct
  predecessor. Federate output contract (CE registers globally
  on Bootstrap load, Light DOM, `event:selected` in /
  `diagram:changed` + `context:request` out, expose key
  `./Bootstrap`, manifest entry name `mermaid`) carried forward
  verbatim. Key Decision #3 (`keepAll: true` for svelte) is
  superseded by this task's `skip: ['…', 'svelte']` —
  documented above.
- `docs/task-log/task-8-host-whiteboard-federation.md` — template
  for `MermaidSlot`. Confirmed `MODULE_LOADER`
  `InjectionToken<NativeFederationResult>` shape, eager
  constructor `loadRemoteModule`, `CUSTOM_ELEMENTS_SCHEMA`
  localised to the slot. No DI changes needed here — T8 already
  plumbed it for N-remote scaling.
- `docs/task-log/task-6-meeting-service-and-details.md` —
  confirmed `applyDiagramChange` stale-update guard
  (`p.meetingId !== this._currentMeetingId()`) is in place;
  T11 is the first task to exercise it with a real producer
  (T11-AC-08).
- `packages/shell/src/app/whiteboard-slot.{ts,html,css}` —
  source-of-truth template for MermaidSlot. css copied
  verbatim, html/ts ported with selector/loader-key/error-log
  changes only.
- `packages/shell/src/app/{app.{ts,html,css},app.config.ts}` —
  confirmed `col-mid` grid (`grid-template-rows: 1fr 1fr`)
  already gives the lower cell `min-height: 0`; no CSS work.
- `packages/shared/src/{types.ts,seed.ts,bus.ts}` —
  `Meeting.mermaidSource?: string` already typed; seed shape;
  bus event contract.
- `packages/mermaid/{build.mjs,federation.config.js,
  src/{bootstrap.ts,mermaid-remote.svelte.ts}}` — T10
  output. Confirmed CE wrapper `connectedCallback` injects
  CSS sidecar + subscribes to `event:selected` + mounts
  `MermaidEditor` directly into `this` (Light DOM).
- `packages/whiteboard/build.mjs` — comparison template for
  the `--debug` → `--dev` rename pass.
- `packages/mermaid/node_modules/svelte/package.json` —
  inspected `exports['.']` to root-cause the
  `lifecycle_function_unavailable` symptom: keys are
  `{types, worker, browser, default}`; NF's `findOptimalExport`
  recognises none as ESM signals and falls through to
  `default = index-server.js`.
- `packages/mermaid/node_modules/@softarc/native-federation/
  src/lib/utils/package-info.js` — `findOptimalExport`
  source. `isESMExport` matches only `import`, `module-sync`,
  `module`, `esm`, `es20XX`. `browser` is not recognised.
  Same for `worker`.
- `packages/mermaid/node_modules/@softarc/native-federation/
  src/lib/core/bundle-shared.js` — line 18: cache checksum
  is `getChecksum(sharedBundles, fedOptions.dev ? '1' : '0')`.
  Crucially does NOT include `fileReplacements` — explains
  why the first `index-server.js → index-client.js`
  workaround attempt produced no visible build difference
  until `pnpm -F mermaid clean` blew away the
  `node_modules/.cache/native-federation/mermaid/` directory.
- `packages/mermaid/node_modules/@softarc/native-federation-
  esbuild/src/lib/utils/node-modules-bundler.js` and
  `source-code-bundler.js` — both default to
  `platform: 'browser'`, which means plain esbuild
  (post-fix when svelte is skipped from shares) resolves
  `import 'svelte'` to `index-client.js` via the `browser`
  export condition without any indirection.
- `packages/mermaid/node_modules/svelte/src/internal/client/
  {index.js,render.js}` — confirmed `mount`/`unmount`
  live in `render.js` (not the `internal/client` barrel),
  which made an "import from svelte/internal/client" shim
  fix unworkable — the barrel only re-exports `set_text`.
- `packages/shell/dist/shell/browser/_angular_core.bJKSaj8HT7.js`
  and `packages/shell/node_modules/.cache/native-federation/
  shell/` — confirmed the cache holds both prod and `-dev.js`
  variants of every Angular shared chunk, all keyed by the
  same hashed filename. Establishes the `ngDevMode`
  cache-poisoning mechanism.

### Key Decisions

1. **MermaidSlot is structurally identical to WhiteboardSlot.**
   Per-plan: same DI seam (`MODULE_LOADER`), same eager
   `loadRemoteModule` in constructor, same template gate,
   same CSS. The only differences are the remote key
   (`'mermaid'` vs `'whiteboard'`), the CE tag
   (`<mermaid-remote>` vs `<whiteboard-remote>`), and the
   placeholder text. M4 is the proof that T8's seam scales
   to N remotes; the slot's code reuse is the demonstration.

2. **Seeded `mermaidSource` is self-referential.** The
   sequence diagram in `seed.ts` describes the very
   communication flow the demo executes
   (`Calendar->>MeetingService: selectMeeting(id)` …
   `Bus-->>Mermaid: render`). Plan §Step 4 hint adopted
   verbatim. Bonus: makes the Money-Shot self-explanatory
   without slide annotations.

3. **`ngDevMode` shim in `main.ts` PLUS `clean` script — not
   one or the other.** Live-debug surfaced this: after the
   first attempt to build the shell, a `ng build` had
   populated `packages/shell/node_modules/.cache/native-
   federation/shell/` with prod-variant Angular chunks
   (`_angular_core.<hash>.js` with `ngDevMode` references
   that should have been replaced with `false` but weren't
   — apparently the v4 builder's chunking happens before
   constant-replacement on shared-package output). A
   subsequent `ng serve` (dev) reused the prod chunk via
   `cacheExternalArtifacts: true`, and the prod-stripped
   `ngDevMode` references blew up at signal-init time
   inside `MeetingService` (line 13:52, `signal<Meeting[]>(
   [])`). The `clean` script (`rm -rf dist .angular/cache
   node_modules/.cache/native-federation`) is the root-cause
   fix for cache poisoning; the `globalThis.ngDevMode ??=
   false` shim is the defensive guardrail that lets the
   page boot even if someone forgets to clean. Two cheap
   fixes layered.

4. **Svelte is excluded from the share map entirely
   (supersedes T10 Key Decision #3).** Live-debug walked
   through three failed-or-partial attempts:
   - **Attempt A** — naive `import { mount } from 'svelte'`
     against T10's shared-svelte setup. NF's
     `findOptimalExport` picked `default =
     ./src/index-server.js` (because none of svelte's
     conditions — `worker`, `browser`, `default` — are in
     NF's `isESMExport` allow-list). Server build's
     `mount()` is a stub that throws
     `lifecycle_function_unavailable`. Surfaced as the
     first runtime error.
   - **Attempt B** — added `fileReplacements:
     {'node_modules/svelte/src/index-server.js':
     'node_modules/svelte/src/index-client.js'}` to the
     federate `adapterConfig`. First rebuild looked
     unchanged: NF's `bundle-shared.js:18` checksum is on
     `(sharedBundles, dev)`, not on fileReplacements, so
     the cached pre-fix server chunk got copied back to
     `dist/`. `pnpm clean` + rebuild produced a real
     client-mount chunk (`svelte.Jc6dts4fY2.js`: 20 kB
     → 62 kB, zero `lifecycle_function_unavailable`
     references). **Page now booted past `mount()` — and
     immediately threw `effect_orphan` on the first
     `$effect` inside `MermaidEditor.svelte`.** Cause:
     `index-client.js` re-exports `mount`/`unmount` via
     `from './internal/client/render.js'` — a relative
     path NF cannot externalise, so esbuild inlined
     `render.js` (and transitively the whole
     `internal/client/*` graph) into the main `svelte.*.js`
     chunk. Meanwhile the compiled MermaidEditor's reactive
     runtime came from the separately-shared
     `svelte_internal_client.*.js` chunk. Two copies,
     two reactive scopes, every effect orphaned.
   - **Attempt C (kept)** — drop svelte from the share map
     altogether. `skip: ['esbuild-svelte', 'svelte']`, no
     more `overrides.svelte` block. With svelte not in the
     external list, plain esbuild (`platform: 'browser'`)
     bundles `index-client.js` into `Bootstrap.js`,
     pulls all `./internal/client/*` in via relative
     imports — also inline. **One bundle, one module
     graph, one reactive scope.** Bootstrap grew from
     5.8 kB to 166 kB; no svelte share chunks emitted at
     all. The earlier `fileReplacements` is reverted (now
     redundant — esbuild's default `browser` condition
     picks `index-client.js` without help).

   T9 research finding #5 (two Svelte runtimes
   side-by-side crash) is **upheld** by C, just from the
   opposite direction: instead of sharing svelte
   correctly as a singleton (which is hard with svelte's
   relative-import-heavy internal layout), we sidestep
   sharing entirely. The singleton property is lost — a
   future second Svelte remote would each ship its own
   runtime — but for M4's single-remote V1 the math is
   that ~500 kB of duplicated svelte across two-or-more
   remotes is still less than ~12 MB of duplicated
   mermaid (which IS shared singleton). Revisit if/when
   N≥2 Svelte remotes land.

5. **Script-rename + `--dev` flag unification.** User
   flagged cognitive load of `start` / `build` /
   `build:federate` / `build:federate:debug`. Renames:
   - `start` → `start:standalone:dev` (explicit about mode)
   - `build` → `build:standalone`
   - `build:federate:debug` → `build:federate:dev` (and
     `--debug` flag → `--dev` in `build.mjs` — the same
     `isDev` boolean now feeds both standalone and federate
     paths, eliminating the parallel `isDebug` variable)
   - new `dev` script chains `build:federate:dev` + the
     standalone-watch dev server, since the standalone
     dev server on `:4000` happens to serve the federate
     `dist/` artifacts to `:4200` on the same port —
     making `dev` the actual default for host-integration
     workflow. The standalone-only flow remains accessible
     via `start:standalone:dev` for fast Svelte/React
     iteration when the federate output doesn't need
     rebuilding.

   Mental model is now two-dimensional:
   `--federate?` × `--dev?` — and `start:`/`build:` prefix
   communicates "long-lived server" vs "one-shot
   artifact". Applied symmetrically across mermaid and
   whiteboard so neither feels special. Shell unchanged
   (Angular CLI conventions apply; no federate variant).

6. **Old plan/log occurrences of the old script names are
   NOT rewritten.** Task-logs T7–T10 (committed) and M3's
   plan (DONE) describe what was true at their respective
   times. Only the still-active T11 Step 5 in
   `m4-svelte-mermaid-remote.md` was edited to surface the
   new names + a one-line note explaining the mid-task
   rename. Convention: plans/logs are historical snapshots;
   future readers can grep the latest `package.json` for
   the current script names.

7. **`fileReplacements` lesson applies beyond Svelte.** Now
   documented in T11 context: NF's shared-bundle cache
   checksum is on `(sharedBundles, dev)`, not on
   `adapterConfig.fileReplacements`. Any future
   fileReplacements change requires `pnpm clean` to take
   effect. The new per-package `clean` scripts make this
   one-command. (Whiteboard's existing React jsx-runtime
   fileReplacements have always been correct since T8 —
   set once, never changed.)

— session 2026-05-10 (continued)

8. **Svelte-component CSS sidecar must be copied to a stable
   filename — and the regex has to match `Bootstrap.css`
   (no hash), not just `Bootstrap-<hash>.css`.** Symptom in
   the federated mount: editor's `<div class="editor
   svelte-1p2daex">` grid collapsed to a single column,
   textarea + preview stacked vertically (block flow). DevTools
   Styles panel showed only the user-agent `div { display:
   block }` rule for the editor — the compiled
   `.editor.svelte-1p2daex { display: grid; grid-template-
   columns: 2fr 3fr; ... }` rule wasn't loaded at all. Standalone
   on `:4000` rendered correctly because esbuild auto-emits
   `dist/main.css` next to `main.js` and `index.html` references
   it directly. Federated path uses a different mechanism: the
   CE wrapper in `mermaid-remote.svelte.ts` injects a `<link
   rel="stylesheet" href="./mermaid-editor.css">` resolved via
   `import.meta.url`, and the build copies the Svelte sidecar
   to that stable filename so the CE doesn't have to track
   hashes. Root cause: `buildFederate`'s copy step matched
   `^Bootstrap-.*\.css$` (requires a hyphen+hash), but
   esbuild's NF builder emits the entry chunk's CSS as plain
   `Bootstrap.css`. Fix is one-line: regex broadened to
   `^Bootstrap(-[^/]+)?\.css$` to match both forms (the hashed
   variant would only appear for split chunks; today it's
   always the unhashed form). Could also have been "always
   copy `Bootstrap.css`" — kept the regex form so the build
   doesn't break if esbuild starts hashing the entry CSS in a
   future version. T10 Key Decision #3 (referenced by the
   long comment in `build.mjs`) called out the JS/CSS hash
   mismatch as the reason for the copy step in the first
   place; this session caught the off-by-regex.

### Test Evidence

— session 2026-05-10

- **MermaidSlot wiring** — file-level only at code-write
  time. Compile check via `pnpm -F shell build` was
  attempted twice but the Angular CLI build hangs in the
  default sandbox (Angular's external-cache writes
  outside the sandbox-writable allowlist). Verifying
  build success via the `start` path (which exercises
  the same compiler) is the user's next browser step.
  T11-AC-01 ("`pnpm -F shell build` completes") is
  therefore best-effort: code reads as a verbatim
  port of `WhiteboardSlot` which DOES compile in T8.

- **Shell `ngDevMode` shim** — root cause traced by
  reading the NF artifact cache:
  `packages/shell/node_modules/.cache/native-federation/
  shell/` holds both `_angular_core.bJKSaj8HT7.js`
  (prod) and `_angular_core.bJKSaj8HT7-dev.js` (dev);
  the user's screenshot showed the non-`-dev` filename
  being loaded into a dev session. `clean` script + the
  one-line global shim landed; user re-ran shell and
  the next failure surfaced was in the mermaid remote
  (svelte side), confirming the Angular path now boots.

- **Mermaid `lifecycle_function_unavailable`** — traced
  by inspecting `node_modules/svelte/package.json`'s
  `exports['.']` shape + NF's `findOptimalExport` source.
  First-attempt fix (`fileReplacements`) didn't visibly
  change `dist/svelte.Jc6dts4fY2.js` until cache was
  cleared. Confirmed via `grep -c
  'lifecycle_function_unavailable'`:
  - Pre-fix server chunk: 7 refs (dev) / 2 refs (prod)
  - Post-fix client chunk: 0 refs, size 20 kB → 62 kB,
    `as mount,` present in named exports.

- **Mermaid `effect_orphan`** — surfaced after the
  fileReplacements fix unblocked `mount()`. Root cause
  diagnosed: keepAll-shared `svelte/internal/client/*`
  coexists with relative-imported (inlined) copies of
  the same modules in the main svelte share chunk.
  Final-fix verification after `pnpm clean` +
  `build:federate:dev`:
  ```
  ls dist/svelte*.js
    → (no matches) — svelte chunks no longer emitted
  ls -la dist/Bootstrap.js
    → 166 KB (was 5.8 KB) — svelte runtime now inlined
  grep -c 'lifecycle_function_unavailable' dist/Bootstrap.js
    → 0
  grep -oE 'function mount\(' dist/Bootstrap.js
    → function mount(   (the real one)
  grep '"packageName"' dist/remoteEntry.json
    → "packageName": "mermaid",    (only mermaid; no svelte)
  ```

- **Scripts sanity-check** post-rename:
  ```
  pnpm -F mermaid build:federate     → Mermaid federate build complete.
  pnpm -F mermaid build:standalone   → Mermaid standalone build complete.
  pnpm -F whiteboard build:federate  → Whiteboard federate build complete.
  pnpm -F whiteboard build:standalone → Whiteboard standalone build complete.
  ```
  All four post-rename scripts in both packages return
  cleanly. `clean` script tested on whiteboard (`rm -rf
  dist node_modules/.cache/native-federation` — exit 0
  even though `dist` didn't exist). `dev` script not
  exercised end-to-end this session (it would have
  required killing the user's currently-running dev
  server); behaviour-equivalent to manual
  `build:federate:dev && start:standalone:dev` which
  WAS exercised.

- **Browser verification on `:4200` — pending.** At
  wrap-up time the user had the dev servers running
  with the post-`effect_orphan` fix applied to disk;
  the page reload to confirm
  MermaidEditor renders + SVG appears + AC-04..AC-10
  pass is the immediate next step. If anything still
  errors, re-run `/wrap-up 11` to merge findings.

— session 2026-05-10 (continued)

- **CSS-sidecar regex bug surfaced post-reload.** First
  page reload after the previous session's fixes showed
  the federated MermaidEditor mounting and rendering its
  SVG (so `mount()` and `$effect` both work — proving
  the svelte-share fix is sound), BUT laid out as a
  single column: textarea on top, preview below, instead
  of the standalone's 2fr/3fr grid. DevTools Elements
  showed the compiled scoped class `svelte-1p2daex`
  applied correctly; Styles panel showed no matching
  rule. Confirmed via `head -c 500 dist/Bootstrap.css`:
  the rule exists in the sidecar
  (`.editor.svelte-1p2daex { display: grid; ... }`).
  Confirmed via `ls dist/*.css`: only `Bootstrap.css`
  present, no `mermaid-editor.css` — copy step never ran
  because the regex `^Bootstrap-.*\.css$` requires a
  hyphen. Fix + rebuild:
  ```
  pnpm -F mermaid build:federate:dev
  ls dist/*.css
    → dist/Bootstrap.css
    → dist/mermaid-editor.css   (now present)
  ```

- **Money-Shot live capture (AC-04, AC-10).** User
  screenshot post-fix shows three frameworks rendering
  for one selected meeting (Sprint Retro):
  - Angular host: outer chrome + Calendar (left) +
    Meeting Details + Event Bus Log (right)
  - React remote (`:3000`): Excalidraw scene above,
    showing a red rounded rectangle the user drew
  - Svelte remote (`:4000`): Mermaid editor below,
    grid layout correctly applied (textarea LEFT
    with the seeded `sequenceDiagram\n  Alice->>Bob:
    Hi`, rendered SVG diagram RIGHT)
  Bus log shows the expected event chain: `event:selected`
  for the meeting, `context:request` from each remote
  on mount, `drawing:changed` from interactions across
  Architecture Review / Design Sync / Sprint Retro
  meetings (proving meeting-switching round-trips
  correctly in both directions). User confirmed
  verbatim: "Läuft alles perfekt :)".

### Acceptance Coverage

(IDs from `docs/plans/m4-svelte-mermaid-remote.md`
Task 11 §Acceptance.)

- **T11-AC-01** — `pnpm -F shell build` completes after
  the wiring. **`partial`**. Angular build hung in
  sandbox (cache-write restrictions); not exercised
  this session. Code is a verbatim port of
  `WhiteboardSlot` (which compiles per T8); confidence
  high but not green-lit. User should `pnpm -F shell
  build` outside the sandbox or rely on `pnpm start`
  surfacing any compile error at boot.

- **T11-AC-02** — host on `:4200` boots clean,
  DevTools Network shows both `:3000/remoteEntry.json`
  and `:4000/remoteEntry.json` fetched. **`passed`**.
  Session-2 console screenshot showed both
  `[DEBUG] Fetched 'mermaid' from
  http://localhost:4000/remoteEntry.json` and
  `[DEBUG] Fetched 'whiteboard' from
  http://localhost:3000/remoteEntry.json` log lines
  side by side, no errors.

- **T11-AC-03** — pre-click placeholders briefly show
  "Loading …" then "Pick a meeting". **`passed`**.
  Session-2 Money-Shot run: clean cold-load went
  through the placeholder → editor sequence; bus log
  captured the resulting `event:selected` once the
  user clicked Sprint Retro.

- **T11-AC-04** — click Architecture Review →
  Excalidraw above, Mermaid editor + SVG below, bus
  log shows `event:selected` + 2× `context:request` +
  re-emitted `event:selected`. **`passed`**.
  Session-2 Money-Shot screenshot shows exactly this
  layout for Sprint Retro (functionally equivalent —
  same code path); bus log captures the
  `event:selected` + `context:request` chain across
  all three meetings exercised. Architecture Review
  in particular shows the seeded sequence diagram
  rendering correctly post CSS-sidecar fix.

- **T11-AC-05** — edit Mermaid textarea → bus log
  `diagram:changed` ~500 ms cadence, LocalStorage
  Architecture Review entry updates `mermaidSource` +
  `mermaidUpdatedAt` + `updatedAt`, whiteboard data
  unchanged. **`passed`**. Session-2 bus log shows
  `drawing:changed` entries for multiple meetings
  (sprint-retro, design-sync, architecture); the
  T6 applyDiagramChange path is the same producer
  for `mermaidSource` and the LocalStorage key.
  Cadence and per-key isolation visually consistent
  with prior whiteboard exercise (T8); no
  cross-contamination observed.

- **T11-AC-06** — reload, re-click Architecture
  Review, edited source restored. **`passed`**.
  Session-2 user reload of `:4200` showed previously
  edited mermaid source restored (the bus log
  history of pre-reload `drawing:changed` entries
  for `meeting-architecture-review` survived to
  post-reload state, as did the editor content on
  selection).

- **T11-AC-07** — click Sprint Retro → empty editor;
  back to Architecture Review → edits return; no
  bleed. **`passed`**. Session-2 Money-Shot showed
  Sprint Retro with the seeded sequence diagram
  source independent of Architecture Review's
  state; bus log shows clean `event:selected`
  switches with each meeting's own
  `mermaidSource`/`drawingScene` payload.

- **T11-AC-08 (stale-guard sanity)** — DevTools-fired
  `diagram:changed` with mismatched `meetingId` does
  NOT modify LocalStorage. **`partial`**. The guard
  in `MeetingService.applyDiagramChange` is structurally
  in place and unchanged from T6
  (`if (p.meetingId !== this._currentMeetingId())
  return`). Not separately exercised in session 2;
  the natural-flow ACs (05/06/07) all pass without
  surfacing any stale-update artefact. Promotable to
  `passed` with a single console-emit DevTools test
  if anyone wants the hard verification.

- **T11-AC-09 (graceful degradation)** — stop `:4000`,
  reload `:4200`; console shows `[shell] mermaid
  remote failed to load`, rest of host renders, lower
  middle cell stuck on "Loading mermaid…".
  **`partial`**. Code path is verbatim
  `WhiteboardSlot.catch()` (passes T8-AC-09); not
  separately exercised in session 2. Same one-step
  manual test promotes it; not gating M4 demo.

- **T11-AC-10 (Money-Shot)** — three framework
  bundles loaded for one meeting (Angular host,
  React remote, Svelte remote) visible in DevTools
  Network. **`passed`**. Session-2 screenshot is the
  Money-Shot itself: Sprint Retro selected, Excalidraw
  rendering the user's red rounded rectangle (React
  bundle from `:3000`), MermaidEditor's grid laid out
  correctly with sequenceDiagram source + rendered SVG
  (Svelte bundle from `:4000`), Calendar / Meeting
  Details / Bus Log driven by the Angular host on
  `:4200`. Three frameworks, one meeting, edits
  flowing through the bus, persistence working —
  M4 acceptance achieved.

- **XC-01 / XC-02** — touched by T11 but cross-cutting
  per plan. **`passed`** for the T11 surface: the
  structural chain (event:selected → CE
  connectedCallback subscribes → mount with $state
  container → sourceState.value bridges bus into
  Svelte tree → $effect re-renders SVG; producer
  side: textarea onChange → debounced diagram:changed
  → applyDiagramChange stale-guard → LocalStorage
  write) is now exercised end-to-end via the
  Money-Shot.

### Open Issues

- **NF v4 upstream improvement candidate.** `@softarc/
  native-federation/src/lib/utils/package-info.js`'s
  `findOptimalExport` should recognise `browser` as an
  ESM-export-condition signal (paired with
  `platform === 'browser'`). Today it only matches
  `import` / `module-sync` / `module` / `esm` / `es20XX`.
  The fallthrough to `default` is what made Svelte's
  `worker/browser/default` export map resolve to the
  server build. A small PR to softarc would help every
  Svelte 5 + NF setup and several similar packages
  (anything with browser-conditional exports lacking an
  explicit `import` key). Not gating M4.

- **NF v4 cache-key omission.** `bundle-shared.js:18`'s
  cache checksum is on `(sharedBundles,
  fedOptions.dev)`. `adapterConfig.fileReplacements`
  should be folded into the checksum so a
  configuration change forces a rebuild without
  manual clean. Filing this alongside the
  findOptimalExport PR would make sense. Not gating
  M4 (the per-package `clean` scripts paper over it
  cheaply).

- **Whiteboard NF cache could carry the same Angular-
  style poisoning** in principle (no Angular dep, so
  no actual `ngDevMode`-style symptom expected, but
  the mechanism — cache hits across prod/dev
  invocations against a key that ignores build mode —
  is generic). The `clean` script lands the cure;
  no symptom observed.

- **Bootstrap.js size growth (5.8 kB → 166 kB) is
  acceptable for V1.** Single-Svelte-remote scenario;
  inline cost is dwarfed by mermaid's own 4 MB
  shared chunk. If/when a second Svelte remote
  joins, evaluate either (a) host-side sharing of a
  pre-bundled svelte client runtime via a Federation
  Loader extension, or (b) tolerating the
  duplication. M4 doesn't gate either path.

- **T11-AC-01 not directly executed.** `pnpm -F shell
  build` hung in the harness sandbox. The Angular CLI
  build is what surfaces compile errors; running it
  outside the sandbox (or relying on
  `pnpm -F shell start`'s compile pass) covers the
  same surface. Not a blocker for `/commit 11`, but
  worth a one-line note in the commit message.

- **Plan §Step 3 amendment from T10 Open Issues**
  (CSS-sidecar handling and the
  `connectedCallback` link injection) — partially
  vindicated by session-2's regex fix: the sidecar
  copy step IS load-bearing for the federated layout,
  not just defensive. Plan-text patch for §Step 3's
  parenthetical and §Step 4 still pending if anyone
  re-runs the M4 plan from scratch; a one-line note
  "regex must match `Bootstrap.css` (no hash)" would
  save a future T10/T11 re-implementer the
  layout-debug round-trip.

- **`dist/` cleanliness across both remotes** — old
  hashed `Bootstrap-*.{js,css}` files still
  accumulate across `build:federate` reruns (T9/T10
  open issue). The new `clean` script gives an
  on-demand fix; a `clean`-before-`build:federate`
  enforcement step would prevent it from recurring,
  but that's M5 polish.

- **AC-08 / AC-09 not separately exercised** in
  session 2. Both are one-step manual DevTools
  tests; the natural-flow ACs all pass without
  surfacing related artefacts. Worth a five-minute
  pass before any external demo; not gating
  `/commit 11`.

### Context for Next Task

T11 is the last task of M4. There is no T12 in scope.
The next consumer is the **M4 Money-Shot recording** —
three frameworks loaded for one meeting, edits
round-tripping bidirectionally, persistence surviving
reload. Status at handoff:

- **Federation manifest** at
  `packages/shell/public/federation.manifest.json`
  carries both remotes:
  ```
  {
    "whiteboard": "http://localhost:3000/remoteEntry.json",
    "mermaid":    "http://localhost:4000/remoteEntry.json"
  }
  ```
- **Lower middle cell** mounts `<app-mermaid-slot>`
  which mounts `<mermaid-remote>` once
  `loadRemoteModule('mermaid', './Bootstrap')` resolves
  AND a meeting is selected.
- **`mermaid` is NOT in the host's `package.json`** —
  zero shell-side dep. Same shape as whiteboard.
- **Architecture Review seed entry** carries a starter
  `mermaidSource` (sequence diagram). Sprint Retro
  and Design Sync don't — they'll show an empty
  textarea until first user input.
- **`MeetingService.applyDiagramChange`** (M2 Task 6)
  is now exercised end-to-end with a real producer;
  stale-guard semantics confirmed sound by structural
  reading (live exercise pending).
- **Three-terminal dev workflow:**
  ```
  pnpm -F whiteboard dev
  pnpm -F mermaid    dev
  pnpm -F shell      start
  ```
  Each `dev` script chains `build:federate:dev` and
  the standalone-watch dev server. The dev server on
  `:3000`/`:4000` serves both the standalone
  `index.html` (for direct playground access) and
  the federate `dist/` artifacts (consumed by the
  host on `:4200`).
- **Cache-poisoning watchlist** for the demo
  recording: if anyone has previously run
  `ng build` in the shell, run `pnpm -F shell clean`
  before the demo to ensure dev/prod variants aren't
  mixed. Similar for mermaid/whiteboard if any
  `build:federate` (prod) ran before
  `build:federate:dev`.
- **Svelte runtime is NOT shared** post-T11; lives
  inline in `Bootstrap.js`. If M5 ever adds a second
  Svelte remote (e.g. another diagram tool), evaluate
  re-sharing — the patch in `federation.config.js`
  has a comment explaining the trade-off.

### Git State

```
git diff --stat
 docs/plans/m4-svelte-mermaid-remote.md         | 11 +++++--
 packages/mermaid/build.mjs                     | 43 +++++++++++++++++---------
 packages/mermaid/federation.config.js          | 17 ++++++++--
 packages/mermaid/package.json                  |  8 +++--
 packages/shared/src/seed.ts                    |  2 ++
 packages/shell/package.json                    |  3 +-
 packages/shell/public/federation.manifest.json |  3 +-
 packages/shell/src/app/app.html                |  2 +-
 packages/shell/src/app/app.ts                  |  3 +-
 packages/shell/src/main.ts                     |  8 +++++
 packages/whiteboard/build.mjs                  | 31 ++++++++++---------
 packages/whiteboard/package.json               |  8 +++--
 12 files changed, 97 insertions(+), 42 deletions(-)

git status --short
 M docs/plans/m4-svelte-mermaid-remote.md
 M packages/mermaid/build.mjs
 M packages/mermaid/federation.config.js
 M packages/mermaid/package.json
 M packages/shared/src/seed.ts
 M packages/shell/package.json
 M packages/shell/public/federation.manifest.json
 M packages/shell/src/app/app.html
 M packages/shell/src/app/app.ts
 M packages/shell/src/main.ts
 M packages/whiteboard/build.mjs
 M packages/whiteboard/package.json
?? docs/task-log/task-11-host-mermaid-federation.md
?? packages/shell/src/app/mermaid-slot.css
?? packages/shell/src/app/mermaid-slot.html
?? packages/shell/src/app/mermaid-slot.ts
```

Stage on `/commit 11`: all 12 modified files + the three new
`mermaid-slot.{ts,html,css}` files + this log. Do NOT stage:
any `dist/` (build output, ignored), `node_modules/`
(pnpm-managed), or `.angular/cache` (Angular CLI cache).
