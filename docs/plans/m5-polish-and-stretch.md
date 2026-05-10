# M5 — Polish + Stretch

**Spec:** `specs/SPEC.md`, Milestone M5.

**Task numbering.** Continues from M4 (last task = 11). Tasks: 12 → 15.

**Builds on:** M1–M4. All three frameworks federated; host owns persistence;
bus log live in lower-right cell. Seed has one Architecture Review with
`mermaidSource` only (added in T11). `MeetingService` already populates
`excalidrawUpdatedAt` / `mermaidUpdatedAt` (M2 Task 6) but no host UI surfaces
them yet.

**Scope.** Polish deliverables that turn the demoable prototype into a
*recordable* demo with a shareable README:

- (T12) Curated seed data so the three meetings together tell a coherent
  story; Architecture Review pre-loaded with both artifacts so the
  Money-Shot is populated on first load.
- (T13) Visible Frankenstein chrome: per-panel framework chips, panel
  headers around all five panels, column trennlinien, footer legend, and
  matching standalone-mirror chips inside the two remote `index.html`
  shells. **Money-Shot recordable end of T13.**
- (T14) Integration Moment 5: artifact-metadata rows in the Meeting
  Details card — "Whiteboard last changed", "Mermaid last changed",
  status pills.
- (T15) Final README polish + an end-to-end demo-flow walkthrough as the
  manual acceptance gate; mark M5 complete in `specs/SPEC.md` and
  `readme.md`.

**Explicitly dropped from M5:** Integration Moments 7 + 8 (Create / Delete
meeting UI). Reasoning: no new architectural claim (calendar is host-internal,
CRUD never crosses the bus), Schedule-X re-render path is a hidden
trailblazer, and the spec itself flags both moments as "useful for the live
demo, not load-bearing for the architecture story". Money-Shot is fully
recordable without them. If a future workshop genuinely needs CRUD, plan it
as a small standalone follow-on.

**Architecture facts (carried across all four tasks):**

- **Host owns all chrome.** Panel headers, chips, trennlinien, footer all
  live in the Angular shell. Remotes render only their content area; the
  host wraps `<whiteboard-remote>` / `<mermaid-remote>` in
  `<app-panel-header>` slots. Standalone modes ship their own minimal
  copy of the chip header in `index.html` so solo dev still shows it.
- **No new bus events.** All four V1 events
  (`context:request`, `event:selected`, `drawing:changed`,
  `diagram:changed`) stay as the entire cross-framework contract. M5 is
  pure host-side and seed-data work.
- **No new remote dependencies.** Whiteboard and Mermaid `package.json`
  files are not touched. The standalone `index.html` chip mirror is plain
  HTML/CSS/inline SVG inside the file already loaded by their dev servers.
- **`MeetingService` is unchanged.** `excalidrawUpdatedAt` /
  `mermaidUpdatedAt` are already populated by `applyDrawingChange` /
  `applyDiagramChange`; T14 only consumes them. No service-layer migration.
- **Stale-update guard stays load-bearing.** T12 may add `excalidrawData`
  to the seed; the guard in `applyDrawingChange` (M2 Task 6) means a
  mid-debounce meeting switch still cannot corrupt the populated seed
  data — exercised already by T11-AC-08.
- **`@frankenstein/shared` is still federation-shared = false.** If T13
  decides to commit SVG logos under `packages/shared/assets/` (instead of
  inlining), the package's role as a `devDependency` of each remote is
  unchanged — these are host-only assets, no remote imports them.
- **Brand colors (from spec):** Angular `#DD0031`, React `#61DAFB`,
  Svelte `#FF3E00`. Used for the 1px chip border and chip-text accent.
- **`packages/shared/assets/` does not exist yet.** T13 creates it if
  needed; the `package.json` `exports` map only covers `bus`, `types`,
  `seed` — assets are imported by the host as plain file URLs, not via
  the package's export surface.
- **Seed `weekday()` time-relativity.** `seed.ts` computes Monday-relative
  ISO strings at module load so the calendar always shows "this week".
  T12 must preserve this behavior — do not hard-code dates.

## Flexibility Clause

The executing agent may adjust scope and ordering based on more up-to-date
context discovered during implementation, as long as each task still satisfies
the sizing rules.

