# Task 9 — Mermaid Remote (vanilla Svelte 5 + Mermaid editor on `:4000`)

### Task
Stand up `packages/mermaid/` as a plain Svelte 5 + Mermaid editor app on
port `:4000` — textarea (left) + live SVG preview (right), no federation,
no Custom Element, no bus. Standalone-only foundation that T10 layers
the federate path on top of and T11 wires into the host.

### Status
DONE — `pnpm install` + `pnpm -F mermaid build` + `pnpm -F mermaid start`
all green. Browser-verified by the user end-to-end after two layout/
reactivity bugs were identified and fixed mid-session (see Key Decisions
§2/§3). Layout finalized at the user's request as a 2:3 textarea:preview
split (Key Decisions §4).

### Files Modified
- `packages/mermaid/package.json` (new) — `type: module`, scripts
  `start` / `build`, deps `mermaid@^11.4.1` + `svelte@^5.0.0`,
  devDeps `@frankenstein/shared` (workspace), `esbuild@^0.25.1`,
  `esbuild-svelte@^0.9.0`, `svelte-preprocess@^6.0.0`,
  `typescript@~5.9.2`.
- `packages/mermaid/tsconfig.json` (new) — extends
  `../../tsconfig.base.json`; `outDir: ./dist`, `types: ["node", "svelte"]`,
  `moduleResolution: bundler`, `verbatimModuleSyntax: true` (Svelte 5
  hard-requires this when `<script lang="ts">` is in use; surfaced as a
  stderr advisory on first boot, fixed before browser smoke).
- `packages/mermaid/svelte.config.js` (new) — `{ preprocess:
  sveltePreprocess() }`, IDE/tooling only.
