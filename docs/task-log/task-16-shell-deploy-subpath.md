# Task 16 — Shell deployable under a subpath

### Task
Make the Angular shell build correctly under
`--base-href /frankenstein-meeting-room/` and resolve
federated remotes via relative paths in the manifest,
so the production bundle is deployable at
`https://lutzleonhardt.de/frankenstein-meeting-room/`.

### Status
DONE — all three plan ACs covered, including the
empirical dev-regression gate (user-run). Scope
expanded mid-session, user-approved, to also fix the
long-standing `ng build` hang via a Node wrapper —
covered in Key Decision #2 below.

### Files Modified

- `packages/shell/package.json` (modified) — added the
  new `build:deploy` script
  (`ng build --base-href /frankenstein-meeting-room/`)
  and re-routed both `build` and `build:deploy` through
  the new `scripts/ng-build.mjs` wrapper. No other
  script changes; `clean` / `start` / `watch` / `test`
  untouched.

- `packages/shell/scripts/ng-build.mjs` (new, 47 lines)
  — Node wrapper that runs `ng build …` in its own
  process group with `stdio: 'inherit'`, polls for
  `dist/shell/browser/index.html`, and `SIGKILL`s the
  process group once the artifact lands. Pre-deletes
  the artifact to prevent stale-success false positives.
  Hard ceiling of 5 minutes guards against a genuinely
  stuck build. Propagates `ng build`'s exit code when
  ng exits on its own before the artifact appears.

- `docs/build-modes.md` (modified) — updated the
  **Host** script table to include the new
  `build:deploy` row and flagged `build` /
  `build:deploy` as wrapped. Added a new H3
  subsection *"Why `build` / `build:deploy` go through
  a Node wrapper"* documenting the NF post-step hang
  and the wrapper's contract (pre-delete → run →
  poll → kill).

- `readme.md` (modified) — single-sentence note in the
  Build Modes section pointing at the new H3 in
  `docs/build-modes.md`. Respects the established
  "lean readme" principle (long-form lives in
  companion docs).

- `packages/shell/public/federation.manifest.json`
  (touched, reverted) — temp-swapped to relative
  paths during the AC-02 smoke test, then reverted
  to its committed localhost form for AC-03. **No
  diff at task close.**

### Files Read (Context Only)

- `docs/plans/m6-deployment.md` — preamble + Task 16
  block (lines 1–208). AC IDs adopted verbatim; plan
  Steps 1–5 followed. Smoke-serve sub-step adjusted
  per Key Decision #1.
- `docs/task-log/task-15-readme-polish-demo-flow.md` —
  predecessor. Confirmed `main.ts` was left with
  already-relative `initFederation` / `hostRemoteEntry`
  paths (no T16 source edit needed), and confirmed
  the M6 plan file stays untracked at T16 close-out.
- `packages/shell/src/main.ts` — defensive re-check
  per plan Step 2; no edit.
- `packages/shell/public/federation.manifest.json` —
  read before swap, after swap, after revert.
- `packages/shell/package.json` — script-table baseline.
- `packages/shell/angular.json` — confirmed no static
  `baseHref` config; `--base-href` CLI flag is the
  override.
- `packages/whiteboard/package.json` +
  `packages/mermaid/package.json` — verified the
  remotes use a custom esbuild-based `build.mjs`, not
  the Angular NF builder, so the hang is shell-specific
  and the wrapper does not need to be replicated for
  the remotes.
- `docs/build-modes.md` (Host section) — insertion-point
  research for the new H3.
- `readme.md` (Build Modes section) — insertion-point
  research for the one-line pointer.

### Key Decisions

— session 2026-05-11

1. **Smoke-serve path: subdir staging under
   `$TMPDIR`.** The plan's literal
   `npx serve dist/shell/browser -p 8080` doesn't
   serve the build under
   `/frankenstein-meeting-room/` — `serve` mounts at
   root. Surfaced this to the user up front; user
   approved the alternative: copy
   `dist/shell/browser/*` into
   `$TMPDIR/deploy-smoke/frankenstein-meeting-room/`
   and run `npx serve $TMPDIR/deploy-smoke -l 8088`
   so the URL `/frankenstein-meeting-room/` resolves
   to the build root. Port shifted from 8080 → 8088
   because 8080 was already occupied on this machine
   (PiClaw).