When a task is finished (DONE or BLOCKED), close it with the
`/wrap-up N` → `/commit N` pair. `/wrap-up N` writes or extends
`docs/task-log/task-{N}-{slug}.md` and is safe to run multiple times across
sessions — it merges. `/commit N` reads that log, stages code + summary, and
commits them together after showing the plan and waiting for confirmation.
Optionally run `/review` (quick per-task, full before a PR) between wrap-up
and commit; a second `/wrap-up N` can absorb the review findings.

---

## Task 12: Curated sample data — Architecture Review tells the story

### Instructions

Rewrite `packages/shared/src/seed.ts` so the three meetings *together* form
a coherent demo narrative instead of three disconnected stubs. Goal: when
the user clicks "Architecture Review" on first load — before touching
anything — both middle panels render populated artifacts that visibly
illustrate the demo's own architecture, and the right-column Meeting Details
shows non-empty artifact timestamps (T14 will surface those rows).

**Three-meeting story:**

- **`meeting-architecture-review`** — already self-referential via the
  Mermaid sequence diagram from T11. Add an `excalidrawData` payload
  with a hand-built whiteboard sketch: three labeled boxes (*Angular
  Host*, *React Whiteboard*, *Svelte Mermaid*) plus arrows pointing to a
  central `frankensteinBus` node. Set `excalidrawUpdatedAt` and
  `mermaidUpdatedAt` to the meeting's `start` ISO so T14's relative-time
  rendering has a sane baseline. Optionally tweak attendees/title to
  match the architecture-review framing.
- **`meeting-sprint-retro`** — give it a *different* `mermaidSource`
  (e.g. `flowchart LR\n  Went-Well --> Action-Items\n  Issues --> Action-Items`)
  to prove "different meeting → different diagram". No `excalidrawData`
  — empty whiteboard exercises the "no artifact yet" path. Set
  `mermaidUpdatedAt`.
- **`meeting-design-sync`** — leave both artifacts empty. Drives the
  "Pick a meeting → empty editors → user starts drawing/diagramming
  fresh" demo path and proves the placeholders / empty states still work.

**Excalidraw payload shape.** `ExcalidrawDemoData` is `{ elements,
appState? }`. `elements` is `ExcalidrawElement[]` from
`@excalidraw/excalidraw/element/types`. The simplest path: open the
running whiteboard remote, draw the three-box-plus-bus sketch by hand,
inspect the bus payload of the resulting `drawing:changed` event in
DevTools, and copy the JSON literal into `seed.ts`. Do **not** hand-write
Excalidraw element JSON — getting `versionNonce`, `seed`, `groupIds`,
`boundElements` etc. right by hand is a rabbit hole; the export-then-paste
approach is the demo-pragmatic shortcut.

If the inline JSON balloons past ~150 lines, extract into
`packages/shared/src/seed-architecture-review.excalidraw.ts` and import
the constant — keeps `seed.ts` readable.

**Mermaid sources.** Plain string literals in `seed.ts`, no extraction
needed (each is <10 lines). The Architecture Review source from T11 stays
as-is unless a clearer phrasing emerges during implementation.

**Time-relativity preservation.** Keep `weekday(offset, hour, minute?)`
intact. All three meetings remain Monday/Tuesday/Wednesday-of-current-week
so the calendar is always populated for whoever clones the repo.

### Key Discoveries

- **Excalidraw `appState` is partial-on-load.** Storing only the four keys
  in `ExcalidrawDemoData['appState']` is safe — the React remote passes
  `initialData` to Excalidraw which accepts `Partial<AppState>`. No
  round-trip loss.
- **`updatedAt` semantics.** Spec says "any change to the meeting", so
  for a fresh seed entry it should equal the latest of `start`,
  `excalidrawUpdatedAt`, `mermaidUpdatedAt`. Pragmatic: set all of them
  to the meeting's `start` for seed entries — they share the same
  module-load timestamp so equality holds.
- **Mermaid `flowchart` vs `sequenceDiagram`.** Both render fine with the
  current `securityLevel: 'loose'` config. Variety in the seed (one
  sequence, one flowchart) makes the "different meeting → different
  diagram" beat visible without changing the editor.
- **No persistence reset on existing dev sessions.** Anyone who already
  ran the project has a populated `frankenstein:meetings` LocalStorage
  entry; `loadAll()` returns it, the new seed is ignored. Document the
  reset path: DevTools → Application → LocalStorage → delete the
  `frankenstein:meetings` key (or run the demo in a private window).
  Acceptance must be checked against a *cleared* LocalStorage to be
  meaningful.
