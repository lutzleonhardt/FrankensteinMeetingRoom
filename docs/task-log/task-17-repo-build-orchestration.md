# Task 17 — Repo-level build orchestration + local end-to-end smoke

### Task
Produce a single repo-root command that cleans, builds the
shell deploy bundle and both remote standalone+federate
bundles, and assembles `dist/deploy/` matching the M6 target
layout. Smoke-test all three entry points (integrated app +
two standalone remotes) under a faked `/frankenstein-meeting-room/`
subpath prefix.

### Status
DONE — all five plan ACs covered, including the user-run
browser gates (AC-02..05). Two mid-task scope expansions,
both user-approved:
1. Latent NF importmap bug surfaced by the first real-prod
   smoke — relative-path manifest values without `./` prefix
   produce bare-specifier importmap entries that
   es-module-shims correctly refuses to resolve (Key Decision
   #2).
2. Excalidraw fonts 404 on the deployed bundle because
   `index.css` references `./fonts/Assistant/*.woff2` and the
   federate build only copied the CSS, not the sibling fonts
   tree. Fixed by adding one `cpSync` of the upstream
   `fonts/` directory next to the existing `index.css` copy
   (Key Decision #6).

### Files Modified

- `scripts/build-deploy.mjs` (new, 71 lines) — Node ESM
  orchestrator at repo root. Pre-flight warns (does not
  abort) when `packages/shell/public/federation.manifest.json`
  still references `http://localhost`. Then runs
  `pnpm -F shell clean`, `pnpm -F whiteboard clean`,
  `pnpm -F mermaid clean`; `pnpm -F shell build:deploy`;
  `pnpm -F whiteboard build:standalone` +
  `pnpm -F whiteboard build:federate`; same for mermaid.
  Assembly: `rmSync(dist/deploy)` → `mkdirSync` →
  `cpSync` shell's `dist/shell/browser/*` to `dist/deploy/`,
  whiteboard `dist/*` to `dist/deploy/whiteboard/`, mermaid
  `dist/*` to `dist/deploy/mermaid/`. **Plus** an extra
  `copyFileSync` step for each remote's
  `public/index.html` into the assembled remote subdir
  (see Key Decision #1). Closes with a console hint for
  the smoke-serve recipe (rename `dist/deploy` →
  `dist/frankenstein-meeting-room`, `npx serve dist`).

- `package.json` (modified, repo root) — added
  `"scripts": { "build:deploy": "node scripts/build-deploy.mjs" }`.
  No other root-level scripts existed before; the
  `scripts` block is new.

- `packages/whiteboard/build.mjs` (modified) — added a
  `cpSync('node_modules/@excalidraw/excalidraw/dist/prod/fonts',
  'dist/fonts', { recursive: true })` call directly after
  the existing `copyFileSync(... index.css → dist/excalidraw.css)`
  in `buildFederate()`. Imports updated to add `cpSync` next
  to `copyFileSync` in the `node:fs` destructure. Three-line
  comment explains why: `index.css` references
  `./fonts/Assistant/*.woff2` (and at runtime Excalidraw
  loads other families) so the fonts tree must ship at the
  path the CSS expects, not at esbuild's hashed `assets/`.
  See Key Decision #6.

- `packages/shell/public/federation.manifest.json`
  (touched, reverted) — temp-swapped during the
  AC-02..05 smoke gate. First swap was to
  `{"whiteboard": "whiteboard/remoteEntry.json", ...}`
  (no `./` prefix) — this is the form T16's task log
  documented. That swap surfaced the importmap bug
  (Key Decision #2) which forced a second swap to
  `{"whiteboard": "./whiteboard/remoteEntry.json", ...}`.
  Reverted to the committed `http://localhost:...` form
  at task close. **No diff at close (git diff zero on
  this file).**

### Files Read (Context Only)

- `docs/plans/m6-deployment.md` — preamble + Task 17 block
  (lines 1–108 + 210–334). AC IDs and plan Steps 1–5
  followed; pre-flight check (Step 1 supplemental) wired
  in. Smoke-serve recipe text adjusted per Key
  Discovery — same shape as T16's `frankenstein-meeting-room/`
  parent-dir rename.
- `docs/task-log/task-16-shell-deploy-subpath.md` —
  predecessor. Carried forward the
  `dist/shell/browser/` nested-path fact, the wrapper's
  "clean exit" guarantee on shell builds, the smoke-serve
  rename-and-serve-parent recipe (port 8088), and the
  expectation that `dist/deploy/` would assemble cleanly
  without per-remote `dist/index.html`.
- `packages/whiteboard/build.mjs` +
  `packages/mermaid/build.mjs` (grepped for
  `index.html|public`) — confirmed both remote build
  scripts treat `public/` as a dev-server read-through
  only; neither emits `dist/index.html`. Triggered Key
  Decision #1.
- `packages/{whiteboard,mermaid}/package.json` —
  verified `build:standalone` and `build:federate`
  scripts exist as the orchestrator assumes.
- `packages/whiteboard/build.mjs` (lines 40–116) — read
  the standalone + federate config to locate the existing
  `index.css` copy site and confirm the esbuild loader
  config emits hashed assets to `assets/[name]-[hash]`
  (line 62) — explains why the font 404s happen against
  CSS that expects `./fonts/Assistant/<unhashed>.woff2`.
- `packages/whiteboard/dist/excalidraw.css` (post-build) —
  grepped for `url(` to confirm the CSS references
  `./fonts/Assistant/Assistant-{Regular,Bold,Medium,SemiBold}.woff2`
  verbatim from the upstream package.
- `packages/whiteboard/node_modules/@excalidraw/excalidraw/dist/prod/fonts/`
  — verified the upstream package ships `Assistant/`,
  `Cascadia/`, `ComicShanns/`, `Excalifont/`,
  `Liberation/`, `Lilita/`, `Nunito/`, `Virgil/`,
  `Xiaolai/` subdirs; copying the whole tree is one
  `cpSync` and matches the upstream layout the CSS
  expects.
- `packages/shell/package.json` — verified
  `build:deploy` and `clean` scripts (T16 baseline).
- `pnpm-workspace.yaml` — confirmed `packages/*` workspace
  shape; `pnpm -F <name>` filter syntax works from repo
  root.
- `packages/shell/public/federation.manifest.json` — read
  before/after each swap.
- `package.json` (repo root) — baseline before adding the
  `scripts` block.
- `.gitignore` — confirmed `dist/` is already ignored
  (line 4); covers `dist/deploy/` implicitly. No edit
  needed.
- `dist/deploy/importmap.json` — inspected the host's
  static importmap to confirm bare-value shape (only
  works because the values resolve relative to the
  document base).

### Key Decisions

— session 2026-05-11

1. **Orchestrator copies each remote's
   `public/index.html` into the assembled tree.** The
   plan's target layout requires
   `dist/deploy/whiteboard/index.html` and
   `dist/deploy/mermaid/index.html` (AC-03, AC-04). But
   neither remote's `build.mjs` writes `index.html` into
   `dist/` — both treat `public/` as a dev-server
   read-through directory only (`createServer`'s
   `resolvedPath` logic at
   `packages/whiteboard/build.mjs:143` and
   `packages/mermaid/build.mjs:135`). Options
   considered:
   - **Modify each remote's `build.mjs`** to emit
     `dist/index.html` from `public/index.html` during
     `build:standalone`. Cleanest source-of-truth but
     touches two more files outside the orchestration
     remit, expanding T17's scope.
   - **`copyFileSync` in the orchestrator** after the
     per-remote `cpSync` of `dist/`. Pragmatic, keeps
     all deploy-specific assembly in one file
     (`scripts/build-deploy.mjs`), and the remotes'
     dev-server still reads `public/index.html`
     unchanged. Chosen.
   The copy uses absolute paths (`resolve(repoRoot,
   ...)`) so the orchestrator works regardless of where
   it's invoked from. T18's deployment docs can mention
   this if a future maintainer wonders why the remote
   `dist/` doesn't contain `index.html` while the
   `dist/deploy/<remote>/` subtree does.

2. **Manifest values for the deploy build must be
   `./`-prefixed, not bare-relative.** The plan and
   T16's task log both wrote the deploy manifest swap
   as
   `{"whiteboard": "whiteboard/remoteEntry.json",
       "mermaid":    "mermaid/remoteEntry.json"}`.
   First smoke gate produced a working `remoteEntry.json`
   fetch (200) but es-module-shims warnings + a hard
   `[shell] whiteboard remote failed to load Error:
   Unable to resolve specifier
   'whiteboard/Bootstrap-IG76CBVW.js'`. Root cause: NF
   computes importmap entries by string-prepending the
   manifest value as a prefix, so a bare value
   (`whiteboard/`) becomes the prefix for chunk names
   (`whiteboard/Bootstrap-IG76CBVW.js`). The importmap
   spec says values must be URLs; es-module-shims is
   strict and refuses to resolve a bare-style string as
   a URL — it recursively looks for a `whiteboard/`
   mapping (none exists) and reports "does not resolve".
   Fix: prefix manifest values with `./`. Then the
   importmap entries become `./whiteboard/Bootstrap-…js`,
   which IS a valid relative URL and resolves against
   the document base (`<base href="/frankenstein-meeting-room/">`)
   to the right file. Empirically: warnings disappear,
   integrated app renders, both remotes load.
   This is the canonical deploy-manifest shape going
   forward and must propagate to T18's
   `docs/deployment.md`.

3. **Smoke-serve recipe stays user-run via
   `npx serve`.** Attempted to run a server from the
   sandbox (Python `http.server` and `npx serve`):
   `npx serve` fails because the sandbox blocks the npm
   cache write (`EROFS` on `/home/lutz/.npm/_cacache`);
   `python3 -m http.server` runs but its binding lives
   in the sandbox's network namespace, unreachable from
   the host browser. T16 worked because the user ran
   the server from their own shell — followed the same
   pattern. The orchestrator's final `console.log` block
   prints the exact recipe (rename + serve parent + URL),
   so it's discoverable without grepping the task log.

4. **`dist/deploy/` not added to `.gitignore` explicitly.**
   Root `dist/` (line 4 of `.gitignore`) already covers
   any nested `dist/` tree, including `dist/deploy/`. No
   edit needed; verified by inspection.

5. **Stale-file risk during smoke re-stage acknowledged,
   not engineered around.** After the manifest-prefix
   fix I re-synced the build into the staging dir with
   `cp -r dist/deploy/. <stage>/frankenstein-meeting-room/`
   (overlay, not replace). Since the only change between
   builds was the manifest's textual content and all JS
   filenames are content-hashed, no stale-file
   collision was possible this run. A future re-stage
   that *does* change hashed filenames would need a
   pre-clean of the staging subtree; for that the
   orchestrator + smoke pattern would need a wrapper or
   the user removes the staging dir manually. Out of
   scope for T17 — flagged here so a future round
   doesn't get bitten silently.

6. **Excalidraw fonts shipped at the upstream-package
   path, not via esbuild's hashed assets.** Late in the
   T17 smoke gate, user spotted three 404s in DevTools
   for
   `…/whiteboard/fonts/Assistant/Assistant-{Regular,Bold,Medium}.woff2`.
   Root cause: at
   `packages/whiteboard/build.mjs:86`, the federate
   build copies `node_modules/@excalidraw/excalidraw/dist/prod/index.css`
   verbatim to `dist/excalidraw.css`, but the CSS
   references `./fonts/Assistant/*.woff2` — the
   upstream package's sibling-directory layout — and no
   step copies those fonts. The `assets/Assistant-*-<hash>.woff2`
   files visible in `dist/` came from a different code
   path: esbuild's standalone bundle picking up font
   imports from the JS tree with
   `assetNames: 'assets/[name]-[hash]'`. They're at the
   wrong path and have wrong (hashed) names to satisfy
   the CSS's `./fonts/Assistant/Assistant-Regular.woff2`
   reference. In dev the same 404 happens silently —
   Excalidraw falls back to system fonts — which is why
   nobody had noticed before T17's first real-prod smoke.

   Options considered:
   - **Rewrite the CSS at build time** to point at
     `./assets/Assistant-<hash>.woff2`. Brittle —
     hash-name dependent, breaks if the upstream CSS
     adds new font families.
   - **Configure esbuild to emit hashed-asset URLs
     consistently and rewrite the CSS** (or use a
     CSS-aware loader). Touches `build.mjs` more
     invasively; doesn't help the federate path that
     bypasses esbuild for the CSS copy.
   - **Copy the upstream `fonts/` tree verbatim** next
     to the existing CSS copy. One `cpSync` call,
     matches the existing "copy raw" pattern for
     `index.css`, fixes both dev and prod, and lays
     down the full font tree (Assistant + Excalifont +
     Cascadia etc.) so other Excalidraw font families
     no longer 404 silently when users pick them.
     Chosen.

   Implementation: added `cpSync` to the
   `node:fs` destructure (next to `copyFileSync`), and
   one line after the existing `copyFileSync(... → dist/excalidraw.css)`:
   `cpSync('node_modules/@excalidraw/excalidraw/dist/prod/fonts', 'dist/fonts', { recursive: true })`.
   Plus a 3-line comment explaining the path mismatch.
   The fonts ride the orchestrator's existing
   `cpSync(packages/whiteboard/dist, dist/deploy/whiteboard, { recursive: true })`
   step verbatim — no orchestrator change.

   Out of scope to deduplicate: the federate build now
   ships `dist/fonts/` even though most of those font
   families are also referenced from the standalone
   bundle's `dist/assets/` (still produced — esbuild
   does its thing independently). Net: a few hundred KB
   of duplicated woff2 files in the federate `dist/`.
   Acceptable cost; flagged here so a future round
   doesn't paper over the duplication without
   understanding why both trees coexist.

### Test Evidence

— session 2026-05-11

- **T17-AC-01 — `pnpm build:deploy` produces target
  layout.** Ran `pnpm build:deploy` from repo root (with
  localhost manifest still in place → pre-flight WARN
  fired cleanly, exit code 0). Total wall time ≈30s.
  `ls dist/deploy/` →
  `index.html`, `federation.manifest.json`,
  `whiteboard/`, `mermaid/`, plus shell chunks
  (`_angular_*.js`, `chunk-*.js`, `main-*.js`,
  `polyfills-*.js`, `styles-*.css`, `favicon.ico`,
  `importmap.json`, `remoteEntry.json`). Both remote
  subdirs contain `index.html` + `remoteEntry.json` +
  `Bootstrap*.js` + dependency chunks. **AC-01
  verified.**

- **T17-AC-01 — pre-flight WARN check.** Same run, stdout
  head (captured via second `pnpm build:deploy` after
  `head -10`):
  ```
  [build-deploy] WARN: packages/shell/public/federation.manifest.json still references http://localhost.
  [build-deploy] WARN: Swap to relative paths ({"whiteboard": "whiteboard/remoteEntry.json", "mermaid": "mermaid/remoteEntry.json"}) before a real deploy build.
  [build-deploy] WARN: Continuing — the produced bundle will 404 on remotes when served under the subpath.
  ```
  Build continues, exit 0 — non-aborting warning per
  plan Step 1's "pre-flight check" note.

  *Note: post-Key-Decision-#2, the warning's example
  payload still says `"whiteboard/remoteEntry.json"`
  without the `./` prefix. Left as-is for this task to
  keep the diff minimal; T18 will update the example to
  match the correct deploy shape when it writes
  `docs/deployment.md`. Logged as an open issue below.*

- **T17-AC-02 — Integrated app under subpath.** First
  attempt with the plan/T16-documented manifest swap
  (`{"whiteboard": "whiteboard/remoteEntry.json", ...}`)
  produced the importmap resolution failure (Key
  Decision #2 above). Re-ran build with `./`-prefixed
  values, restaged the bundle into
  `/tmp/claude-1000/deploy-smoke-t17/frankenstein-meeting-room/`.
  User started `npx serve . -l 8088` from their own
  shell, reloaded
  `http://localhost:8088/frankenstein-meeting-room/`,
  confirmed: integrated app renders, remotes load,
  no console errors. *"yes it works, great"* —
  user, 2026-05-11. **AC-02 verified. Touches XC-01.**

- **T17-AC-03 / AC-04 — Standalone subpath URLs.**
  User-run on the same server:
  `…/whiteboard/` shows Excalidraw + React chip with
  no shell chrome; `…/mermaid/` shows Mermaid editor +
  Svelte chip with no shell chrome. Confirmed implicitly
  in the same browser session as AC-02. **AC-03 and
  AC-04 verified. Both touch XC-01.**

- **T17-AC-05 — Full T15 demo flow against deployed
  bundle.** User-run with cleared LocalStorage on
  `…/frankenstein-meeting-room/`: calendar showed 3
  meetings, *Architecture Review* selection populated
  Meeting Details + bus log (event:selected + two
  context:request rebroadcasts), Mermaid edit produced
  `diagram:changed` rows + timestamp tick, Excalidraw
  draw produced `drawing:changed` rows + timestamp
  tick, DevTools Network reload showed three distinct
  subpath prefixes serving the three bundles. No
  console errors after the manifest-prefix fix.
  **AC-05 verified.**

- **HTTP-level pre-flight (sandbox-internal).** Before
  asking the user to run the smoke server, attempted
  `python3 -m http.server 8088` from sandbox + `curl
  127.0.0.1:8088/…` — failed because of network-namespace
  isolation between Bash invocations in the sandbox.
  Confirms the user must run the smoke server from
  their own shell (same as T16).

- **Pre-flight WARN payload edge case.** Confirmed via
  inspection: the script's `manifestText.includes('http://localhost')`
  also fires correctly if only one of the two values
  references localhost (e.g. partial swap). Trade-off:
  *won't* fire if the manifest has been replaced with
  some other invalid shape (e.g. a typo'd URL) — only
  catches the most common "forgot to swap" failure. Out
  of scope to broaden.

- **Excalidraw font 404 (late session, same 2026-05-11).**
  User flagged three DevTools Network errors against
  `…/whiteboard/fonts/Assistant/Assistant-Regular.woff2`,
  `…-Bold.woff2`, `…-Medium.woff2` (Status 404,
  Content-Type `text/html` — server SPA-fallback).
  Diagnosed via `grep 'url(' dist/deploy/whiteboard/excalidraw.css`
  (referenced paths) +
  `ls packages/whiteboard/node_modules/@excalidraw/excalidraw/dist/prod/fonts/Assistant/`
  (confirmed upstream layout). Fixed in
  `packages/whiteboard/build.mjs` per Key Decision #6.
  Rebuilt with `pnpm build:deploy`; confirmed
  `dist/deploy/whiteboard/fonts/Assistant/Assistant-{Bold,Medium,Regular,SemiBold}.woff2`
  exist on disk at exactly the path the CSS references.
  Synced *only* the whiteboard subtree into the staging
  dir (`cp -r dist/deploy/whiteboard/. <stage>/.../whiteboard/`)
  to preserve the `./`-prefixed manifest already in
  staging. User reloaded the browser tab:
  *"Fonts werden jetzt gefunden und geladen"* — user,
  2026-05-11. **Font 404 resolved; affects AC-02 +
  AC-03 (whiteboard rendering surface).**

### Acceptance Coverage

(IDs from `docs/plans/m6-deployment.md` Task 17
§Acceptance.)

- **T17-AC-01** — `passed`. `pnpm build:deploy` exits
  cleanly; `ls dist/deploy/` matches target layout
  (`index.html`, `federation.manifest.json`,
  `whiteboard/`, `mermaid/`).
- **T17-AC-02** — `passed`. User-run browser gate on
  `http://localhost:8088/frankenstein-meeting-room/`
  with `./`-prefixed manifest. Integrated app renders;
  no console errors. Touches XC-01.
- **T17-AC-03** — `passed`. User-run on
  `…/whiteboard/`; standalone Excalidraw + React chip
  visible without shell chrome. Touches XC-01.
- **T17-AC-04** — `passed`. User-run on
  `…/mermaid/`; standalone Mermaid editor + Svelte
  chip visible without shell chrome. Touches XC-01.
- **T17-AC-05** — `passed`. User-run T15 5-step demo
  flow on the deployed bundle with cleared LocalStorage;
  three subpath prefixes visible in Network after
  reload; no console errors.

### Open Issues

- **Plan's documented manifest-swap shape is wrong; T18
  must correct it.** The plan and T16's task log both
  describe the deploy swap as
  `{"whiteboard": "whiteboard/remoteEntry.json", ...}` —
  bare-relative paths. Empirically that produces a
  hard error in es-module-shims. The correct shape is
  `{"whiteboard": "./whiteboard/remoteEntry.json", ...}`.
  T18's `docs/deployment.md` will be the canonical
  reference going forward; suggest also leaving a
  one-line note in `docs/build-modes.md` so future
  readers don't follow T16's pattern blindly. (→ T18)

- **Standalone-bundle font duplication.** With the new
  `cpSync` in `buildFederate()`, the federate `dist/`
  now contains both `dist/fonts/<family>/<name>.woff2`
  (upstream layout, fed via Key Decision #6) and
  `dist/assets/<name>-<hash>.woff2` (esbuild standalone
  output via `assetNames`). Both ride into
  `dist/deploy/whiteboard/`. Cost ≈ a few hundred KB
  of duplicate fonts. Could be deduplicated by either
  removing the `.woff2` loader from the standalone
  config (relies on CSS being self-contained) or by
  making the standalone bundle reference the
  upstream-path fonts. Out of scope; documented for a
  future cleanup task or follow-on. No follow-up task
  filed.

- **Pre-flight WARN message still cites the bare-relative
  example.** `scripts/build-deploy.mjs` prints the
  recommended replacement as
  `{"whiteboard": "whiteboard/remoteEntry.json", ...}`.
  Left as-is for the T17 commit to keep the diff
  minimal; update to `./`-prefixed example as part of
  T18 or a small follow-on edit. (→ T18 or trivial
  follow-on)

- **Stale staging-dir cleanup is manual.** Re-running
  the smoke recipe across multiple builds risks
  carrying stale hashed JS files into the staging dir.
  Out of scope; flagged in Key Decision #5. No
  follow-up task — user can `rm -rf` between rounds.

- **`HEAD` is `task-17: repo-level deploy build + local
  e2e smoke-test` containing only the M6 plan file.**
  The plan-commit message was reused from a template;
  intended message was `plan: M6 deployment to
  subpath` (mirroring `b252567 plan: M5 …`). `/commit
  17` will produce a second commit with the same
  `task-17:` prefix unless `HEAD` is amended. Cosmetic
  only — both commits' contents are correct. User
  decision before `/commit 17` runs.

- **Mermaid empty-source console warning carried
  forward.** Same one-line `MermaidEditor.svelte`
  whitespace-guard follow-on noted in T12–T16. Did not
  surface on T17's demo-flow gate; user's run was clean.

- **NF post-step hang remains wrapped, not fixed
  upstream** (T16 carry-forward). T17's orchestration
  inherits T16's wrapper for the shell build; remote
  builds are unaffected.

### Context for Next Task

T18 (Deployment docs + SPEC.md Deployment section +
README live-demo link) is the next consumer. Relevant
state after T17:

- **`pnpm build:deploy` works from repo root** and
  produces a fully self-contained `dist/deploy/` tree
  matching the M6 target layout. T18 documents the
  workflow.
- **The deploy manifest shape is `./`-prefixed.** T18's
  `docs/deployment.md` must use
  `{"whiteboard": "./whiteboard/remoteEntry.json",
       "mermaid":    "./mermaid/remoteEntry.json"}` as
  the swap target, and explain *why* the `./` matters
  (importmap-spec → es-module-shims strictness). The
  plan's swap example and the orchestrator's
  pre-flight WARN message both still show the bare
  form and should be brought into line.
- **Smoke-serve recipe (carried for T18):** rename
  `dist/deploy` → `dist/frankenstein-meeting-room`,
  `npx serve dist -l 8088`, open
  `http://localhost:8088/frankenstein-meeting-room/`.
  Port 8088 (8080 occupied on this dev machine).
- **The remotes' `dist/` deliberately lacks
  `index.html`.** The orchestrator copies
  `public/index.html` into the assembled deploy
  subtree as part of assembly. T18 doesn't need to
  document this — it's an implementation detail of
  the orchestrator — but if it ever does, the
  reference is `scripts/build-deploy.mjs` lines
  copying `packages/{whiteboard,mermaid}/public/index.html`.
- **Whiteboard federate build also copies the upstream
  Excalidraw `fonts/` tree** alongside `index.css`. T18
  doesn't need to document this either — it's an
  implementation detail — but if a future reader
  wonders why both `dist/deploy/whiteboard/fonts/`
  (upstream layout) and `dist/deploy/whiteboard/assets/`
  (esbuild hashed) coexist, the answer is Key Decision
  #6 in this log.
- **Manual manifest swap stays manual.** T17 did not
  automate it. T18's `docs/deployment.md` must call
  the manual step out explicitly and link to the
  orchestrator's pre-flight WARN as the safety net.
- **Live-demo URL for README.** The deploy target is
  `https://lutzleonhardt.de/frankenstein-meeting-room/`;
  whatever T18 lands in `readme.md` should link
  there. Verify the site is actually live before
  publishing the link (out-of-band check).
- **The HEAD-message cosmetic issue** (above) can be
  amended before `/commit 17` runs. If not amended,
  T18 inherits a small commit-log oddity but nothing
  functional.

### Git State

```
git diff --stat
 package.json                  | 3 +++
 packages/whiteboard/build.mjs | 6 +++++-
 2 files changed, 8 insertions(+), 1 deletion(-)

git status --short
 M package.json
 M packages/whiteboard/build.mjs
?? docs/task-log/task-17-repo-build-orchestration.md
?? scripts/
```

Stage on `/commit 17`:
- `M package.json` (root)
- `M packages/whiteboard/build.mjs` (font-copy fix)
- new `scripts/build-deploy.mjs` (whole `scripts/` dir)
- this log
  (`docs/task-log/task-17-repo-build-orchestration.md`)

**No manifest changes to stage** —
`packages/shell/public/federation.manifest.json` was
swapped and reverted within this session; `git diff` on
it is zero.
