# M6 — Deployment to `lutzleonhardt.de/frankenstein-meeting-room/`

**Spec:** `docs/specs/SPEC.md` — deployment is post-spec; T18 adds
a short Deployment section to the spec for completeness.

**Task numbering.** Continues from M5; last task = 11 → 15. M6 tasks:
16 → 18.

**Builds on:** M1–M5. All three frameworks federated, host owns
persistence, polished demo flow runs on localhost. Repo currently
has no deployment story — per-package `build` / `build:federate` /
`build:standalone` scripts each produce their own `dist/`, but
nothing assembles them.

**Goal.** Build the entire app (shell + both remotes) as a single
static bundle deployable under a subpath, hosted at
`https://lutzleonhardt.de/frankenstein-meeting-room/`. The two
remotes must remain reachable as standalone apps under the same
deployment via direct URLs
(`/frankenstein-meeting-room/whiteboard/` and
`/frankenstein-meeting-room/mermaid/`).

**Target deployment layout:**

```
/frankenstein-meeting-room/
├── index.html               ← Angular shell
├── *.js, *.css              ← shell bundles
├── federation.manifest.json ← prod manifest (relative paths)
├── whiteboard/
│   ├── index.html           ← standalone whiteboard
│   ├── main.js, main.css    ← standalone bundle
│   ├── remoteEntry.json     ← federated manifest (consumed by shell)
│   ├── Bootstrap-*.js
│   └── excalidraw.css
└── mermaid/
    ├── index.html
    ├── main.js, main.css
    ├── remoteEntry.json
    ├── Bootstrap-*.js
    └── Bootstrap.css
```

Both standalone HTMLs and federated `remoteEntry.json` coexist in
the same per-remote directory — already how each `dist/` looks
today.

**Architecture facts (carried across all three tasks):**

- **Manifest swap is manual.** `packages/shell/public/federation.manifest.json`
  currently hardcodes `http://localhost:3000/remoteEntry.json` and
  `http://localhost:4000/remoteEntry.json`. For deployment, the
  user edits the manifest to relative paths
  (`whiteboard/remoteEntry.json`, `mermaid/remoteEntry.json`)
  before running the deploy build, and reverts after. M6 does not
  engineer an automated split — the deployment docs make the step
  explicit.
- **Shell `initFederation` call site is already subpath-portable.**
  `packages/shell/src/main.ts:16` calls
  `initFederation('federation.manifest.json', ...)` with a
  relative path, and `hostRemoteEntry: './remoteEntry.json'` is
  also relative. The manifest is the only file whose contents
  need to differ between dev and prod.
- **Remote standalone HTMLs already use relative paths.**
  `packages/{whiteboard,mermaid}/public/index.html` use
  `<script src="main.js">` and `<link href="main.css">` — already
  portable under any subpath.
- **Remote `remoteEntry.json` references chunks relatively.**
  Already deployment-portable.
- **Custom Element CSS injection uses `import.meta.url`.**
  Already deployment-URL aware (the federated chunk resolves CSS
  relative to its own loaded URL).
- **`ngDevMode` shim in `main.ts` stays.** Loadbearing for
  mode-switch hygiene (M4 carry-forward). No regression.
- **`clean` scripts wipe `dist/`.** The repo-level orchestration
  must run cleans before prod builds to avoid stale-artefact
  mixing.
- **No new bus events, no `MeetingService` changes, no new remote
  dependencies.** M6 is pure build/deploy plumbing.

**Out of scope for M6:**
- CI/CD on the lutzleonhardt.de side (server config, upload
  mechanism). Repo produces a `dist/deploy/` tree; uploading it
  is operations.
- Custom domain CORS configuration — same-origin deployment, no
  cross-origin federation.
