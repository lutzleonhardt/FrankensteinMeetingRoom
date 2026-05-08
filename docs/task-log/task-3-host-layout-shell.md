# Task 3 — Three-column layout shell + viewport gate

### Task
Replace the M1 placeholder `<header>`-only body in `packages/shell/`
with the M2 layout scaffolding: header + CSS Grid `25% / 50% / 25%`
filling the viewport under the header, middle and right columns each
split vertically into two cells, placeholder content in every cell,
and a pure-CSS desktop-only gate at `< 1280 px`.

### Status
DONE

### Files Modified
- `packages/shell/src/app/app.html` (modified) — replaced the lone
  `<header>` line with header + `<main class="layout">` containing
  three `<section>` columns (`col-left` empty calendar slot,
  `col-mid` two stacked "Pick a meeting" placeholders, `col-right`
  two stacked "Meeting Details" / "Event Bus Log" cards) plus a
  sibling `<div class="viewport-too-narrow">Best viewed on desktop</div>`.
- `packages/shell/src/app/app.css` (modified, was empty) — header
  height pinned via `--header-h: 3rem` on `:host`; `.layout` is the
  `25% 50% 25%` grid sized to `calc(100vh - var(--header-h))`;
  `.col-mid` / `.col-right` use `grid-template-rows: 1fr 1fr` and
  set `min-height: 0` (so Task 3's scrollable bus log won't blow out
  the layout); `.cell` / `.placeholder` / `.card` style the
  placeholder boxes; a single `@media (max-width: 1279.98px)` block
  hides `.layout` and shows `.viewport-too-narrow`. No JS, no
  `window.innerWidth` reads, no resize listeners.
- `packages/shell/src/styles.css` (modified) — added
  `html, body { margin: 0; height: 100% }` and a
  `system-ui` font-family on `body`. Was previously the Angular
  CLI's default one-line comment.

`packages/shell/src/app/app.ts` was intentionally **not** touched —
class stays empty with `imports: []`. Per M1's wrap-up note,
imports get added only when bringing in child components.

### Files Read (Context Only)
- `docs/plans/m2-host-complete.md` — preamble + Task 3 block only
  (no sibling tasks). At the time this task was executed, the
  plan numbered it Task 1; the post-wrap-up renumber bumped it
  to Task 3.
- `docs/task-log/task-2-shell-native-federation-host.md` — M1
  closing context (Angular 21 file convention, two-phase bootstrap,
  `appConfig` location, deferred federation-init error handling).
- `packages/shell/src/app/app.html`, `app.ts`, `app.css`,
  `src/styles.css` — current state before editing.

### Key Decisions

- **Inlined the layout in `app.*` instead of extracting a
  `LayoutComponent`.** The plan said "extract only if `app.html`
  would otherwise exceed ~40 lines." The final template is 18
  lines. Extraction would have added a file, an import in `App`,
  and a selector with no payoff. Tasks 2/3/4 will replace cell
  contents in place; the layout itself doesn't need a
  re-instantiable boundary.

- **Pure-CSS viewport gate via `@media (max-width: 1279.98px)`.**
  Considered a Signal-driven gate in `App` (`viewportSignal()`
  with a resize listener). Rejected: adds JS, races with
  Native Federation's lazy bootstrap (the gate would briefly
  show the wrong UI on first paint while Angular initializes),
  and the spec out-of-scopes responsive behavior anyway. CSS
  evaluates before Angular mounts, so the gate is correct from
  the very first paint.

- **Fixed header height via `--header-h: 3rem` rather than
  flexbox column wrapper.** The grid needs a concrete height to
  size against (`calc(100vh - var(--header-h))`) so that
  `min-height: 0` on grid children can do its job. A flexbox
  `<body>` column with `flex: 1` on `.layout` would also work
  but couples header height to its content and makes
  `min-height: 0` interactions trickier later. The CSS variable
  is the single source of truth for header height.

- **`min-height: 0` on `.col-mid`, `.col-right`, and `.cell` up
  front, before any scrollable child exists.** Task 3's bus log
  is the first child that will need to scroll inside its cell.
  Adding the min-height now (one line) is cheaper than chasing
  the regression once the bus log lands and silently overflows
  the right column.

- **Added `html, body { margin: 0; height: 100% }` to
  `styles.css` instead of fighting the user-agent default in
  `app.css`.** The grid relies on `100vh` math; without zeroing
  the body margin, the header gets a default 8 px gutter and
  `100vh` overflows by exactly that amount. Touching globals is
  the cleanest fix and is the Angular CLI's intended use of
  `styles.css`.

- **Did not add a milestone checkbox flip for M2's task-3 in
  README/SPEC.** The plan doesn't ask for it, and the M1
  precedent (M1 was flipped after the milestone, not after each
  task) suggests milestone-level marking, not task-level.

### Test Evidence
- `pnpm -F shell build` (Node 22 via fnm) → exit 0. Initial
  total `92.06 kB` raw (`27.63 kB` est. transfer). `main`
  unchanged at `50.51 kB`; `polyfills` unchanged at `41.02 kB`;
  `bootstrap` lazy chunk grew from `579 B` (M1) to `2.54 kB`
  — accounted for by the new template + scoped CSS.