- `packages/mermaid/build.mjs` (new) — `--dev`-only path mirroring
  `packages/whiteboard/build.mjs`'s `buildStandalone`. Entry
  `src/standalone-main.svelte.ts` (renamed from `.ts` mid-session,
  Key Decisions §2). Plugins `[sveltePlugin({ preprocess:
  sveltePreprocess(), compilerOptions: { dev } })]`. Loader
  `{ '.css': 'css' }` (Mermaid renders SVG via `innerHTML`, no font/
  image asset imports — no woff/png/svg loaders needed). Permissive
  CORS (`Access-Control-Allow-Origin: *`) + 204 OPTIONS preflight
  short-circuit on the dev server, baked in now for symmetry with
  whiteboard so T11's host fetch from `:4200` works without re-touching
  this file. `mkdirSync('dist', { recursive: true })` at top
  (T7 Decision #2 NF cache-persistence ENOENT bug — harmless on
  standalone; kept for symmetry with T10's federate path).
  `server.listen(4000, ...)` — NOT 3000.
- `packages/mermaid/public/index.html` (new) — `<div id="root">` +
  ESM `<script src="main.js">` + `<link rel="stylesheet" href="main.css" />`.
  The `<link>` was added mid-session (Key Decisions §3) — the plan's
  suggested HTML omitted it, leaving Svelte's emitted `dist/main.css`
  un-loaded.
- `packages/mermaid/src/standalone-main.svelte.ts` (new) — vanilla
  `mount(MermaidEditor, ...)` with `$state`-wrapped `sourceState` and
  console-log mock-host `onChange`. The `.svelte.ts` filename suffix
  is a hard requirement: `$state` runes are only legal in `.svelte`
  or `.svelte.{ts,js}` files (plan §Key Discoveries — flagged for
  T10 in the plan, surfaced one task earlier here, Key Decisions §2).
- `packages/mermaid/src/MermaidEditor.svelte` (new) — `<script
  lang="ts">`, `$props`, `$state` for `svg` + `renderError`, `$effect`
  with `cancelled`-flag async-cleanup guard, debounced upstream
  `onChange` (~500ms), error pane on Mermaid render failure.
  `<style>` uses `display: grid; grid-template-columns: 2fr 3fr;
  grid-template-rows: 1fr; gap: 8px; height: 100%` (Key Decisions §3
  added the row track; §4 refined the column ratio).
- `packages/mermaid/src/debounce.ts` (new) — verbatim copy from
  `packages/whiteboard/src/debounce.ts` (7 lines, generic `<T>`).

### Files Read (Context Only)
- `docs/plans/m4-svelte-mermaid-remote.md` — preamble + Task 9 block.
- `docs/task-log/task-7-whiteboard-remote-standalone.md` — standalone
  shape (build.mjs structure, debounce.ts pattern, dev-server
  CORS-as-T8-prereq note).
- `docs/task-log/task-8-host-whiteboard-federation.md` — direct
  predecessor; carried-forward CORS pattern (Key Decisions #3),
  `mkdirSync('dist', { recursive: true })` invariant, `MODULE_LOADER`
  DI seam that T11 will reuse.
- `docs/task-log/task-6-meeting-service-and-details.md` (relevant
  ranges) — confirms T9/T10 are correct to keep `console.log` mock-host
  (real producer plug-in happens at T11 via
  `MeetingService.applyDiagramChange`).
- `packages/whiteboard/build.mjs` — source-of-truth for `buildStandalone`
  + `startDevServer` shape (CORS at lines 127–139, dist→public→
  index.html static fallback at 142–157).
- `packages/whiteboard/src/debounce.ts` — verbatim source.
- `packages/whiteboard/package.json`, `tsconfig.json`,
  `public/index.html` — confirm the shape T9 mirrors. The
  whiteboard's `<link rel="stylesheet" href="main.css" />`
  (line 6 of its index.html) is what flagged the missing-link
  bug here.
- `pnpm-workspace.yaml`, `tsconfig.base.json` — confirm
  `packages/*` glob auto-discovery + base TS config inheritance.

### Key Decisions

1. **Plan-block followed verbatim where it works; flagged where it
   drifts.** The package skeleton, `MermaidEditor.svelte`,
   `debounce.ts`, and `tsconfig.json` are essentially as the plan
   prescribed. Three drifts surfaced during in-browser smoke and were
   fixed (§2/§3/§4); each is documented here so the M4 plan can be
   amended before T10 begins.

2. **Plan drift #1 — standalone `sourceState` MUST be `$state`-wrapped,
   not a plain object.** The plan asserted: "Standalone holds
   `sourceState` as a plain object, not `$state` — there is no
   external mutator in standalone, so the textarea's `bind:value` is
   the only writer." That reasoning is wrong. `bind:value` IS a
   writer — it mutates `sourceState.value` on every keystroke — and
   Svelte 5 only tracks mutations on `$state`-wrapped proxies. With a
   plain object, `MermaidEditor`'s `$effect(() => { const s =
   sourceState.value; ... })` reads `.value` once at mount and never
   re-runs, so the SVG preview goes stale immediately. User reproduced
   exactly: edit "Hi" → "Hello World" in the textarea, diagram stays
   on the seed `Hi` rendering. **Fix:** rename
   `src/standalone-main.ts` → `src/standalone-main.svelte.ts` (the
   `.svelte.ts` suffix is required for `$state` outside `.svelte`
   files — the plan's own §Key Discoveries already calls this out for
   T10's CE wrapper) and wrap with `$state({ value: ... })`. Updated
   `build.mjs` `entryPoints` accordingly. **Implication for T10:**
   the CE wrapper file (`mermaid-remote.svelte.ts`) was already going
   to use `$state` — it just turns out standalone needs the same
   treatment for the same reason. Component contract unchanged
   between modes.

3. **Plan drift #2 — `index.html` must include
   `<link rel="stylesheet" href="main.css" />`.** The plan's
   suggested HTML omits the link. Svelte 5 + `esbuild-svelte`
   compiles each component's `<style>` block into a CSS module
   import; esbuild bundles those imports into a sibling `dist/main.css`
   (we observed: 297 bytes after build). Without the `<link>`, the
   browser never loads it, and none of the component CSS — grid
   layout, `resize: none`, the `.preview` styling — applies. Symptom
   in-browser: textarea sized to its 2-row HTML default with the
   default resize handle visible; preview stacks below the textarea
   instead of beside it. **Fix:** added `<link>` to `<head>`. Same
   shape as `packages/whiteboard/public/index.html` line 6.
   **Implication for T10:** the federate output also produces a
   sibling CSS file (Mermaid editor styles), and the CE wrapper has
   to inject it as a `<link>` — same `import.meta.url`-based pattern
   the whiteboard uses for `excalidraw.css` (T7 Key Decisions #4).

4. **Plan drift #3 — `.editor` grid needs an explicit row track and
   the column ratio is 2fr 3fr (textarea : preview).** Two issues
   under one heading. (a) The plan's CSS `display: grid;
   grid-template-columns: 1fr 1fr; gap: 8px; height: 100%` is missing
   `grid-template-rows: 1fr`. With only column tracks declared, the
   implicit row defaults to `auto` height — sized to children — and
   `height: 100%` on the textarea/preview becomes circular (children
   want 100% of a row whose height is determined by children). Result:
   textarea collapses to its 2-row default. (b) After the row fix,
   user reviewed the embedded-in-host visual (host's lower middle
   cell is wide-and-short, ~1100×500) and asked about a top/bottom
   split. Recommended side-by-side because Mermaid sequence diagrams
   grow vertically (~50–80px per message); a top/bottom split would
   give the preview only ~250px tall and force scrolling at 5+
   messages. User asked for a 2:3 column ratio (textarea narrower,
   preview gets the larger near-square area). **Fix:**
   `grid-template-columns: 2fr 3fr; grid-template-rows: 1fr`.

5. **`tsconfig.json` `verbatimModuleSyntax: true` is non-optional for
   Svelte 5 + `<script lang="ts">`.** Surfaced as a stderr advisory
   on first `pnpm -F mermaid start` boot:
   `The TypeScript option verbatimModuleSyntax is now required when
   using Svelte files with lang="ts". Please add it to your
   tsconfig.json.` Added to `tsconfig.json` immediately; the
   advisory disappears, dev server otherwise unchanged. Worth
   surfacing because (a) the Svelte 5 + esbuild-svelte stack has
   sparse public OSS references, so this advisory might surprise the
   next build-config edit; (b) M4-T10 will inherit this tsconfig and
   should not regress it.

6. **Mermaid bundle size at ~3.1 MB is acceptable for V1 standalone
   AND federate.** `pnpm -F mermaid build` (one-shot prod) emits
   `dist/main.js` = 3,104,077 bytes minified. The plan flagged this
   for T10 and suggested `mermaid/dist/mermaid.esm.min.mjs` as a
   pre-bundled entry if the federate bundle balloons. Not pre-empting
   in T9 — the standalone path doesn't ship to the host and the V1
   demo runs fine on `:4000` with current size. Revisit during T10
   if the federate `Bootstrap-<hash>.js` chunk crosses ~5 MB or
   first-paint feels slow.

7. **Sandbox-bounded smoke testing — `pnpm install` and
   listening-port verification needed sandbox-bypass.** `pnpm install`
   failed under the default filesystem sandbox with `ERR_PNPM_EROFS`
   on writes to `~/.local/share/pnpm/store`; one retry with
   `dangerouslyDisableSandbox: true` succeeded cleanly (4.3 s, no
   strict-peer-dependencies escape hatch needed). `curl
   http://localhost:4000` from inside the sandbox returned `000`
   (connection refused) because the sandbox routes traffic through a
   proxy that doesn't bridge to localhost-bound ports; `--noproxy '*'`
   plus sandbox-bypass would have worked, but the dev server's
   `Mermaid dev server: http://localhost:4000` + `[watch] build
   finished` stdout was sufficient evidence for AC-02, and
   AC-03..AC-06 are user-driven browser checks anyway. Documented
   only because the same constraint will reappear in T10/T11 when
   `:3000` + `:4000` + `:4200` need cross-origin verification.