- **`frankenstein-meetings` schema is forward-compatible by accident.**
  Pre-T12 stored entries lack `excalidrawData` on Architecture Review;
  post-T12 seed adds it. A user who clears storage gets the new sketch;
  a user who doesn't keeps their personal state. Acceptable for a demo.

### Acceptance

- **T12-AC-01** — `pnpm -F shell build` completes without TypeScript
  errors after the seed rewrite. (Catches `ExcalidrawElement` import-path
  drift or schema-shape mismatch.)
- **T12-AC-02** — With LocalStorage cleared, `pnpm -F shell start` boots
  on `:4200`. Calendar shows three events ("Architecture Review",
  "Sprint Retro", "Design Sync") at Mon/Tue/Wed-of-current-week.
- **T12-AC-03** — Click "Architecture Review" → upper middle cell shows
  Excalidraw with the three-box + bus sketch (not an empty canvas);
  lower middle cell shows the Mermaid editor with the seed source AND
  its rendered SVG preview. Console clean.
- **T12-AC-04** — Click "Sprint Retro" → upper cell empty Excalidraw,
  lower cell renders the flowchart source + its SVG. Click back to
  Architecture Review → both artifacts reappear unchanged (no
  cross-bleed; T11-AC-07 regression check with populated artifacts).
- **T12-AC-05** — Click "Design Sync" → both panels show their
  respective empty-editor states; no console errors.
- **T12-AC-06** — Inspect LocalStorage `frankenstein:meetings` — all
  three entries present, Architecture Review has both `excalidrawData`
  and `mermaidSource`, Sprint Retro has `mermaidSource` only, Design
  Sync has neither. `excalidrawUpdatedAt` / `mermaidUpdatedAt` /
  `updatedAt` populated where artifacts exist.

### Key Locations

- `packages/shared/src/seed.ts` (modified — primary file)
- `packages/shared/src/seed-architecture-review.excalidraw.ts` (new,
  optional — only if Excalidraw payload exceeds ~150 lines inline)

---

## Task 13: Framework Affordance — panel chrome + chips + footer + standalone mirrors

**Depends on Task 12** (story-rich seed makes the chrome demo land).

### Instructions

Make the architectural seam visible without making the UI noisy. Build a
single `<app-panel-header>` component that owns the title row + chip on
every host panel, mirror a minimal version of the chip into each remote's
standalone `index.html`, and add the column/panel trennlinien + footer
legend at the shell level.

**Step 1 — Logo assets.** Decide between two paths during implementation:

- **(A) Inline SVG strings inside the `panel-header` component.** Three
  `const ANGULAR_LOGO = '<svg ...>...</svg>'` constants, rendered via
  `[innerHTML]` (with `DomSanitizer.bypassSecurityTrustHtml` since we
  trust our own constants). Zero asset-pipeline plumbing, zero new files.
- **(B) `packages/shared/assets/{angular,react,svelte}.svg`** committed
  as files, imported by the host as plain URLs. Closer to spec wording
  but requires one of: Angular `assets` glob in `angular.json`, or
  `import angularLogo from '@frankenstein/shared/assets/angular.svg'`
  with a TS module-declaration shim.

**Recommendation: (A)** — fewer moving parts, no Angular asset-config
edits, and the standalone `index.html` mirrors can use the same SVG
strings inlined directly. If the SVGs balloon past ~3 KB each, switch
to (B). Officially-branded source SVGs are tiny in practice.

**Step 2 — `<app-panel-header>` component.**

`packages/shell/src/app/panel-header.ts`:

```ts
import { Component, input } from '@angular/core';

type Framework = 'angular' | 'react' | 'svelte';

@Component({
  selector: 'app-panel-header',
  templateUrl: './panel-header.html',
  styleUrl: './panel-header.css',
})
export class PanelHeader {
  readonly title = input.required<string>();
  readonly framework = input.required<Framework>();
  // Inline SVG bodies + brand colors keyed by framework.
  // Color drives the chip's 1px border AND the chip text color.
}
```

`panel-header.html`: title-left, chip-right, single 1px bottom border
on the wrapper that doubles as the inner-panel trennlinie.

`panel-header.css`: enforce uniform height (~36–40px), title in panel
font, chip in 11–12px monospace with 14–16px logo, brand-color border,
neutral background.

**Step 3 — Wrap all five host panels.**

The five panels and their frameworks (from spec):