- Service worker, offline support, error boundaries.
- Versioning of `remoteEntry.json` URLs (cache-busting beyond
  esbuild's content-hash).
- Automated manifest swap — user does this manually.

## Flexibility Clause

The executing agent may adjust scope and ordering based on more
up-to-date context discovered during implementation, as long as
each task still satisfies the sizing rules.

When a task is finished (DONE or BLOCKED), close it with the
`/wrap-up N` → `/commit N` pair. `/wrap-up N` writes or extends
`docs/task-log/task-{N}-{slug}.md` and is safe to run multiple
times across sessions — it merges. `/commit N` reads that log,
stages code + summary, and commits them together after showing the
plan and waiting for confirmation. Optionally run `/review` (quick
per-task, full before a PR) between wrap-up and commit; a second
`/wrap-up N` can absorb the review findings.

---

## Task 16: Shell deployable under a subpath

### Instructions

Make the Angular shell build correctly under
`--base-href /frankenstein-meeting-room/` and resolve federated
remotes via relative paths in the manifest.

**Step 1 — Add `build:deploy` script** to
`packages/shell/package.json#scripts`:

```json
"build:deploy": "ng build --base-href /frankenstein-meeting-room/"
```

**Step 2 — Verify the shell `initFederation` call is already
portable.** Read `packages/shell/src/main.ts` and confirm
`initFederation('federation.manifest.json', ...)` is called with
a relative path and `hostRemoteEntry: './remoteEntry.json'`. If
either is absolute (leading slash or `http`), make it relative.
Both are currently already relative as of M5; this is a defensive
re-check.

**Step 3 — Manually edit the manifest to relative paths for the
deploy build:**

```json
{
  "whiteboard": "whiteboard/remoteEntry.json",
  "mermaid":    "mermaid/remoteEntry.json"
}
```

This is the manifest shape required for production. **Revert to
the localhost URLs before running `pnpm -F shell start` again** —
dev mode loads the remotes from their own dev-server origins
(`:3000`, `:4000`) and the relative paths would break dev. The
swap is manual; the deployment docs (T18) make this explicit.

**Step 4 — Local subpath smoke-test:**

```bash
pnpm -F shell clean
pnpm -F shell build:deploy
npx serve dist/shell/browser -p 8080
```

Then open `http://localhost:8080/frankenstein-meeting-room/`. The
shell should boot. The federated remotes will fail to load (their
dist outputs aren't present yet — that's T17), but the shell
itself should render the calendar and not throw on the base href
or import map. **Console will show federation load failures for
the two remotes** — that's expected at this task boundary; what
matters is that the shell itself comes up under the subpath.

**Step 5 — No-regression check:** Revert the manifest to its
localhost form. Run `pnpm -F shell start` and walk the existing
demo flow (T15) — calendar, click Architecture Review, both
remotes render, demo flow passes.

### Acceptance

- **T16-AC-01** — `pnpm -F shell build:deploy` produces
  `dist/shell/browser/index.html` whose `<head>` contains
  `<base href="/frankenstein-meeting-room/">`. Verify via
  `grep '<base' dist/shell/browser/index.html`.
- **T16-AC-02** — Serving the build locally
  (`npx serve dist/shell/browser -p 8080`) and opening
  `http://localhost:8080/frankenstein-meeting-room/` renders the
  Angular shell (calendar visible, panel chrome rendered). The
  console may show federation load failures for the two remotes
  — that's expected at this task's boundary. No other errors.
- **T16-AC-03** — After reverting the manifest to localhost URLs,
  `pnpm -F shell start` boots cleanly and the full T15 demo flow
  passes. **No dev regression.** Touches XC-01.

### Key Locations

- `packages/shell/package.json` — new `build:deploy` script
- `packages/shell/public/federation.manifest.json` — manual swap
  during verification (revert after)
- `packages/shell/src/main.ts` — defensive re-check of
  `initFederation` call (no change expected)

### Key Discoveries

- **`initFederation` already takes a relative manifest path.**
  M5 leaves `main.ts:16` at
  `initFederation('federation.manifest.json', ...)` and
  `hostRemoteEntry: './remoteEntry.json'`. Verified during
  planning — no source edit needed in this task.
- **Manifest swap is the only dev/prod difference.** The same
  file with different *contents* serves both. Switching is by
  hand.
- **Angular CLI's `--base-href` updates `<base href>` in
  `index.html` and rewrites asset/lazy-chunk URLs** so they
  resolve under the subpath. No additional config needed for
  shell-owned assets.

---

## Task 17: Repo-level build orchestration + local end-to-end smoke

### Instructions

A single command at the repo root produces a `dist/deploy/` tree
matching the M6 target layout, and a local smoke-test confirms all
three entry points (integrated app + two standalone remotes) work
under a faked subpath prefix.

**Depends on T16** (shell `build:deploy` must exist; manifest must
be in its relative-paths form for the orchestration to produce a
working integrated build).

**Step 1 — Write `scripts/build-deploy.mjs`** at the repo root
(Node ESM, no extra deps). Steps the script must perform, in
order:

1. `pnpm -F shell clean && pnpm -F whiteboard clean && pnpm -F mermaid clean`
2. `pnpm -F shell build:deploy`
3. `pnpm -F whiteboard build:standalone && pnpm -F whiteboard build:federate`
4. `pnpm -F mermaid    build:standalone && pnpm -F mermaid    build:federate`
5. Assemble `dist/deploy/` at repo root:
   - Copy `packages/shell/dist/shell/browser/*` → `dist/deploy/`
   - Copy `packages/whiteboard/dist/*` → `dist/deploy/whiteboard/`
   - Copy `packages/mermaid/dist/*` → `dist/deploy/mermaid/`

Use `fs.cpSync(src, dest, { recursive: true, force: true })`.
Clear `dist/deploy/` at the start of the assembly step so stale
files from previous runs don't accumulate.

**Pre-flight check (recommended, not strictly required):** Before
step 2, read `packages/shell/public/federation.manifest.json` and
warn (but do not abort) if any value contains `http://localhost`.
That's the user's signal they forgot the manual swap. A
`console.warn` with the friendly message is enough — don't
hard-fail; the user may be intentionally testing a hybrid setup.

**Step 2 — Add `build:deploy` to root `package.json`:**

```json
{
  "scripts": {
    "build:deploy": "node scripts/build-deploy.mjs"
  }
}
```

**Step 3 — Local end-to-end smoke:**

```bash
pnpm build:deploy
npx serve dist/deploy -p 8080
```

Open `http://localhost:8080/frankenstein-meeting-room/`. Walk the
T15 demo flow:

1. Calendar shows three meetings this week.
2. Click Architecture Review — Excalidraw + Mermaid render,
   Meeting Details fills in, bus log shows
   `event:selected` + two `context:request` rebroadcasts.
3. Edit Mermaid source — `diagram:changed` rows in bus log,
   Mermaid timestamp ticks.
4. Draw on Excalidraw — `drawing:changed` rows, Whiteboard
   timestamp ticks.
5. DevTools → Network, reload, filter `*.js` — three distinct
   path prefixes under `/frankenstein-meeting-room/` serve their
   respective bundles.

Then verify the two standalone URLs:

- `http://localhost:8080/frankenstein-meeting-room/whiteboard/`
  → Excalidraw + React chip header, no shell visible.
- `http://localhost:8080/frankenstein-meeting-room/mermaid/`
  → Mermaid editor + Svelte chip header, no shell visible.

### Acceptance

- **T17-AC-01** — `pnpm build:deploy` from repo root completes
  without errors and produces `dist/deploy/` with the target
  layout. Verify: `ls dist/deploy/` shows `index.html`,
  `federation.manifest.json`, `whiteboard/`, `mermaid/`.
- **T17-AC-02** — Local server serves
  `/frankenstein-meeting-room/` and renders the integrated app:
  calendar + both remotes + meeting details + bus log. No console
  errors. Touches XC-01.
- **T17-AC-03** —
  `/frankenstein-meeting-room/whiteboard/` standalone URL
  renders Excalidraw + the React chip header standalone, no
  console errors. Touches XC-01.
- **T17-AC-04** —
  `/frankenstein-meeting-room/mermaid/` standalone URL renders
  the Mermaid editor + the Svelte chip header standalone, no
  console errors. Touches XC-01.
- **T17-AC-05** — Full T15 demo flow (5 steps) runs against the
  deployed bundle with cleared LocalStorage. No console errors.

### Key Locations

- `scripts/build-deploy.mjs` (new) — orchestration script
- `package.json` (root, modified) — new `build:deploy` script
- `.gitignore` — verify `dist/` is already ignored at repo root;
  add `dist/deploy/` if not

### Key Discoveries

- **`dist/` mixing is harmless within one remote.** Each remote's
  `build:standalone` and `build:federate` write disjoint files
  into the same `dist/`. Running both in sequence (after a
  `clean`) leaves both sets of artefacts side-by-side, which is
  exactly the deployment layout we want.
- **Shell `dist/` path is nested.** Angular CLI writes to
  `packages/shell/dist/shell/browser/`, not
  `packages/shell/dist/`. The orchestration script must copy
  from the `browser/` subdir.
- **`npx serve` resolves directory prefixes via the filesystem.**
  `serve dist/deploy -p 8080` makes `dist/deploy/index.html`
  reachable at `/index.html`, and `dist/deploy/whiteboard/index.html`
  reachable at `/whiteboard/index.html`. To smoke-test under the
  `/frankenstein-meeting-room/` prefix, either rename the deploy
  dir or serve the parent (`npx serve dist -p 8080` after
  renaming `deploy` → `frankenstein-meeting-room`). Pick whichever
  is simpler; document the choice.

---

## Task 18: Deployment docs + SPEC.md Deployment section + README live-demo link

### Instructions

Document the build-and-deploy story. Add a short Deployment
section to the spec for completeness. Add the live URL to the
README once T17 has produced a working `dist/deploy/`.

**Depends on T17** (the deployment story must be implementable
end-to-end before being documented).

**Step 1 — Create `docs/deployment.md`.** Contents (rough shape,
the executing agent may reshape):

- One-paragraph framing: what gets deployed, where it lives, why
  the bundle is fully static.
- The target deployment layout (re-use the tree from this plan's
  preamble).
- **Build steps:**
  1. Edit `packages/shell/public/federation.manifest.json` →
     relative paths (`whiteboard/remoteEntry.json`,
     `mermaid/remoteEntry.json`).
  2. `pnpm build:deploy` from repo root.
  3. Upload `dist/deploy/` contents to the server at
     `/frankenstein-meeting-room/`.
  4. Revert the manifest to localhost URLs for further dev work.
- **Server requirements:** plain static file serving, no special
  config, no CORS rules (same-origin deployment).
- **Troubleshooting:** clean before deploy; if shell loads but
  remotes don't, manifest is probably still in dev shape; if
  remotes load but assets 404, base-href didn't match the
  deployed path.
- Link to lutzleonhardt.de live demo.

**Step 2 — Append a short Deployment section to
`docs/specs/SPEC.md`.** Keep it brief — this is informational, not
load-bearing for the architecture story. Suggested location: after
the Milestones section, before `Out of Scope (Production
Concerns)`. Suggested length: 5–10 lines. Suggested content:

- One paragraph: the app deploys as a fully-static bundle under a
  subpath, all three packages co-host in one directory tree,
  no server logic, no CORS — federation works because the manifest
  uses paths relative to `document.baseURI`.
- One paragraph: link to `docs/deployment.md` for the build
  process; live demo at `https://lutzleonhardt.de/frankenstein-meeting-room/`.

**Step 3 — Update `readme.md`.**

- Add a **Live Demo** line near the top (right after the TL;DR or
  in the TL;DR itself): `**Live demo:** https://lutzleonhardt.de/frankenstein-meeting-room/`.
- Add a Reading Order entry pointing at `docs/deployment.md`.

**Step 4 — Cross-link from `docs/build-modes.md`.** Add a short
"Deployment" subsection at the bottom of `build-modes.md` linking
to `docs/deployment.md`. Keep it to 2–3 lines — the long form
lives in deployment.md.

### Acceptance

- **T18-AC-01** — `docs/deployment.md` exists and walks a reader
  from a clean checkout to a deployable `dist/deploy/` tree
  including the manual manifest swap. The manual-swap step is
  explicit, not hidden in a footnote.
- **T18-AC-02** — `docs/specs/SPEC.md` has a Deployment section
  (5–10 lines) between Milestones and Out of Scope, linking out
  to `docs/deployment.md` for the build process and to the
  live-demo URL.
- **T18-AC-03** — `readme.md` shows a Live Demo link near the top
  (TL;DR area), and Reading Order references
  `docs/deployment.md`. Touches XC-01.
- **T18-AC-04** — Live demo URL resolves to a working page that
  runs the T15 demo flow without console errors. **Empirical
  gate — runs after the user uploads `dist/deploy/`.** If T18 is
  closed before the upload happens, T18-AC-04 is marked `pending`
  with a note; the upload is operations work, not blocked-on-this-task.

### Key Locations

- `docs/deployment.md` (new)
- `docs/specs/SPEC.md` (modified — short Deployment section)
- `readme.md` (modified — Live Demo link + Reading Order entry)
- `docs/build-modes.md` (modified — short Deployment cross-link)

### Key Discoveries

- **Manual manifest swap is the deployment's one moving part.**
  Everything else in the build pipeline is automated; the
  manifest is the only thing the user actively edits. The docs
  must make this step impossible to miss — it's the most likely
  source of a broken deploy.
- **The live-demo URL acceptance gate is empirical and
  out-of-process.** T18 can wrap up DONE even if T18-AC-04 is
  pending because the upload is not part of the repo's
  responsibility. Note the pending status in the task log so
  it's visible during future review.

---

## Cross-Cutting Acceptance

- **XC-01** — Three URLs all work post-deployment:
  - `https://lutzleonhardt.de/frankenstein-meeting-room/` — the
    integrated app (calendar + both remotes + bus log + meeting
    details), full demo flow runs.
  - `https://lutzleonhardt.de/frankenstein-meeting-room/whiteboard/`
    — standalone React whiteboard with chip header.
  - `https://lutzleonhardt.de/frankenstein-meeting-room/mermaid/`
    — standalone Svelte mermaid editor with chip header.

  No single task proves all three: T16 verifies the shell builds
  under the subpath; T17 verifies all three locally under a
  faked prefix; T18 verifies them live after upload.
  **Touches:** T16, T17, T18.