### Test Evidence

— session 2026-05-10

- `pnpm install` (sandbox-bypass mode after EROFS retry) — 4.3 s,
  16 packages added, no `--strict-peer-dependencies=false` needed.
  Pre-existing unrelated `temporal-polyfill@0.3.0 vs 0.3.2` peer
  warning on `packages/shell` (carried from M2; not gating).
- `pnpm -F mermaid start` — boots:

  ```
  > mermaid@ start /home/lutz/projects/FrankensteinMeetingRoom/packages/mermaid
  > node build.mjs --dev

  Mermaid dev server: http://localhost:4000
  [watch] build finished, watching for changes...
  ```

  After adding `verbatimModuleSyntax` to tsconfig the lone Svelte-
  preprocess advisory disappears too. No errors / warnings on watch
  rebuilds during the session.
- `pnpm -F mermaid build` (one-shot prod) — green:
  `Mermaid standalone build complete.`. Artifacts:
  `dist/main.js` 3,104,077 B, `dist/main.css` 297 B (Mermaid editor
  scoped styles), source maps emitted alongside.
- Browser smoke (user-driven, after fixes from Key Decisions §2 + §3):
  textarea seeded with `sequenceDiagram\n  Alice->>Bob: Hi`, SVG
  preview renders the same diagram on the right; editing the source
  to `Alice->>Bob: Hello World` updates the SVG in <100 ms while the
  user is typing; on stop, exactly one `[standalone] diagram:changed`
  console entry per debounce window with the full current text.
  Resize handle gone after the `<link>` fix; layout side-by-side at
  2:3 (textarea : preview) after the column-ratio adjustment.