| Panel | Selector | Framework |
|---|---|---|
| Calendar | `app-calendar` | `angular` |
| Whiteboard | `app-whiteboard-slot` | `react` |
| Mermaid | `app-mermaid-slot` | `svelte` |
| Meeting Details | `app-meeting-details` | `angular` |
| Bus Log | `app-bus-log` | `angular` |

Each panel's template gets a wrapping
`<app-panel-header [title]="..." framework="..."></app-panel-header>`
followed by the existing content. Two valid approaches:

- **(i)** Each panel component imports `PanelHeader` and renders it at
  the top of its own template (current `bus-log.html` already has an
  inline `<h2 class="header">Event Bus Log</h2>` — replace it with the
  component).
- **(ii)** `app.html` owns the wrapping: every panel becomes
  `<app-panel-header title="..." framework="..."><app-calendar /></app-panel-header>`,
  with content projection via `<ng-content>`.

**Recommendation: (i)** — content-projection adds an outer wrapper layer
and forces the slot components to drop their `:host { height: 100% }`
contract. Inlining the header inside each panel keeps the existing
slot-CSS recipe intact.

**Step 4 — Column + panel trennlinien.**

Add to `app.css`:
- 1px `#e5e7eb` right-border on `.col-left` and `.col-mid` (or
  `column-gap` substitute via a per-column `border-right` — pick one;
  `border-right` is cleaner because it does not consume layout width).
- The horizontal trennlinie between upper/lower middle and upper/lower
  right cells comes "for free" from `<app-panel-header>`'s 1px bottom
  border; add a 1px `#e5e7eb` `border-top` to the *lower* panel in each
  stacked column (whiteboard-slot covers upper, mermaid-slot needs
  border-top; meeting-details covers upper, bus-log needs border-top).

**Step 5 — Footer legend.**

Append to `app.html`:

```html
<footer class="legend">Built with Angular + React + Svelte via Native Federation.</footer>
```

`app.css`: 1.5–2rem height, 11–12px text, top-border `#e5e7eb`, neutral
background. Update `:host` `.layout` height calc:
`calc(100vh - var(--header-h) - var(--footer-h))`.

**Step 6 — Standalone-mirror chips.**

`packages/whiteboard/public/index.html` and
`packages/mermaid/public/index.html`: add a top bar with the chip — same
shape as the host's panel header (title text + framework chip). Plain
HTML/inline SVG/inline `<style>`, no JS, no shared dependencies. The
existing `<div id="root">` keeps its full-viewport height; the chip bar
sits above it (~36–40px) and the root takes the rest.

```html
<!-- mermaid/public/index.html (sketch) -->
<body style="margin:0;height:100vh;display:flex;flex-direction:column">
  <header style="height:40px;border-bottom:1px solid #e5e7eb;...">
    <span>Mermaid Editor</span>
    <span class="chip" style="border:1px solid #FF3E00;...">
      <svg ...></svg> Svelte
    </span>
  </header>
  <div id="root" style="flex:1;min-height:0"></div>
  <script type="module" src="main.js"></script>
</body>
```

(Whiteboard mirrors the same shape with title "Whiteboard" + React
chip. Both files stay self-contained — copy-paste-friendly is fine for
two files.)

### Key Discoveries

- **Whiteboard panel currently has no title.** `whiteboard-slot.html` is
  pure conditional content. T13 adds the *first* title to that panel —
  same for `mermaid-slot.html`. Bus Log already has an inline `<h2>`
  that must be removed when `<app-panel-header>` lands; otherwise the
  title shows twice.
- **`bus-log.css` and `meeting-details.css` likely have padding the
  panel-header doesn't expect.** Spot-check the existing top-padding /
  margin on those components when wrapping; the header should sit flush
  with the panel's top edge.
- **Schedule-X owns its own header bar.** Don't try to put
  `<app-panel-header title="Calendar" framework="angular">` *inside*
  the Schedule-X component — wrap the `<sx-calendar>` host instead.
  Calendar component's `:host` rules may need a top-padding adjustment.
- **`CUSTOM_ELEMENTS_SCHEMA` stays localized** to the slot components
  (T8/T11 decision). `<app-panel-header>` is plain Angular and doesn't
  introduce custom-element schema concerns.
- **Inline SVG `[innerHTML]` + `DomSanitizer`.** The Angular
  templating-pragmatic path: a small `bypassSecurityTrustHtml` call
  inside the component's getter, since the SVG bodies are
  build-time constants, not user input. Alternative: use Angular's
  `*ngTemplateOutlet` with three template refs picked by `framework`.
  Either works; pick the simpler one.
