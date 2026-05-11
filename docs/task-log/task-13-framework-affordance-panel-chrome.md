# Task 13 — Framework Affordance: panel chrome + chips + footer + standalone mirrors

### Task
Wrap all five host panels with a single `<app-panel-header>`
component (title + framework chip), add the chrome that turns
the demoable prototype into a recordable demo (page background,
card-shadows, brand stripe, footer with attribution + links),
and mirror the chip header into the two standalone `index.html`
shells. Expanded in-session beyond the plan: lab-notebook-
inspired cards-on-page treatment, top-header restyle with
Native Federation link, GitHub + personal-site footer links,
external-link icon on remote panels (URL pulled from the
federation manifest, not hardcoded), Mermaid textarea tint,
centered empty-state placeholders.

### Status
DONE — `pnpm -F shell exec tsc --noEmit` exits 0 after each
iteration. User-confirmed visually across multiple screenshots:
Money-Shot recordable, all five chips visible, three-band brand
stripe under top header, card-on-page treatment landed, both
standalone mirrors render their chip, federated mermaid textarea
shows the Svelte tint after `build:federate:dev`, external-link
icon appears on Whiteboard + Mermaid panels and resolves to the
manifest-derived origin, empty-state placeholders centered in
all four panels.

### Files Modified

- `packages/shell/src/app/panel-header.ts` (new) — standalone
  Angular component. `input.required<string>('title')` +
  `input.required<Framework>('framework')` +
  `input<string | null>('standaloneUrl', null)`. Brand-color
  SVGs (Angular/React/Svelte) inlined as constants, trusted
  once via `DomSanitizer.bypassSecurityTrustHtml` and cached as
  `SafeHtml`. Brand colors `#DD0031`/`#61DAFB`/`#FF3E00`; bg
  tints `rgba(…, 0.05–0.12)` (cyan needs higher alpha).
- `packages/shell/src/app/panel-header.html` (new) — title-row
  (title + optional external-link icon) on the left, framework
  chip on the right. `--chip-color` + `--chip-bg` set inline
  on `.header`. Conditional `<a target="_blank">` with Feather
  external-link SVG when `standaloneUrl` is non-null.
- `packages/shell/src/app/panel-header.css` (new) — uniform
  36px height (`--panel-header-h`), chip with brand-color
  border + text, external-link icon hover bumps color to the
  framework brand-color via `var(--chip-color)`.
- `packages/shell/src/app/app.html` (modified) — top header
  becomes serif `<h1>` + italic subtitle with **Native
  Federation** as a styled link; footer expanded from a single
  legend line to legend + `Source on GitHub` + `created by
  lutzleonhardt.de`.
- `packages/shell/src/app/app.css` (modified) — major chrome
  pass: `--footer-h` + `--card-shadow` + parchment `--page-bg`
  custom props; serif `.brand` + italic `.subtitle` with
  dotted-underline link styling; 3-band brand stripe via
  `header::after` linear-gradient (Angular red 0–33.33% →
  React cyan 33.33–66.66% → Svelte orange 66.66–100%); grid
  layout switched to `padding: 0.5rem` + `gap: 0.5rem` with
  `minmax(0, 1fr) minmax(0, 2fr) minmax(0, 1fr)` columns;
  trennlinien removed (cards-on-page replaces them); footer
  link styling matches subtitle.
- `packages/shell/src/app/calendar.{ts,html,css}` (modified)
  — wrap `<sx-calendar>` with `<app-panel-header
  title="Calendar" framework="angular">`; `:host` is now
  `display: flex; flex-direction: column` with white card bg,
  `border-radius: 6px`, `box-shadow: var(--card-shadow)`,
  `overflow: hidden`; sx-calendar takes `flex: 1`.
- `packages/shell/src/app/whiteboard-slot.{ts,html,css}`
  (modified) — wrap with panel-header (React);
  `loadRemoteModule('whiteboard', './Bootstrap').then(...)`
  now also reads
  `loader.adapters.remoteInfoRepo.tryGet('whiteboard').get()?
  .scopeUrl` and pushes it into `standaloneUrl` signal.
  `[standaloneUrl]="standaloneUrl()"` bound on the header.
  `:host` flex-column white card; `.remote-mount` and
  `.placeholder` flex: 1.