- `pnpm -F shell start` → boots clean on `:4200`. Dev-server log:
  0 errors, 0 warnings beyond the federation SSE init line that
  was already present in M1.
- `curl http://localhost:4200/` → 200 OK, returns the host shell
  HTML with `<app-root></app-root>`,
  `<script type="esms-options">{"shimMode":true}</script>`, and
  the orchestrator shim-import-map active (unchanged from M1).
- `curl http://localhost:4200/styles.css` → confirms the new
  global resets are served (`html, body { margin: 0; height: 100% }`
  + `system-ui` font).
- Layout markers verified in served lazy chunks
  (`chunk-OTBVRND7.js`, `chunk-VUJOFXKG.js`):
  `col-left`, `col-mid`, `col-right`, `Pick a meeting`,
  `Meeting Details`, `Event Bus Log`, `Best viewed on desktop`,
  `viewport-too-narrow`, `grid-template-columns` — all present.
- **Browser visual confirmation NOT done in this session.** The
  CLI verified bundle integrity, served HTML, served CSS, and
  marker presence in shipped chunks, but the rendered look at
  ≥ 1280 px and the swap to "Best viewed on desktop" at
  < 1280 px need a human eyeball or a headless browser run.
  Worth doing before the next task touches the layout.

### Open Issues
- Browser visual check of the rendered layout (and the < 1280 px
  swap) was not run from the CLI sandbox — only bundle-level
  evidence. Recommend the user spot-checks `:4200` + a resize
  before `/commit 3` lands. (The original code commit landed as
  `task-1: …` before the renumber; that's frozen in git history
  and not retroactively rewritten.)
- ~~Filename collision with M1's `task-1-workspace-shared-package.md`.~~
  Resolved in the follow-up `renumber:` commit — adopted globally
  sequential task numbering across the repo. M2 plan headings
  shifted to Task 3–6, this log was renamed
  `task-1-m2-host-layout-shell.md` → `task-3-host-layout-shell.md`,
  and `/plan` SKILL.md was updated to look up the next free `N`
  before issuing a new plan. M1 logs (`task-1-...`, `task-2-...`)
  stayed as-is.
- Tablet landscape (1024–1279 px) hits the desktop-only message.
  Intentional per spec, but worth a note in the M2 demo article
  if anyone is going to hand-test on an iPad-ish viewport.
- M1's deferred federation-init fail-fast design (per
  `task-2-shell-native-federation-host.md` Open Issues) is
  **still** deferred — Task 3 didn't touch `main.ts` and didn't
  introduce remotes. Ownership stays with M2 Task 2 / M3.

### Context for Next Task
M2 Task 2 mounts the Schedule-X weekly calendar in the left
column. What this task hands off:

- **Calendar slot.** `packages/shell/src/app/app.html` line ~5:
  `<section class="col-left" aria-label="Calendar"><div class="cell cell--empty"></div></section>`.
  Replace the inner `<div class="cell cell--empty">` with
  `<app-calendar>` (or the Schedule-X wrapper directly) and give
  it `width: 100%; height: 100%` — the parent `.col-left` is a
  grid cell that already fills its track. The `.cell` placeholder
  styling can be dropped from `app.css` once Task 4 replaces the
  remaining placeholders too, but for Task 2 only `.cell--empty`
  needs to go.
- **Header height** is `--header-h: 3rem` on `:host` in
  `app.css`. If Schedule-X needs more vertical room, bump that
  one variable — don't hand-edit `calc()` expressions.
- **`min-height: 0`** is already set on `.col-mid` and
  `.col-right`. `.col-left` doesn't need it (single child, no
  vertical split), but if Task 2 nests anything scrollable inside
  the calendar wrapper, add `min-height: 0` to the wrapper too.
- **Imports in `App`.** Currently `imports: []`. Task 2 adds the
  calendar component (or `provideSxCalendar` analogue in
  `app.config.ts`) — pick one site and stay consistent.
- **No global CSS additions are reserved for the calendar.**
  Schedule-X ships its own theme via
  `@schedule-x/theme-default`. Per the plan's Schedule-X facts
  section, that import lives next to `createCalendar(...)`, not in
  `styles.css`. `styles.css` is now reserved for cross-shell
  resets only.
- **Viewport gate is global.** Anything Task 2 mounts lives
  *inside* `.layout`, which is hidden below 1280 px. No need to
  add per-component viewport guards.

### Git State

```
git diff --stat
 packages/shell/src/app/app.css  | 69 +++++++++++++++++++++++++++++++++++++++++
 packages/shell/src/app/app.html | 18 +++++++++++
 packages/shell/src/styles.css   | 10 +++++-
 3 files changed, 96 insertions(+), 1 deletion(-)

git status --short
 M packages/shell/src/app/app.css
 M packages/shell/src/app/app.html
 M packages/shell/src/styles.css
?? docs/task-log/task-3-host-layout-shell.md
```

(Other untracked entries — `.bashrc`, `.zshrc`, `.bash_profile`,
`.profile`, `.zprofile`, `.gitconfig`, `.gitmodules`, `.mcp.json`,
`.ripgreprc`, `.vscode`, `.claude/`, `docs/m1-article-draft.md` —
are sandbox/harness artifacts or unrelated drafts. `/commit 3`
should not stage them.)