- **Standalone HTML files are static.** No build step — just edit the
  HTML, save, refresh. No esbuild changes required for T13's standalone
  mirrors.
- **Footer legend is tiny but load-bearing for the demo narrative.** It
  serves as the legend for the chips (workshop attendees can match
  chip-color to framework name without prior context). Don't drop it.

### Acceptance

- **T13-AC-01** — `pnpm -F shell build` completes after wrapping all
  five panels. (Catches missing `imports` entries for `PanelHeader` or
  template-binding typos in `framework="..."`.)
- **T13-AC-02** — Boot `:4200` (with `:3000` and `:4000` running). Each
  of the five panels has a header row: title-left, chip-right, with the
  framework's brand-color 1px border and the official-brand SVG logo
  visible at 14–16px. Calendar/Meeting-Details/Bus-Log show Angular
  red `#DD0031`; Whiteboard React cyan `#61DAFB`; Mermaid Svelte
  orange `#FF3E00`.
- **T13-AC-03** — All five panel headers render at the *same height*
  (visual eyeball check; `:host` measurement equal across the five
  components).
- **T13-AC-04** — Column trennlinien visible between Calendar and
  middle column, and between middle and right column. Stacked-panel
  trennlinien visible between Whiteboard/Mermaid and between
  Meeting-Details/Bus-Log.
- **T13-AC-05** — Footer reads exactly *"Built with Angular + React +
  Svelte via Native Federation."* and is anchored at the bottom of the
  viewport. Layout still fits in `calc(100vh - header - footer)` at
  1280px width with no inner-panel scrollbars beyond the expected
  Excalidraw / textarea content scroll.
- **T13-AC-06** — `pnpm -F whiteboard start` opens `:3000` showing the
  React chip + "Whiteboard" title above the Excalidraw area. `pnpm -F
  mermaid start` opens `:4000` showing the Svelte chip + "Mermaid
  Editor" title above the editor. Both standalone modes still
  functional (Excalidraw renders + onChange logs; Mermaid editor
  renders + diagram:changed logs) — no regression vs T7/T9/T10.
- **T13-AC-07** — **Money-Shot recordable.** Single screenshot at
  `:4200` after clicking "Architecture Review": Angular calendar
  (Angular chip) on the left; Excalidraw populated with the seed sketch
  (React chip) and Mermaid editor with the rendered SVG (Svelte chip)
  in the middle column; Meeting Details + Bus Log (Angular chips) on
  the right; footer legend at the bottom. DevTools network panel
  filterable to three framework bundles.

### Key Locations

- `packages/shell/src/app/panel-header.ts` (new)
- `packages/shell/src/app/panel-header.html` (new)
- `packages/shell/src/app/panel-header.css` (new)
- `packages/shell/src/app/calendar.html` (modified — wrap with header)
- `packages/shell/src/app/calendar.ts` (modified — `imports: [PanelHeader, ...]`)
- `packages/shell/src/app/whiteboard-slot.html` (modified)
- `packages/shell/src/app/whiteboard-slot.ts` (modified — imports)
- `packages/shell/src/app/mermaid-slot.html` (modified)
- `packages/shell/src/app/mermaid-slot.ts` (modified — imports)
- `packages/shell/src/app/meeting-details.html` (modified)
- `packages/shell/src/app/meeting-details.ts` (modified — imports)
- `packages/shell/src/app/bus-log.html` (modified — drop inline `<h2>`)
- `packages/shell/src/app/bus-log.ts` (modified — imports)
- `packages/shell/src/app/app.html` (modified — add footer)
- `packages/shell/src/app/app.css` (modified — trennlinien + footer + height calc)
- `packages/whiteboard/public/index.html` (modified — chip mirror)
- `packages/mermaid/public/index.html` (modified — chip mirror)
- `packages/shared/assets/{angular,react,svelte}.svg` (new — only if
  path B is chosen in Step 1)

---

## Task 14: Artifact metadata in Meeting Details (Integration Moment 5)

**Depends on Task 13** (panel-header contract is the row-layout sibling).

### Instructions

Surface `excalidrawUpdatedAt` and `mermaidUpdatedAt` as live rows inside
the Meeting Details card. Each row shows: label, last-changed timestamp,
and a status pill (*Saved* / *No artifact yet*). Rows update reactively
within ~500ms of a remote edit (signal-driven, since `MeetingService`
already mutates `currentMeeting()`'s timestamps via `applyDrawingChange`
/ `applyDiagramChange`).