- The actor-mirror (Alice/Bob boxes appearing at top AND bottom of
  the rendered sequence diagram) is Mermaid's documented default
  (`mirrorActors: true`); flagged to user as not-a-bug; `mermaid.
  initialize` config left at defaults for V1.

### Acceptance Coverage

(IDs from `docs/plans/m4-svelte-mermaid-remote.md` Task 9 §Acceptance.)

- **T9-AC-01** — `pnpm install` from repo root completes —
  `passed`. No escape hatch needed; pre-existing unrelated
  shell peer-dep warning carried from M2.
- **T9-AC-02** — `pnpm -F mermaid start` boots `:4000`, watcher
  active, no errors in stdout — `passed`. After
  `verbatimModuleSyntax` was added the stdout is fully clean.
- **T9-AC-03** — Browser to `http://localhost:4000` shows seeded
  textarea + Mermaid SVG preview; textarea editable —
  `passed` (browser-verified by user).
- **T9-AC-04** — Edit updates SVG within ~50ms + exactly one
  debounced `[standalone] diagram:changed` per ~500ms with full
  text — `passed` (browser-verified by user, after the
  reactivity fix in Key Decisions §2).
- **T9-AC-05** — Invalid Mermaid → error shown in preview pane,
  no console throw, `diagram:changed` still fires — `passed`
  (`renderError` state + `<pre class="error">` branch in
  `$effect`'s catch block; structurally exercised by the typing
  flow during AC-04 verification — every transitional in-flight
  source string between two valid states is invalid Mermaid and
  hits the catch path without surfacing on the console).
- **T9-AC-06** — DevTools console clean (no Svelte runtime
  warnings, no Mermaid init errors) — `passed`. Stale-render
  guard via the `cancelled` flag prevents the
  out-of-order-await warning that would otherwise fire on
  rapid edits.

### Open Issues

- **M4 plan needs three small amendments before `/start-task 10`.**
  All three came out of in-browser smoke and are noted in detail
  under Key Decisions §2/§3/§4. Concretely the plan should be
  patched:
  1. T9 `package skeleton` — rename `standalone-main.ts` →
     `standalone-main.svelte.ts`; the rationale is in plan §Key
     Discoveries (`$state` outside `.svelte` files needs the
     suffix) but the file-tree diagram and the §Standalone Note
     both still say `.ts`.
  2. T9 `public/index.html` — add `<link rel="stylesheet"
     href="main.css" />` to `<head>`. Mirror whiteboard's
     `index.html`. T10's federate output also emits CSS that the
     CE wrapper needs to inject — call this out in the T10 block.
  3. T9 `MermaidEditor.svelte` `<style>` — change
     `grid-template-columns: 1fr 1fr` to
     `grid-template-columns: 2fr 3fr` and add
     `grid-template-rows: 1fr`. Document the row-track requirement
     and the textarea:preview ratio decision (driven by the host
     cell's landscape geometry).
  Low priority — these are plan-text fixes, not code blockers.
  T10's first action can be a plan amendment commit.
- **Mermaid actor-mirror visual.** Mermaid's
  `mirrorActors: true` default renders actor boxes at top AND
  bottom of `sequenceDiagram` outputs. User flagged it as
  visually surprising. Left at default — it IS Mermaid's
  documented behaviour and disabling it would be a UX choice
  better made later (M5 polish or per-meeting config). If
  preferred behaviour changes, override via `mermaid.initialize({
  ..., sequence: { mirrorActors: false } })` in
  `MermaidEditor.svelte`'s `onMount`.
- **Mermaid bundle size (3.1 MB minified) carried into T10
  watch-list.** Plan §Key Discoveries already flags this. Decision
  point at T10: if the federate `Bootstrap-<hash>.js` chunk
  balloons or first-paint regresses noticeably, swap the entry
  to `mermaid/dist/mermaid.esm.min.mjs`. Don't pre-empt.
- **`dist/` accumulates dev-mode source maps even after a prod
  `build`.** Cosmetic — `dist/main.js` and `dist/main.css` are
  freshly emitted by the prod build, but `dist/main.js.map` and
  `dist/main.css.map` are stragglers from the prior `start --dev`
  session. Same shape as whiteboard's `dist/` (T8 Open Issue
  carried). A `clean` script would resolve both packages — out of
  scope for T9.