2. **Mid-task scope expansion: wrap `ng build` in a
   Node helper.** During the AC-01 build I hit the
   same `@angular-architects/native-federation-v4`
   post-step hang the user has been running into
   "x times". User flagged it: this is silent for
   humans (Ctrl-C after the bundle summary) but a
   trap for agents/CI (no completion event ever
   arrives). Decided to fold the fix into T16's
   commit — pure build plumbing, same milestone.
   Options considered:
   - **`timeout` one-liner in `package.json`.**
     Rejected: cross-platform fragility (`gtimeout`
     on macOS), child-process-group kill semantics
     are subtle, and the shell-quoted command is
     ugly inline.
   - **Node helper script.** Chosen: no
     cross-platform concerns (Node is already a hard
     dep), explicit process-group `SIGKILL`, clear
     diagnostic output, the package.json line stays
     terse (`node scripts/ng-build.mjs`).
   Wrapper applied to both `build` and `build:deploy`
   symmetrically — they differ only by the
   `--base-href` flag, and the user has hit the hang
   on plain `build` too.

3. **Documentation split: build-modes deep dive +
   one-line README pointer.** Per the user's
   established "Readme nicht total fett" principle
   (Key Decision #4 in T15), the wrapper's *why* and
   *how* lands in `docs/build-modes.md` as a new H3
   subsection. The README gets a single sentence
   pointing at the deep anchor. Net README delta:
   one line. Net build-modes delta: 22 added lines.

4. **Manifest swap stays manual (carried forward
   from plan).** Did not engineer an automated
   dev/prod split. The plan is explicit, the user
   accepted it during planning, and T18's
   `docs/deployment.md` will make the manual step
   impossible to miss.

5. **`build:deploy` artifact path = `build` artifact
   path.** Both produce
   `dist/shell/browser/index.html` — they share the
   wrapper's truth signal. `build:deploy` differs
   only in the `<base href>` written into that file.
   No separate `dist/` target for the deploy build.

### Test Evidence

— session 2026-05-11

- **T16-AC-01 — `<base href>` in built index.**
  `pnpm -F shell clean && pnpm -F shell build:deploy`
  → wrapper exits in 8s →
  `grep '<base' packages/shell/dist/shell/browser/index.html`
  → `<base href="/frankenstein-meeting-room/">`.
  **AC-01 verified.**

- **T16-AC-02 — Subpath serve, HTTP-level.** Staged
  the build into
  `/tmp/claude-1000/deploy-smoke/frankenstein-meeting-room/`,
  temp-swapped
  `packages/shell/public/federation.manifest.json`
  to relative paths, served on `localhost:8088`.
  `curl http://localhost:8088/frankenstein-meeting-room/`
  → 200, returns the index with the deploy `<base
  href>`, `<title>Shell</title>`, and the expected
  `modulepreload` / `module-shim` references.
  `curl …/federation.manifest.json` → 200,
  returns the relative-paths manifest.

- **T16-AC-02 — Subpath serve, browser surface
  (user-run).** User opened
  `http://localhost:8088/frankenstein-meeting-room/`
  in a real browser. Screenshot confirms:
  - Angular shell rendered (Schedule-X calendar
    visible, four-panel chrome with
    Whiteboard / Meeting Details / Mermaid Editor /
    Event Bus Log + chips + footer).
  - Network: two `remoteEntry.json` requests
    (whiteboard, mermaid) at
    `http://localhost:8088/frankenstein-meeting-room/{name}/remoteEntry.json`
    → 404 (expected — T17 produces those subtrees).
  - Console: two `[NF]` "Failed to load module …
    is not initialized" errors for whiteboard +
    mermaid. **No other errors.** Exactly the
    boundary-condition the plan flags.
  **AC-02 verified.**

- **T16-AC-03 — Dev regression (user-run).** After
  reverting the manifest (`git diff` on the file →
  zero), user ran
  `pnpm -F whiteboard dev` /
  `pnpm -F mermaid dev` /
  `pnpm -F shell start` and walked the T15 5-step
  demo flow. User confirmed *"Ja, ich bestätige,
  es läuft alles noch perfekt in der Dev-Version."*
  No console errors that would require a code fix.
  **AC-03 verified. Touches XC-01 (dev-server
  loop still green).**

- **Wrapper smoke — plain `build`.**
  `pnpm -F shell clean && pnpm -F shell build` →
  wrapper exits in 7s →
  `grep '<base' …/index.html` → `<base href="/">`
  (Angular default, no subpath). Confirms the
  wrapper is symmetric across `--base-href` /
  no-`--base-href`.

- **Wrapper smoke — exit-code propagation.** Not
  empirically tested in this session (would require
  injecting a real ng compile error). Logic is
  audit-only: on `ng.on('close')`, if the artifact
  is not present, the wrapper exits with ng's own
  exit code. A future task that produces a real
  Angular compile error will exercise this path
  naturally.

### Acceptance Coverage

(IDs from `docs/plans/m6-deployment.md` Task 16
§Acceptance.)

- **T16-AC-01** — `passed`.
  `dist/shell/browser/index.html` contains
  `<base href="/frankenstein-meeting-room/">` after
  `pnpm -F shell build:deploy`. Grep evidence captured
  in Test Evidence.

- **T16-AC-02** — `passed`. HTTP-level surface (curl
  on index + manifest) plus browser-rendered shell
  (user screenshot — calendar, chrome, manifest +
  remoteEntry network traffic). Console errors are
  exactly the two expected NF remote-load failures;
  no others. The smoke-serve path itself was adjusted
  from the plan (subdir staging) per Key Decision #1.

- **T16-AC-03** — `passed`. Manifest reverted to
  committed localhost form (`git diff` zero), user
  ran the full T15 demo flow against
  `localhost:4200`, confirmed clean. **Touches
  XC-01.**

### Open Issues

- **`@angular-architects/native-federation-v4`
  post-step hang is now wrapped, not fixed
  upstream.** The wrapper at
  `packages/shell/scripts/ng-build.mjs` makes the
  hang invisible to humans and agents (build exits
  in seconds when the artifact lands). The upstream
  bug remains; if a future Angular CLI / NF
  combination produces extra artifacts after
  `index.html`, the wrapper's "artifact written ⇒
  done" assumption may need to widen (e.g. also
  wait for `remoteEntry.json` on host-side
  expose-builds). Not the case in T16's config.

