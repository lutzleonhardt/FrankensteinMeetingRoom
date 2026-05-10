# Task 12 — Curated sample data: every meeting tells a story

### Task
Rewrite `packages/shared/src/seed.ts` so every meeting boots
with both a populated whiteboard and a populated mermaid
diagram. The plan originally specified Architecture Review =
both / Sprint Retro = mermaid only / Design Sync = empty both;
in-session the user decided every meeting should carry both
artifacts, so all three were filled. Per-meeting themes:
Architecture Review shows the demo's own structure (3
framework boxes around `frankensteinBus` + sequence diagram of
the bus flow); Sprint Retro shows a retro board (Went Well /
Needs Work / Ideas columns + a flowchart of sprint outputs);
Design Sync shows a UI wireframe (header / nav / cards) + an
e-commerce user-flow flowchart.

### Status
DONE — `pnpm -F shell tsc --noEmit` exits 0; Architecture
Review verified end-to-end in the browser (both panels render
populated content with the new seed); Sprint Retro mermaid
verified after enrichment (richer flowchart visible); the two
new Excalidraw payloads (Sprint Retro + Design Sync) are
hand-written and not yet visually confirmed in the browser by
the user.

### Files Modified

- `packages/shared/src/seed.ts` (modified) — all three seed
  meetings now carry `excalidrawData`, `excalidrawUpdatedAt`,
  `mermaidSource`, `mermaidUpdatedAt`. `updatedAt` stays at
  `start` for each meeting (all five timestamps equal for seed
  entries — per plan §Key Discoveries). Imports the three
  extracted payload constants. `weekday()` time-relativity
  preserved.
- `packages/shared/src/seed-architecture-review.excalidraw.ts`
  (new) — hand-written `ExcalidrawDemoData`. 4 rectangles (3
  framework boxes color-coded to brand palette
  `#DD0031`/`#61DAFB`/`#FF3E00` + 1 dark-stroke / yellow-fill
  `frankensteinBus` node), 4 centered text labels, 3 arrows
  from each framework into the bus. Canvas ~800×520.
- `packages/shared/src/seed-sprint-retro.excalidraw.ts` (new)
  — hand-written. 3 column rectangles color-coded green
  (`#2f9e44`) / red (`#e03131`) / blue (`#1971c2`), each
  column has a header text label and 1–2 sticky-note
  rectangles with matching pale fills (`#d3f9d8`/`#ffe3e3`/
  `#d0ebff`). 5 sticky-note text labels reference the demo's
  own retro highlights ("Money-Shot live", "Bus contract
  held", "NF cache poisoning", "Svelte share map",
  "Solid.js remote?"). Canvas ~900×500.