**Two new rows below the existing attendees row:**

```
┌─────────────────────────────────┐
│  Architecture Review            │   ← existing title
│  Mon, 10:00 – 11:30             │   ← existing time
│  Attendees: Lutz, Manfred, Yara │   ← existing attendees
├─────────────────────────────────┤
│  Whiteboard   [Saved]   14:32   │   ← new
│  Mermaid      [Saved]   14:34   │   ← new
└─────────────────────────────────┘
```

When a meeting has no artifact yet, the row reads:
`Whiteboard   [No artifact yet]`. Empty `meetingId` (no meeting
selected) — entire details card stays in its current empty state from
M2 (`Select a meeting from the calendar.`).

**Time formatting.** Use the existing `Intl.DateTimeFormat` instance in
`meeting-details.ts` (already configured with `weekday`, `hour`,
`minute`). For the artifact rows, prefer hour:minute only — same
formatter is fine (the prefix gets ignored visually for "today" cases;
fully acceptable for V1 polish). If "today vs other days" cosmetic
matters, branch per row, but don't over-engineer — the workshop demo
runs in a single session.

**Reactivity.** `meeting-details.ts` already exposes
`readonly meeting = this.svc.currentMeeting`. The two new computed
signals derive from `meeting()` directly:

```ts
readonly excalidrawStatus = computed<ArtifactStatus>(() => {
  const m = this.meeting();
  if (!m) return 'none';
  return m.excalidrawUpdatedAt ? 'saved' : 'none';
});
readonly excalidrawTimestamp = computed(() => {
  const m = this.meeting();
  return m?.excalidrawUpdatedAt
    ? timeFormat.format(new Date(m.excalidrawUpdatedAt))
    : null;
});
// Same shape for mermaidStatus / mermaidTimestamp.
```

`MeetingService.applyDrawingChange` calls `_meetings.set(next)` which
flips the computed `currentMeeting` to a new object — Angular signals
re-trigger the template, the new timestamp formats, and the status
pill stays "Saved". No extra glue needed.

**Status pill styling.** Two variants:
- *Saved* — green-ish `#0a7d3f` text on `#e6f4ea` background, 11px,
  rounded.
- *No artifact yet* — neutral `#666` text on `#f0f0f0` background.

Borrow the panel-header chip's font/spacing for visual consistency
without claiming chip semantics.

### Key Discoveries

- **No service edits.** `MeetingService.applyDrawingChange` /
  `applyDiagramChange` already write `excalidrawUpdatedAt` /
  `mermaidUpdatedAt` (M2 Task 6). Confirmed by re-reading
  `meeting.service.ts` lines 54–75. T14 is purely a presentation task.
- **`currentMeeting` is `computed`, not `signal`.** Means *any* mutation
  to `_meetings` that affects the current `_currentMeetingId` produces
  a new computed result — the template re-runs without manual
  invalidation. Confirmed by spec: "the service is also the single
  broadcast point ... every entry path that mutates context goes
  through one setter".
- **Debounce already at the producer.** Excalidraw's onChange is
  debounced ~500ms inside the React remote (T7/T8); Mermaid editor's
  onChange is debounced ~500ms inside the Svelte remote (T9). Service
  persists synchronously → signal flips → details row updates.
  ~500ms perceived lag is the *correct* behavior, not a bug to fix.
- **`Intl.DateTimeFormat` instance reuse.** The component already
  defines `dateFormat` at module scope. Add a second
  `timeFormat = new Intl.DateTimeFormat(undefined, { hour: '2-digit',
  minute: '2-digit' })` next to it for HH:MM-only rendering. Do not
  instantiate inside the computed — that's an allocation per
  re-render.
- **Status semantics, deliberate scope.** Spec mentions an optional
  third state *"Unsaved"*. The current architecture has no "unsaved"
  state — every `drawing:changed` / `diagram:changed` is persisted
  synchronously by the service. *Saved* is the only state once an
  artifact exists. Drop the *Unsaved* pill from V1; it would lie.
- **Empty-meeting path.** When `currentMeeting()` is null, the
  existing `@if (meeting(); as m) { ... } @else { Select... }` block
  short-circuits — both new rows live inside the `@if`, no extra
  null-handling needed.
- **`meeting-details.html` lives inside `@if`.** Both new rows must be
  added *inside* the existing `@if (meeting(); as m)` block, not after
  it.