- `packages/shell/src/app/mermaid-slot.{ts,html,css}`
  (modified) — mirror of whiteboard-slot; framework `"svelte"`,
  title `"Mermaid Editor"`.
- `packages/shell/src/app/meeting-details.{ts,html,css}`
  (modified) — wrap with panel-header (Angular); existing
  content moved into a `<div class="body">` so the header sits
  flush at the panel's top edge. `:host` white card. `.empty`
  placeholder gets `height: 100%` + flex-center for symmetry
  with slot placeholders.
- `packages/shell/src/app/bus-log.{ts,html,css}` (modified)
  — wrap with panel-header (Angular); inline `<h2
  class="header">Event Bus Log</h2>` dropped (would have
  duplicated). List moved into `.body` wrapper. `.empty`
  placeholder gets `flex: 1` + flex-center (body is flex-column
  here, so flex:1 instead of height:100%).
- `packages/whiteboard/public/index.html` (modified) — static
  40px `<header class="standalone-header">` with React chip +
  "Whiteboard" title above `#root`. Self-contained `<style>`
  block, inline SVG, no JS.
- `packages/mermaid/public/index.html` (modified) — mirror
  shape with Svelte chip + "Mermaid Editor" title.
- `packages/mermaid/src/MermaidEditor.svelte` (modified) —
  textarea bg `rgba(255, 62, 0, 0.05)` + monospace stack +
  rounded border + Svelte-orange focus outline. Applies to
  both standalone and federated (after federate-rebuild).

### Files Read (Context Only)

- `docs/plans/m5-polish-and-stretch.md` — preamble + Task 13
  block. Adopted AC IDs verbatim. Plan offered (A) inline SVG
  vs (B) shared `packages/shared/assets/` — went with (A).
  Plan offered (i) per-panel imports vs (ii) content
  projection — went with (i). Plan's "1px column trennlinien"
  recommendation evolved into the cards-on-page treatment
  after the user accepted the LabNotebook-inspired direction.
- `docs/task-log/task-12-curated-seed-data.md` — predecessor.
  Confirmed: all three meetings ship pre-filled (T13's chrome
  lands on populated content every click); `@frankenstein/
  shared` stays zero-dep; uncommitted `specs/SPEC.md` from
  T12 hygiene continues into T13 (exclude on `/commit 13`).