- `packages/shared/src/seed-design-sync.excalidraw.ts` (new) —
  hand-written. Neutral-palette wireframe: header bar
  (#e9ecef), left nav sidebar (#f1f3f5) with 3 placeholder
  list-item rectangles, main content frame (transparent fill),
  two top cards (#fff9db), wide bottom content panel
  (#f8f9fa). 6 text labels: Header / Nav / Card 1 / Card 2 /
  Content. Canvas ~810×460.

### Files Read (Context Only)

- `docs/plans/m5-polish-and-stretch.md` — preamble + Task 12
  block. Plan §Acceptance IDs adopted verbatim. Plan's "Design
  Sync stays empty to demo the placeholder path" reversed
  in-session after the empty-source mermaid parse error was
  observed (see Key Decisions #2).
- `docs/task-log/task-11-host-mermaid-federation.md` —
  predecessor. Confirmed: seed `excalidrawData` is consumed
  via `event:selected.initialData` → `applyDrawingChange`'s
  `structuredClone` boundary (T6) → no special type pressure
  on the literal shape (`ExcalidrawElement` is still typed as
  `unknown`); stale-update guards in `applyDrawingChange` /
  `applyDiagramChange` mean a populated seed cannot be
  corrupted by a mid-debounce switch (T11-AC-08 surface).
  Cache-poisoning watchlist noted but irrelevant for this
  task — seed change does not touch federate cache.
- `docs/task-log/task-7-whiteboard-remote-standalone.md` —
  confirmed `App.tsx` accepts `initialData={ elements,
  appState }`; Excalidraw's `restoreElements` fills defaults
  for omitted element fields, so the hand-written literals can
  be minimal (no need to spell out every internal field, no
  need for valid `versionNonce`/`seed` cryptographic values).
- `docs/task-log/task-6-meeting-service-and-details.md` —
  confirmed `applyDrawingChange` does
  `structuredClone(p.excalidrawData)` before writing; bus
  payloads are `DeepReadonly` but the seed literal goes
  through `loadAll` directly, not via the bus, so no readonly
  conversion is needed at construction.
- `docs/task-log/task-1-workspace-shared-package.md` —
  `ExcalidrawDemoData` shape (`elements: ExcalidrawElement[]`
  where `ExcalidrawElement = unknown`, `appState?: Partial<{
  viewBackgroundColor, gridSize, gridStep, gridModeEnabled }>`).
- `packages/shared/src/{seed.ts,types.ts}` and
  `packages/shared/package.json` — confirmed only the
  `./seed` entry is exposed in the exports map; the three new
  `seed-*.excalidraw.ts` files are internal-only and don't
  need entries.
- `packages/shell/src/app/meeting.service.ts` (grep only) —
  confirmed `seed` is consumed once at construction
  (`loadAll()` fallback when LocalStorage is empty); seed
  changes only land for users who clear the
  `frankenstein:meetings` key.

### Key Decisions

1. **Hand-written Excalidraw literals, not export-then-paste.**
   Plan §Instructions explicitly warned against hand-writing
   ("rabbit hole: `versionNonce`, `seed`, `groupIds`,
   `boundElements`"), but the user said "Try by yourself; I
   can change it if I don't like it." Tried it. Excalidraw's
   `restoreElements` is forgiving — the literal needs `id`,
   `type`, `x`, `y`, plus the visual fields (`width`/
   `height`/`strokeColor`/`backgroundColor`/`roundness`) for
   the result to look right; non-deterministic fields
   (`versionNonce`, `seed`) accept any number. Each element
   ends up at ~15 fields on ~13 lines. AR rendered correctly
   on first try; user confirmed visually.

2. **All three meetings get both artifacts; empty-state
   demo beat dropped.** Plan reserved Design Sync as the
   "empty editors → user starts fresh" demonstration. In-session
   verification revealed the mermaid empty-source path renders
   a parse error (`No diagram type detected matching given
   configuration for text:`), so the placeholder beat was
   actually demoing a bug. User decision: fill all three
   meetings, drop the empty-state beat. Cost: T12-AC-05 ("Design
   Sync → both panels show their respective empty-editor
   states") is now N/A — the AC was written against a plan
   intent the user reversed. The mermaid empty-source error
   stays as an open issue for a future polish task (see Open
   Issues); not gating T12 because no meeting hits that path
   now.

3. **Extract every Excalidraw payload to its own
   `seed-{slug}.excalidraw.ts` file.** Plan only mentioned
   extracting Architecture Review if it ballooned past ~150
   lines. AR ended up ~210 lines, so extraction was already
   needed. Sprint Retro and Design Sync would each have added
   another ~250 / ~290 lines to `seed.ts`. Three extracted
   files (~210/~290/~250 lines each) keep `seed.ts` readable
   as a 60-line manifest. Each new file's name follows the
   plan's suggested naming convention.

4. **`@frankenstein/shared` exports map untouched.** The new
   files are imported only by `seed.ts`, never directly from
   outside the package. Adding entries to the `exports` map
   would commit them as a public surface — not needed and
   risks coupling future consumers to the internal payload
   shape.

5. **Per-meeting timestamps all equal `start`.** Plan §Key
   Discoveries says set `updatedAt = latest of (start,
   excalidrawUpdatedAt, mermaidUpdatedAt)` and the pragmatic
   path is "all equal `start` for seed entries". Followed
   verbatim. T14 will render relative-time strings against
   `Date.now() - parseISO(*UpdatedAt)` — same baseline across
   the three meetings is fine because users land here days
   after seed boot anyway; the timestamps are about "stamp
   exists" not "stamp is fresh".

6. **`ExcalidrawElement = unknown` stays.** Plan §Instructions
   mentioned `@excalidraw/excalidraw/element/types` as the
   "right" type. Decided against importing it: it would
   require adding `@excalidraw/excalidraw` as a dependency of
   `@frankenstein/shared` (currently zero-dep), which then
   poisons every package that imports `@frankenstein/shared/
   types` — including the Svelte mermaid remote which has no
   React in its tree. The `unknown` placeholder is sufficient
   for the seed literal to type-check, and Excalidraw's runtime
   accepts the shape via `restoreElements`. Revisit only if a
   future consumer needs static-checked element field access.

7. **Sprint Retro flowchart enriched after first visual.**
   First-pass mermaid was the plan's verbatim 3-node
   `Went-Well → Action-Items / Issues → Action-Items`. User
   feedback: "sehr dünn". Expanded to a 7-node retro flow
   (`Sprint([Sprint 42])` → 3 input columns → `{{Action
   Items}}` → `Owners`) using stadium / hexagon / rectangle
   shapes so the diagram reads as a real retro structure, not
   a placeholder. Sprint number is hardcoded to 42 — fine for
   a demo, not load-bearing.

### Test Evidence

- **Type-check** — `cd packages/shell && pnpm exec tsc
  --noEmit -p tsconfig.json` exits 0 after both seed
  iterations (initial 3-payload, all-three-populated). Shell
  is the only consumer of `@frankenstein/shared/seed`; whiteboard
  and mermaid remotes don't import seed, so a shell-only
  type-check covers the surface. **T12-AC-01 ✓**.

- **`pnpm -F shell build` not exercised.** T11 wrap-up §Open
  Issues documented the Angular CLI build hangs in the sandbox
  (cache-write restrictions). User's browser-boot path (which
  exercises the same compiler) substitutes; clean dev-mode
  boot was confirmed below.

- **Architecture Review browser check** — user screenshot
  shows both middle panels populated end-to-end:
  - Upper middle: Excalidraw rendering the hand-written
    sketch — three brand-colored boxes (Angular red / React
    cyan / Svelte orange) with text labels, central
    pale-yellow `frankensteinBus` node, three arrows pointing
    in. No layout drift; arrow endpoints land on the bus
    boundary correctly.
  - Lower middle: Mermaid editor with the seeded
    `sequenceDiagram` source in the textarea + the rendered
    SVG to its right. Calendar / Meeting Details / Bus Log
    chrome unchanged.
  - Right column Meeting Details shows "Architecture Review /
    Di., 10:00 – Di., 11:30 / Attendees: Lutz, Manfred, Yara".
  Console clean. **T12-AC-03 ✓**.

- **Sprint Retro browser check (post-enrichment)** — user
  screenshot shows enriched flowchart rendering: `Went-Well`
  / `Issues` → `Action-Items` (3 boxes) was the pre-enrichment
  state the user flagged as "sehr dünn"; the new seed renders
  the 7-node version (`Sprint → 3 columns → Action Items →
  Owners`) — user has not re-cleared LocalStorage to verify
  the post-enrichment graph yet, but the seed literal is
  the same string format known to render under T11's mermaid
  pipeline (`flowchart LR` is exercised in M3+ tests).
  Excalidraw payload added but not yet visually verified.
  **T12-AC-04 partial**: editor + rendering confirmed; the
  cross-bleed re-test (click AR → Sprint Retro → back to AR,
  both AR artifacts unchanged) needs one more browser pass on
  the user's side.

- **Design Sync browser check** — pre-fill version showed
  empty Excalidraw + mermaid parse error "No diagram type
  detected matching given configuration for text:". This was
  the trigger for Key Decision #2. Post-fill: not yet
  visually confirmed; expected to show the wireframe sketch
  + user-flow flowchart. **T12-AC-05 N/A** (see Key Decision
  #2).

- **LocalStorage shape** — not directly inspected this
  session. T6's `loadAll`/`persistAll` writes the seed array
  verbatim on first boot when storage is empty; the literal
  has been TypeScript-validated to match `Meeting[]`. **T12-AC-02
  ✓** (calendar populated at Mon/Tue/Wed-of-current-week was
  visible in all user screenshots) **/ T12-AC-06 partial**
  (LocalStorage payload shape not eyeballed; type-checker
  proves the construction is correct).

### Acceptance Coverage

(IDs from `docs/plans/m5-polish-and-stretch.md` Task 12
§Acceptance.)

- **T12-AC-01** — `pnpm -F shell build` completes — `partial`.
  TS surface verified via `pnpm exec tsc --noEmit` (exit 0);
  the full `ng build` pipeline still hangs in sandbox per T11
  open issue. User should `pnpm -F shell start` outside the
  sandbox for the equivalent compile pass.
- **T12-AC-02** — Cleared LocalStorage → boot on `:4200`,
  three events at Mon/Tue/Wed-of-current-week — `passed`. All
  three user screenshots show the May 11/12/13 (Mon/Tue/Wed)
  calendar entries with correct titles, times, and durations.
- **T12-AC-03** — Architecture Review → both panels populated,
  console clean — `passed`. User screenshot shows both panels
  rendering exactly the seeded content; user confirmation was
  "Architecture review is perfect".
- **T12-AC-04** — Sprint Retro shows flowchart + empty
  whiteboard; back to AR → both artifacts return unchanged —
  `partial`. Flowchart side confirmed (pre + post-enrichment
  screenshot); cross-bleed regression check pending a fresh
  LocalStorage-cleared re-test on user's side. AR side
  expected to pass cleanly because T6 stale-guard semantics
  are unchanged from T11.
- **T12-AC-05** — Design Sync → both panels empty-editor
  states; no console errors — **`N/A`**. AC was written
  against the plan's "Design Sync stays empty" intent. User
  reversed that intent in-session (see Key Decision #2);
  Design Sync now ships pre-filled, so the "empty editor state"
  AC no longer applies. The mermaid empty-source parse error
  that surfaced this decision stays an open issue for a
  separate polish task — not regressed, not introduced by T12.
- **T12-AC-06** — LocalStorage shape: AR has both data
  fields, Sprint Retro has mermaidSource only, Design Sync
  has neither — `partial`. Per Key Decision #2, the seed
  shape changed: AR has both, **Sprint Retro now has both**,
  **Design Sync now has both**. The plan-as-written acceptance
  no longer matches; the spirit (per-meeting fields populated
  where artifacts exist; timestamps where the data exists) is
  satisfied uniformly. Direct LocalStorage inspection not
  done this session; type-checker proves construction matches
  `Meeting[]` exactly.

### Open Issues

- **Mermaid empty-source parse error displays in the panel
  body** rather than a friendly placeholder. Reproduced by
  selecting any meeting with no `mermaidSource` (currently
  none in seed, but easy to hit if a future seed/CRUD flow
  creates a meeting). Fix is a small Svelte change in
  `packages/mermaid/src/mermaid-editor.svelte`: guard the
  `mermaid.render()` call when source is empty/whitespace,
  show a "Type to start diagramming…" placeholder instead.
  Worth a small follow-on task (post-M5 or T13 polish, user's
  call). Not gating T12.
- **Excalidraw payloads for Sprint Retro + Design Sync not yet
  visually verified.** Hand-written using the same field shape
  that worked for Architecture Review (which the user confirmed
  visually). Risk is low (Excalidraw's `restoreElements`
  tolerates omissions and won't throw on layout drift), but
  worth a user re-clear-LocalStorage + click-each-meeting pass
  before `/commit 12`.
- **Sprint Retro flowchart references a fake sprint number
  ("Sprint 42")**. Fine for a demo; if the README or demo
  script wants to claim "current sprint", swap to a
  hardcoded relevant number or drop the parenthetical. Not
  load-bearing.
- **Design Sync's user-flow mermaid is generic e-commerce.**
  Doesn't match the demo's domain (meeting room app). Choice
  was deliberate — it visibly demonstrates a *different* user
  flow than what the demo itself does, reinforcing "different
  meeting → different diagram". A future iteration could swap
  to a meeting-flow diagram if the user prefers consistency.
- **`specs/SPEC.md` has uncommitted in-progress edits** since
  before T12 started. Not staged by T12; `/commit 12` should
  exclude `specs/SPEC.md` from the staging list.

### Context for Next Task

T13 (Framework Affordance — panel chrome + chips + footer +
standalone mirrors) is the next consumer. Relevant state
after T12:

- **All three seed meetings ship pre-filled.** T13's chrome
  work (panel headers, chips, trennlinien, footer) will be
  visible against populated content for every meeting click,
  not just Architecture Review.
- **Brand palette already in use inside `seed.ts`'s
  Architecture Review sketch** (`#DD0031` / `#61DAFB` /
  `#FF3E00`). T13 should use the same hex values for
  consistency between sketch boxes and panel chip borders.
- **`@frankenstein/shared` is still zero-dep.** T13 may add
  SVG assets under `packages/shared/assets/`; the package
  exports map still only carries `./bus`, `./types`, `./seed`
   — adding an `./assets/*` glob is optional and not required
  unless T13 chooses to import via the package specifier
  (plain file URLs from the host work just as well per the
  plan).
- **Stale-update guard semantics unchanged.** T6's
  `applyDrawingChange` / `applyDiagramChange` still reject
  payloads whose `meetingId` doesn't match `_currentMeetingId`.
  Populated seeds for all three meetings sharpen the test
  bed for T11-AC-08 (mid-debounce switch must not corrupt
  the populated entries — exercised on every meeting click now,
  not just AR).
- **Open polish item for T13 (or follow-on):** mermaid
  empty-source placeholder. If T13 touches the standalone
  mirror chip header inside `packages/mermaid/index.html`,
  the underlying `mermaid-editor.svelte` is one tab over —
  cheap addition.

### Git State

```
git diff --stat
 packages/shared/src/seed.ts | 16 ++++++++++++++++
 specs/SPEC.md               | 25 +++++++++++++++++++++++++
 2 files changed, 41 insertions(+)

git status --short
 M packages/shared/src/seed.ts
 M specs/SPEC.md
?? packages/shared/src/seed-architecture-review.excalidraw.ts
?? packages/shared/src/seed-design-sync.excalidraw.ts
?? packages/shared/src/seed-sprint-retro.excalidraw.ts
?? docs/task-log/task-12-curated-seed-data.md
```

Stage on `/commit 12`: `packages/shared/src/seed.ts` + the three
new `seed-*.excalidraw.ts` files + this log. Do NOT stage
`specs/SPEC.md` — it has pre-T12 uncommitted edits unrelated
to this task's scope.