### Acceptance

- **T14-AC-01** — `pnpm -F shell build` completes. With LocalStorage
  cleared, boot `:4200`. No meeting selected → details shows the
  existing "Select a meeting from the calendar." (no regression). No
  artifact rows visible.
- **T14-AC-02** — Click "Architecture Review" → details card shows
  title/time/attendees AND two artifact rows: "Whiteboard [Saved]
  HH:MM" and "Mermaid [Saved] HH:MM". Both timestamps match the
  seed's `start` ISO formatted to local time.
- **T14-AC-03** — Click "Sprint Retro" (which has `mermaidSource` only)
  → "Whiteboard [No artifact yet]" row (no timestamp), "Mermaid
  [Saved] HH:MM" row.
- **T14-AC-04** — Click "Design Sync" (no artifacts) → both rows show
  "[No artifact yet]".
- **T14-AC-05** — On Architecture Review, edit the Mermaid textarea.
  Within ~500ms (debounce) the Mermaid row's timestamp ticks forward
  to the current time AND `mermaidUpdatedAt` in LocalStorage matches.
  Whiteboard row unchanged.
- **T14-AC-06** — Same for Excalidraw: draw something → ~500ms later
  Whiteboard row's timestamp ticks; Mermaid row unchanged.
- **T14-AC-07** — Switch to Sprint Retro (Whiteboard "[No artifact
  yet]"), draw on the Excalidraw canvas. After debounce: row flips to
  "[Saved] HH:MM"; LocalStorage's Sprint Retro entry now has
  `excalidrawData` and `excalidrawUpdatedAt` populated. Switch back to
  Architecture Review: its Whiteboard row still shows the seed's
  earlier timestamp (no cross-bleed).

### Key Locations

- `packages/shell/src/app/meeting-details.ts` (modified — add
  `timeFormat`, four computed signals)
- `packages/shell/src/app/meeting-details.html` (modified — two new
  rows inside the `@if` block)
- `packages/shell/src/app/meeting-details.css` (modified — status pill
  styles + row layout)

---

## Task 15: README polish + recordable demo-flow walkthrough

**Depends on Tasks 12–14.**

### Instructions

Final docs pass that turns the running prototype into a shareable repo.
Update the README to reflect the completed scope, document the demo
flow that the workshop / video uses, and run that flow end-to-end as
the manual acceptance gate. Then mark the milestone complete in the
spec.

**Step 1 — Status block.**

`readme.md` lines 15–20 currently read *"Spec complete, implementation
in progress. Milestones M1–M3 are done ... M4 and M5 are next"*. Update
to: all five milestones complete, link to the demo-flow section below
as the entry point for new readers.

**Step 2 — Architecture diagram.**

The current ASCII block at lines 23–32 is fine. *Optionally* replace
or augment with a Mermaid `flowchart` or `sequenceDiagram` (rendered
inline by GitHub). Don't both have ASCII and Mermaid — pick one.
Recommendation: keep the ASCII (visible in any text editor / dev.to
post / `cat readme.md`) and add a separate "Communication flow"
section pointing at `specs/SPEC.md`'s mermaid diagram lines 228–245
rather than duplicating it.

**Step 3 — Quick Start sanity check.**

`readme.md` lines 87–104 list `pnpm --filter <pkg> start` commands.
Cross-check against the *current* `package.json` scripts in each
package — T11's task-log notes that the remote scripts were renamed
(`dev` = federate-dev build + standalone-watch dev server;
`start:standalone:dev` = the old single-step `start`). Update the
README's three-terminal block to whatever the current scripts actually
are. Don't trust memory; `cat packages/*/package.json | jq .scripts`
is authoritative.

**Step 4 — Demo flow walkthrough section.**

Add a new H2 *"Demo Flow"* between *Quick Start* and *Milestones*. The
30-second script for the recorded video:

1. With all three dev servers running, open `:4200`.
2. Calendar shows three meetings this week.
3. Click "Architecture Review" — Excalidraw renders a populated
   sketch, Mermaid editor renders the seeded sequence diagram. Right
   column fills in with title, time, attendees, and artifact
   timestamps. Bus Log shows `event:selected` and the two
   `context:request` rebroadcasts.
4. Edit the Mermaid source — bus log shows `diagram:changed` rows at
   ~500ms cadence; the Mermaid timestamp in Meeting Details ticks
   forward.