- `specs/LabNotebook.png` — user-shared design sketch. Three
  ideas borrowed: card-on-page layout (white panels floating
  on a warm parchment page), serif top title with subtitle,
  framework-tinted panel headers. Three ideas rejected:
  handwritten fonts (gimmicky in live UI), red pins/sticky
  notes (themepark), pergament bg behind panels (would clash
  with Excalidraw's white canvas).
- `packages/shell/src/app/{app.html, app.css}` plus all five
  panel `.{ts,html,css}` files — current state before chrome
  pass.
- `packages/{whiteboard,mermaid}/public/index.html` — bare
  `<div id="root">` shells before chip mirror.
- `packages/mermaid/src/{MermaidEditor.svelte,
  mermaid-remote.svelte.ts}` — to understand the federate CSS
  sidecar (`mermaid-editor.css` link injected into head per
  T10) and why bg changes to the Svelte component don't
  reach the host until federate-rebuild.
- `packages/mermaid/package.json` — for `build:federate:dev`
  script.
- `packages/shell/public/federation.manifest.json` — confirmed
  manifest shape: `Record<RemoteName, RemoteEntryUrl>`.
- `node_modules/.pnpm/@softarc+native-federation-orchestrator
  @4.0.0/.../types/lib/**` — `DrivingContract.remoteInfoRepo`
  (`ForRemoteInfoStorage`), `RemoteInfo.scopeUrl`,
  `Optional<T>` API (`.get(): T | undefined`). Confirmed the
  orchestrator-API path was viable.

### Key Decisions

1. **Path (A) inline-SVG constants over path (B) shared
   assets package.** Plan offered both. Path A keeps
   `@frankenstein/shared` zero-dep, avoids Angular `assets`
   glob plumbing, and lets the standalone `index.html` mirrors
   inline the same SVG body without an import. SVGs are tiny
   (~1KB each); revisit only if a future asset balloons past
   ~3KB.

2. **Path (i) per-panel imports over (ii) content
   projection.** Each panel component imports `PanelHeader`
   and renders it at the top of its own template. Preserves
   the `:host { height: 100% }` contract that the slot CSS
   recipe (T8/T11) depends on. Bus-log's inline
   `<h2 class="header">` was dropped — would have shown the
   title twice.

3. **`.body` wrapper inside meeting-details and bus-log** to
   keep panel-header flush at the panel's top edge. Both
   originally had `:host { padding: 0.75rem 1rem }`. Moving
   padding to `.body` was cleaner than negative-margin on the
   header.

4. **Cards-on-page instead of 1px trennlinien.** Plan
   recommended `border-right` on `.col-left`/`.col-mid` plus
   `border-top` on lower stacked panels. User asked to take
   visual cues from `LabNotebook.png`. Final design: parchment
   page bg `#faf6ee`, `0.5rem` padding + `0.5rem` grid-gap,
   each panel host is white-card with `border-radius: 6px` +
   `box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06)`. Cols
   switched to `overflow: visible` so shadows render;
   `.layout` keeps `overflow: hidden` to clip at viewport.
   Architectural separation purpose is preserved — the visual
   mechanism just shifted from rigid line to floating card.

5. **Brand-tinted panel headers via CSS custom properties.**
   `--chip-color` + `--chip-bg` set inline on `.header` from
   the PanelHeader component (`[style.--chip-color]` +
   `[style.--chip-bg]`). Cyan got 12% alpha vs 5–6% for red/
   orange — cyan reads lighter at equal opacity, so equal
   visual weight needed more.

6. **3-band brand stripe under top header.** User flagged the
   restyled top header as "a bit anonymous". Solution: 3px
   `header::after` with linear-gradient and hard color stops
   at 33.33% / 66.66% — strong "three frameworks" signal
   without text or extra DOM. Sits flush on the bottom
   border (`bottom: -1px`) so it reads as part of the chrome.

7. **Native Federation moved from footer-only to top-header
   subtitle.** User's framing: this *is* a Native Federation
   demo, the framework architecture is the headline. Subtitle
   now reads *"A **Native Federation** demo · three
   frameworks · one event bus · host owns context"*. NF
   styled as a link to `native-federation.com`. Footer's
   existing "Built with … via Native Federation" preserved —
   different surface, not redundant.

8. **Footer expanded with `Source on GitHub` +
   `lutzleonhardt.de`.** User request. GitHub URL pulled from
   `git remote -v` (`git@github.com:lutzleonhardt/Frankenstein
   MeetingRoom.git`). Personal site uses bare
   `https://lutzleonhardt.de`. All external links get
   `target="_blank" rel="noopener noreferrer"`.

9. **External-link icon next to remote-panel titles.** User
   wanted a way to open the standalone version in a new tab.
   Solution: small Feather/Heroicons external-link SVG (12px)
   between title and chip inside `panel-header.html`. Only
   renders when `standaloneUrl` input is non-null (Angular
   panels never see the icon). Hover bumps color to the
   framework brand-color via `var(--chip-color)`. Tooltip
   `"Öffne das Remote als eigenständige App"` per user spec;
   `aria-label` identical for screen readers.

10. **Standalone URL sourced from the federation
    orchestrator, not hardcoded.** First pass hardcoded
    `http://localhost:3000` / `:4000`. User pushed back:
    derive from the manifest. Two viable paths:
    - (a) Re-fetch `federation.manifest.json` in an Angular
      service and cache.
    - (b) Read the orchestrator's already-loaded info:
      `loader.adapters.remoteInfoRepo.tryGet(name).get()?
      .scopeUrl` after `loadRemoteModule` resolves.
    Chose (b) — no extra HTTP call, single source of truth
    (the orchestrator), and the URL is only set when the
    remote has loaded successfully (load-failure correctly
    suppresses the icon). Trade-off: depends on a public-but-
    detailed adapter contract (`DrivingContract.
    remoteInfoRepo`). If a future orchestrator version
    renames the port, this needs a touch. Acceptable for a
    demo project.

11. **Mermaid textarea bg tint requires `pnpm -F mermaid
    build:federate:dev`.** User observed the orange tint
    applied in standalone (`:4000`) but not in the federated
    host (`:4200`). Root cause: T10 established that the
    Svelte component's scoped CSS is emitted into a stable
    `mermaid-editor.css` sidecar at federate-build time, and
    the custom element injects a `<link>` to that file once
    per document. The host loads the cached file from the
    last build, not the live source. Fix is a one-liner
    rebuild. Documented as a DX trap to revisit if it
    bites too often (a `--watch` mode on the federate build
    would be the proper polish).

12. **Centered `.empty` placeholders in meeting-details +
    bus-log.** User flagged asymmetry: slot placeholders
    (Whiteboard, Mermaid) were flex-centered, but
    meeting-details and bus-log placeholders sat top-left.
    Fix: target `.empty` with flex-center, with two slightly
    different shapes depending on parent layout.
    - meeting-details `.body` is block (`overflow: auto`),
      so `.empty { height: 100%; display: flex; ... }`.
    - bus-log `.body` is `display: flex; flex-direction:
      column`, so `.empty { flex: 1; display: flex; ... }`.
    Same visual result; couldn't unify because the parents
    are structurally different.

### Test Evidence

- **Type-check** — `pnpm -F shell exec tsc --noEmit -p
  tsconfig.json` exits 0 after each iteration (post-base
  panel-header wrap; post-tint+stripe+footer links;
  post-NF subtitle link; post-external-link icon
  hardcoded; post-standalone-URL via manifest;
  post-centered-placeholders). T13-AC-01 covered for the
  TS surface.

- **Federate rebuild** — `pnpm -F mermaid build:federate:dev`
  exits with `Mermaid federate build complete.` after the
  textarea tint change. User confirmed orange tint visible
  in `:4200` mermaid panel after browser refresh.

- **Browser verification by user (`:4200` with `:3000` +
  `:4000` running)** across multiple iterations:
  - After initial panel-header wrap: five chips visible
    with correct brand colors + same height; calendar /
    meeting-details / bus-log show Angular red, whiteboard
    React cyan, mermaid Svelte orange. **T13-AC-02 ✓ /
    T13-AC-03 ✓**.
  - After cards-on-page treatment: parchment page bg
    visible, white cards with subtle shadow, no 1px
    trennlinien. **T13-AC-04 ✓ (with deviation — see
    Decision 4)**.
  - After footer expansion: link cluster visible at bottom,
    legend text exact-match preserved. Browser dev-tools
    confirmed `target="_blank"` and `rel="noopener
    noreferrer"` on all three links. **T13-AC-05 ✓**.
  - After standalone-URL wiring: external-link icon
    appears in Whiteboard + Mermaid headers after remote
    bundles load. Hover tooltip shows German text. Click
    opens new tab to `http://localhost:3000/` /
    `http://localhost:4000/`. **T13-AC-06 ✓**.
  - After centered-placeholders: Whiteboard / Mermaid /
    Meeting Details / Bus Log placeholders all centered in
    both axes when no meeting is selected. Visual
    symmetry confirmed in user screenshot.
  - Money-Shot recordable: with `Architecture Review`
    selected, the screenshot shows all five chips, Angular
    calendar + populated middle column + meeting-details +
    bus log, brand stripe under the top header, footer
    legend with links. **T13-AC-07 ✓**.

- **`pnpm -F shell build` not exercised this session** —
  same Angular CLI sandbox cache-write hang documented in
  T11/T12 open issues. The user's browser-boot path covers
  the same compiler surface; `tsc --noEmit` covers the TS
  type surface.

### Acceptance Coverage

(IDs from `docs/plans/m5-polish-and-stretch.md` Task 13
§Acceptance.)

- **T13-AC-01** — `pnpm -F shell build` completes —
  `partial`. TS surface verified via `tsc --noEmit` exit 0
  after every iteration. Full `ng build` pipeline still
  hangs in sandbox per T11 open issue; user runs the
  equivalent compile pass via `pnpm -F shell start` outside
  the sandbox.
- **T13-AC-02** — Five panel headers w/ brand chips
  + correct colors — `passed`. User-confirmed.
- **T13-AC-03** — Equal panel-header heights — `passed`.
  Uniform 36px enforced by `--panel-header-h` on the shared
  PanelHeader component.
- **T13-AC-04** — Column + stacked trennlinien — `passed`
  with deviation. Plan asked for 1px borders; final design
  uses cards-on-page (padding+gap+shadow+parchment bg) per
  Decision 4. Same architectural separation purpose, more
  polished visual.
- **T13-AC-05** — Footer text + viewport fit — `passed`.
  Exact-match text preserved, plus three link clusters
  added per user follow-up. Layout fits at 1280px width.
- **T13-AC-06** — Standalone chip mirrors at `:3000` /
  `:4000` — `passed`. Both `public/index.html` files have
  the static header with framework chip + title above
  `#root`. Excalidraw / Mermaid regression unchanged (T7/
  T9/T10 surfaces not touched in this task).
- **T13-AC-07** — Money-Shot recordable — `passed`. User
  screenshots across iterations confirmed all five chips
  visible, populated content on Architecture Review, brand
  stripe + footer legend + DevTools network filterable to
  three framework bundles.

### Open Issues

- **Mermaid empty-source parse error in panel body** —
  carried forward from T12. Not addressed in T13 (out of
  scope). Cheap follow-on: guard the `mermaid.render()`
  call in `packages/mermaid/src/MermaidEditor.svelte` and
  show a "Type to start diagramming…" placeholder when
  source is empty/whitespace.
- **Federate-build is one-shot at dev-server start.**
  Changes to mermaid/whiteboard sources require an explicit
  `pnpm -F <pkg> build:federate:dev` before the host sees
  them. Documented as a DX caveat. A `--watch` mode on the
  federate build, or a top-level watcher that re-runs it on
  source changes, would be a separate small task.
- **`specs/SPEC.md` has uncommitted in-progress edits from
  pre-T12.** Continues T12 hygiene: `/commit 13` must
  exclude `specs/SPEC.md` from the staging list.
- **External-link tooltip is German-only.** "Öffne das
  Remote als eigenständige App" per user spec. If i18n
  lands later, this needs a translation key.
- **No graceful fallback if a standalone dev server isn't
  running.** Clicking the external-link icon when the
  remote's standalone server isn't up shows a browser
  connection error. Tooltip makes intent clear, but a HEAD-
  ping that hides the icon when the URL is unreachable
  would be more polished. Out of scope for T13.
- **Adapter-API coupling.** `loader.adapters.remoteInfoRepo.
  tryGet(name).get()?.scopeUrl` reaches into a detailed
  orchestrator port. If a future
  `@softarc/native-federation-orchestrator` major bump
  renames `DrivingContract` ports, this needs a touch.

### Context for Next Task

T14 (Integration Moment 5 — artifact metadata in Meeting
Details) is the next consumer. Relevant state after T13:

- **`<app-panel-header>` is the only chrome contract.** T14
  changes happen inside `meeting-details.html`'s `<div
  class="body">` wrapper. No panel-header changes needed
  unless T14 wants header-level affordances (e.g. a status
  pill next to the chip), in which case extend the
  PanelHeader API rather than duplicating per-panel HTML.
- **`.body` wrapper pattern.** meeting-details and bus-log
  share the `<div class="body">` convention that owns
  padding + scroll. T14's "Whiteboard last changed" /
  "Mermaid last changed" rows live inside that wrapper.
- **Brand colors as constants.** `#DD0031` / `#61DAFB` /
  `#FF3E00` defined as `COLORS` in `panel-header.ts`. If
  T14 wants to color-code metadata rows by framework
  (e.g. small framework chip prefix on each row), import
  from there or duplicate the literals — both fine for a
  demo.
- **`MeetingService.currentMeeting()` is unchanged.**
  `excalidrawUpdatedAt` / `mermaidUpdatedAt` already
  populated by `applyDrawingChange` / `applyDiagramChange`
  since M2 Task 6. T14 just consumes them. T12 ships seed
  meetings with both timestamps equal to `start` — fine for
  relative-time rendering.
- **`--card-shadow` and `--page-bg` are baseline.** Defined
  on app's `:host`. T14 should not introduce new background
  colors; metadata pills can use neutral grey or framework
  brand colors for accent only.
- **External-link icon mechanism is reusable.** PanelHeader
  takes `standaloneUrl: string | null` and conditionally
  renders the icon. If T14's metadata rows need a similar
  external-link affordance, the SVG path + CSS class is
  already in panel-header — extract to a shared template
  or component if it gets reused beyond panel headers.
- **Centered-placeholder pattern.** `.empty { height: 100%
  || flex: 1; display: flex; align-items: center;
  justify-content: center; text-align: center }`. T14's
  "no meeting selected" pathway in meeting-details already
  uses it; T14 won't need to touch the empty state.

### Git State

```
git diff --stat
 packages/mermaid/public/index.html          |  45 ++++++++++-
 packages/mermaid/src/MermaidEditor.svelte   |  17 +++-
 packages/shell/src/app/app.css              | 115 ++++++++++++++++++++++------
 packages/shell/src/app/app.html             |  13 +++-
 packages/shell/src/app/bus-log.css          |  24 ++++--
 packages/shell/src/app/bus-log.html         |  31 ++++----
 packages/shell/src/app/bus-log.ts           |   3 +-
 packages/shell/src/app/calendar.css         |   9 ++-
 packages/shell/src/app/calendar.html        |   1 +
 packages/shell/src/app/calendar.ts          |   3 +-
 packages/shell/src/app/meeting-details.css  |  20 ++++-
 packages/shell/src/app/meeting-details.html |  21 ++---
 packages/shell/src/app/meeting-details.ts   |   3 +-
 packages/shell/src/app/mermaid-slot.css     |  14 ++--
 packages/shell/src/app/mermaid-slot.html    |   1 +
 packages/shell/src/app/mermaid-slot.ts      |  12 ++-
 packages/shell/src/app/whiteboard-slot.css  |  14 ++--
 packages/shell/src/app/whiteboard-slot.html |   1 +
 packages/shell/src/app/whiteboard-slot.ts   |  12 ++-
 packages/whiteboard/public/index.html       |  49 +++++++++++-
 specs/SPEC.md                               |  25 ++++++

git status --short
 M packages/mermaid/public/index.html
 M packages/mermaid/src/MermaidEditor.svelte
 M packages/shell/src/app/app.css
 M packages/shell/src/app/app.html
 M packages/shell/src/app/bus-log.css
 M packages/shell/src/app/bus-log.html
 M packages/shell/src/app/bus-log.ts
 M packages/shell/src/app/calendar.css
 M packages/shell/src/app/calendar.html
 M packages/shell/src/app/calendar.ts
 M packages/shell/src/app/meeting-details.css
 M packages/shell/src/app/meeting-details.html
 M packages/shell/src/app/meeting-details.ts
 M packages/shell/src/app/mermaid-slot.css
 M packages/shell/src/app/mermaid-slot.html
 M packages/shell/src/app/mermaid-slot.ts
 M packages/shell/src/app/whiteboard-slot.css
 M packages/shell/src/app/whiteboard-slot.html
 M packages/shell/src/app/whiteboard-slot.ts
 M packages/whiteboard/public/index.html
 M specs/SPEC.md
?? packages/shell/src/app/panel-header.css
?? packages/shell/src/app/panel-header.html
?? packages/shell/src/app/panel-header.ts
?? docs/task-log/task-13-framework-affordance-panel-chrome.md
```

Stage on `/commit 13`: all `M packages/{shell,whiteboard,
mermaid}` files + the three new `panel-header.*` files + this
log. Do **not** stage `specs/SPEC.md` — pre-T12 uncommitted
edits unrelated to T13's scope.