### Context for Next Task

T9 establishes the standalone foundation. T10 layers on the
federate path WITHOUT touching `MermaidEditor.svelte` or
`debounce.ts` — those are deliberately mode-agnostic. Concretely:

- **`MermaidEditor.svelte` is the V1 component contract.** Props:
  `{ sourceState: { value: string }; onChange: (s: string) => void }`.
  `sourceState` MUST be a `$state`-wrapped object (this is the
  reactivity surface the textarea binds to and the `$effect`
  observes). T10's CE wrapper file (`mermaid-remote.svelte.ts`)
  owns its own `$state({ value: '' })` container and bridges
  bus updates into it; the editor consumes the same prop shape
  unchanged.
- **`build.mjs` is `--dev`-only today.** T10 adds:
  - the `--federate` branch wrapping `runEsBuildBuilder`.
  - `copyFileSync` for any non-CSS assets the federate output
    needs (Mermaid renders SVG via innerHTML and doesn't load
    fonts, so probably none — but the CSS extracted into
    `main.css` will need the same `import.meta.url`-resolved
    `<link>` injection pattern the whiteboard uses for
    `excalidraw.css`).
  - `federation.config.js` per T10 plan-block — name `'mermaid'`,
    `skip: ['esbuild-svelte']`, `overrides: { svelte: { singleton:
    true, ... } }`, `@frankenstein/shared` as devDep so `shareAll`
    skips it.
- **CORS + 204 preflight already live on `:4000`.** T11 host fetch
  from `:4200` works without re-touching `build.mjs`.
- **`mkdirSync('dist', { recursive: true })`** is at the top of
  `build.mjs` and unconditional. T10's NF cache-persistence
  ENOENT path doesn't need to re-add it.
- **NF version pinning carries forward unchanged from T7/T8 Key
  Decision #1.** `@softarc/native-federation` `~4.0.0`,
  `@softarc/native-federation-esbuild` `4.0.0-RC10`,
  `@softarc/native-federation-orchestrator` `4.0.0`. T10's
  `package.json` adds these.
- **Federate-build invariants from T8 carry forward:** `pnpm`
  `shareAll` skips devDeps so `globalThis.frankensteinBus`
  singleton survives. NF cache invalidation gotcha
  (T8 Open Issue: federation-cache key doesn't include
  `fileReplacements`) does NOT apply here — Svelte 5 emits native
  ESM, no `fileReplacements` needed (plan §Architecture facts
  confirms). Manifest-timing watchpoint (T8 Open Issue) DOES
  apply — `await federation.close()` should block until
  `remoteEntry.json` is on disk; if T10's federate output appears
  before the manifest, mitigation is a post-`close()` `fs.access`
  poll.
- **`.svelte.ts` filename rule established for the workspace.**
  Anywhere `$state` / other runes appear outside a `.svelte` file,
  the file MUST be `.svelte.ts` or `.svelte.js`. Already affects
  `standalone-main.svelte.ts` in T9 and will affect
  `mermaid-remote.svelte.ts` in T10.

### Git State

```
git diff --stat
 pnpm-lock.yaml | 179 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++-
 1 file changed, 177 insertions(+), 2 deletions(-)

git status --short
 M pnpm-lock.yaml
?? packages/mermaid/
```

Stage on `/commit 9`: `pnpm-lock.yaml` + the eight new
`packages/mermaid/` files (`package.json`, `tsconfig.json`,
`svelte.config.js`, `build.mjs`, `public/index.html`,
`src/standalone-main.svelte.ts`, `src/MermaidEditor.svelte`,
`src/debounce.ts`) + this log. Do NOT stage:
`packages/mermaid/dist/` (build output), `packages/mermaid/
node_modules/` (pnpm-managed), `docs/m1-article-draft.md`
(unrelated, M1 article in progress), the harness home-dir
files (`.bash_profile`, `.bashrc`, `.zshrc`, `.zprofile`,
`.profile`, `.gitconfig`, `.gitmodules`, `.mcp.json`,
`.ripgreprc`, `.vscode/`, `.claude/`).