5. Open DevTools → Network panel, reload, filter by *.js — three
   distinct origins (`:4200`, `:3000`, `:4000`) load their respective
   bundles. *That's three frameworks, one workspace.*

**Step 5 — Mark M5 complete.**

`specs/SPEC.md` line 653: change `### [ ] M5 — Polish + Stretch` →
`### [x] M5 — Polish + Stretch`. (Note: the spec is currently in the
working tree as a modified file — confirm `git diff specs/SPEC.md`
before saving so unrelated edits don't leak in.)

`readme.md` Milestones list (lines 108–112): all five `- [x]`.

**Step 6 — Run the demo flow as the acceptance gate.**

This task's acceptance is empirical, not automated. Run through the
demo-flow walkthrough end-to-end with cleared LocalStorage. If any
step fails or surfaces a console error, fix the underlying issue (or
file it as a follow-on if out of scope) — *don't* loosen the
walkthrough to match a broken state.

### Key Discoveries

- **`readme.md` is canonical lowercase.** The repo file is
  `readme.md`, not `README.md` — `find` / `git` are case-sensitive.
  Keep the existing case; don't introduce a second file.
- **`specs/SPEC.md` is currently modified in the working tree.**
  `git status` shows it dirty at session start. Inspect the diff
  before adding the M5 checkbox flip — the modification may already
  contain the flip, or unrelated edits.
- **Schedule-X dates are this-week-relative.** A reader cloning the
  repo months from now still sees a populated calendar. Worth calling
  out in the README as a friendliness note (one sentence in Quick
  Start: *"Sample meetings are placed Mon/Tue/Wed of the current week
  by `seed.ts`."*).
- **Money-Shot is now a real PNG.** Once T15's walkthrough succeeds,
  capture the screenshot or 30-second clip described in the spec's
  Money-Shot section. The README's `LabNotebook.png` reference at
  line 9 can stay; if a better Frankenstein-Meeting-Room.png is
  produced, swap the reference. Not strictly part of T15 acceptance —
  the spec's Money-Shot is editorial, the task's gate is the
  walkthrough running clean.
- **Dev.to series state.** Line 19 references "Part 1 published". If
  more parts are out by the time T15 lands, update the link or pluralize
  to "Dev.to series — see latest". Don't *create* new posts as part
  of this task; this is a code repo, not a publishing pipeline.

### Acceptance

- **T15-AC-01** — `readme.md` Status block reflects M1–M5 all done;
  Milestones list shows five `- [x]` lines; Demo Flow H2 section
  present and matches Step 4's script.
- **T15-AC-02** — Quick Start commands (`pnpm --filter <pkg> <script>`)
  match each package's actual `package.json` scripts. Manually copy-
  paste each command from the README into a fresh terminal — all
  three commands boot their respective dev servers.
- **T15-AC-03** — `specs/SPEC.md` line 653 reads
  `### [x] M5 — Polish + Stretch`. `git diff specs/SPEC.md` shows
  only intentional edits (the checkbox flip plus any pre-existing
  working-tree edits the agent confirms keeping).
- **T15-AC-04** — **Demo flow runs clean.** With cleared LocalStorage
  and all three dev servers up, the five-step walkthrough completes
  with no console errors and matches the README copy. Recordable as a
  single ~30s clip without re-takes.

### Key Locations

- `readme.md` (modified — Status, Quick Start sanity, new Demo Flow
  section, Milestones)
- `specs/SPEC.md` (modified — M5 checkbox)

---

## Cross-Cutting Acceptance

- **XC-01** — **Money-Shot recordable.** With cleared LocalStorage and
  all three dev servers running, a single click on Architecture Review
  produces the spec's Money-Shot frame: Angular calendar (Angular
  chip) on the left; populated Excalidraw (React chip) and rendered
  Mermaid SVG (Svelte chip) in the middle; Meeting Details (Angular
  chip) showing populated artifact timestamps + Bus Log (Angular chip)
  with `event:selected` + two `context:request` rebroadcasts on the
  right; footer legend at the bottom. DevTools Network panel
  filterable to three framework bundles loaded from three distinct
  origins. **Touches:** T12, T13, T14.

- **XC-02** — **All five host panels share one chrome contract.** Same
  panel-header height, same chip-right slot, same 1px trennlinie. No
  panel renders without `<app-panel-header>`. Adding a future panel
  means adding the wrapper — the contract is structural, not stylistic.
  **Touches:** T13, T14 (Meeting Details rows live inside the
  panel-header'd card).