- **`docs/plans/m6-deployment.md` is still in the
  working tree but not part of T16's commit.**
  Carried forward from T15 close-out. Stage + commit
  it as a separate `plan: M6 deployment to subpath`
  commit after `/commit 16` lands, mirroring the
  `plan: M5 polish + stretch` pattern at commit
  `b252567`.

- **Mermaid empty-source console warning carried
  forward.** Same one-line `MermaidEditor.svelte`
  whitespace-guard follow-on noted in T12–T15.
  Did not surface on the T16-AC-03 demo-flow gate;
  user's run was clean.

- **Manifest swap remains manual.** No automation
  in T16; explicit in plan + spec'd into T18's
  `docs/deployment.md` writeup. Carrying forward
  unchanged.

### Context for Next Task

T17 (Repo-level build orchestration + local
end-to-end smoke) is the next consumer. Relevant
state after T16:

- **`pnpm -F shell build:deploy` exists and exits
  cleanly in ~8s.** T17's orchestration script can
  call it directly without timeout-wrappers or
  background-kill plumbing — the wrapper handles
  the NF post-step hang internally.
- **`pnpm -F shell build` is also wrapped** and
  exits cleanly, so any other build-flow script
  T17 invokes against the shell is safe.
- **Remote builds are unaffected** — they use a
  custom esbuild-based `build.mjs`, no NF post-step
  hang. T17 calls their `build:standalone` /
  `build:federate` as-is.
- **Subpath layout is fixed in code:**
  `<base href>` is set per `build:deploy`'s
  `--base-href` flag, written into the bundled
  `index.html`. The remote dist subtrees go under
  `whiteboard/` and `mermaid/` per the manifest's
  relative-paths shape.
- **`dist/deploy/` does not yet exist.** T17 has to
  assemble it from the three per-package `dist/`
  trees (shell + both remotes) plus the
  manifest-swap dance. The plan in
  `docs/plans/m6-deployment.md` §Task 17 is the
  canonical source.
- **Manifest swap pattern (manual):**
  - **For deploy:** swap to
    `{"whiteboard": "whiteboard/remoteEntry.json",
       "mermaid":    "mermaid/remoteEntry.json"}`.
  - **For dev:** revert to
    `{"whiteboard": "http://localhost:3000/remoteEntry.json",
       "mermaid":    "http://localhost:4000/remoteEntry.json"}`.
  T17's orchestration script may script the swap
  if the user wants, but the plan explicitly leaves
  it manual; T18 documents it.
- **Smoke-serve recipe (carried for T17):**
  copy each package's `dist/.../` output into a
  `frankenstein-meeting-room/` subdir under a temp
  root, then `npx serve <root> -l <free-port>`.
  Port 8080 is occupied on this dev machine; 8088
  was free.

### Git State

```
git diff --stat
 docs/build-modes.md         | 43 +++++++++++++++++++++++++++++++++++++------
 packages/shell/package.json |  3 ++-
 readme.md                   |  2 +-
 3 files changed, 40 insertions(+), 8 deletions(-)

git status --short
 M docs/build-modes.md
 M packages/shell/package.json
 M readme.md
?? docs/plans/m6-deployment.md
?? packages/shell/scripts/
```

Stage on `/commit 16`:
- `M docs/build-modes.md`
- `M packages/shell/package.json`
- `M readme.md`
- new `packages/shell/scripts/ng-build.mjs` (whole
  `scripts/` dir)
- this log
  (`docs/task-log/task-16-shell-deploy-subpath.md`)

**Do NOT stage** `docs/plans/m6-deployment.md` on the
T16 commit — it gets its own
`plan: M6 deployment to subpath` commit immediately
afterwards (mirroring `plan: M5 polish + stretch` in
commit `b252567`).
