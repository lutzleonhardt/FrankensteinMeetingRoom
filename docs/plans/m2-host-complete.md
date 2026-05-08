# M2 — Host Complete: Calendar + State + Layout + Bus Log

**Spec:** `specs/SPEC.md`, Milestone M2.

**Builds on:** M1 (`docs/plans/m1-workspace-and-host-skeleton.md`,
task logs `task-1`, `task-2`). Workspace, `@frankenstein/shared` (bus,
types, **seed already populated with 3 sample meetings in the current
ISO week**), and the Angular 21 shell with Native Federation v4
dynamic-host on `:4200` are all live. Angular 21 file convention: no
`.component` filename suffix (`app.ts`, `app.html`); class is `App`.

**Scope.** Land the entire host UI: three-column layout with a
viewport gate, weekly Schedule-X calendar wired to the bus,
`MeetingService` with Signals + LocalStorage persistence, Meeting
Details card, and the Event Bus Log. **No remotes** — M3/M4 add those.

**M2 artifact (success criterion).** `:4200` shows the three-column
layout: weekly Schedule-X calendar with three seeded meetings on the
left, two empty middle slots with "Pick a meeting" placeholders, and a
right column with Meeting Details on top and the Event Bus Log below.
Clicking a meeting fills the details card and pushes an `event:selected`
row into the bus log. Manually firing a `drawing:changed` for the
selected meeting from DevTools persists into LocalStorage and survives
reload. Below 1280 px viewport width the page renders a single
"Best viewed on desktop" message.

**Schedule-X facts (carried into Tasks 2 + 4):**
- Packages: `@schedule-x/angular`, `@schedule-x/calendar`,
  `@schedule-x/theme-default`, plus `@preact/signals`, `preact`,
  `temporal-polyfill` (pnpm needs the lot listed explicitly).
- Events use `Temporal.ZonedDateTime` for `start`/`end`,
  **not ISO strings**. Convert at the calendar boundary; persistence
  stays ISO per spec.
- `<sx-calendar [calendarApp]="calendarApp">` with
  `createCalendar({ events, views: [createViewWeek()],
  callbacks: { onEventClick(e) {...} } })`.
- The wrapper element needs explicit `width`/`height` CSS (the docs
  use a fixed `1200×800`; in a grid cell use `100% / 100%`).

## Flexibility Clause

The executing agent may adjust scope and ordering based on more
up-to-date context discovered during implementation, as long as each
task still satisfies the sizing rules.

When a task is finished (DONE or BLOCKED), close it with the
`/wrap-up N` → `/commit N` pair. `/wrap-up N` writes or extends
`docs/task-log/task-{N}-{slug}.md` and is safe to run multiple times
across sessions — it merges. `/commit N` reads that log, stages code +
summary, and commits them together after showing the plan and waiting
for confirmation. Optionally run `/review` (quick per-task, full before
a PR) between wrap-up and commit; a second `/wrap-up N` can absorb the
review findings.

---

## Task 1: Three-column layout shell + viewport gate

### Instructions

Replace the M1 placeholder `<header>` body with the M2 layout
scaffolding. No services, no Schedule-X, no bus subscriptions yet —
just the boxes, the placeholders, and the desktop-only gate.

**Layout (≥ 1280 px viewport).** CSS Grid filling the viewport under
the existing `<header>`:

- `grid-template-columns: 25% 50% 25%`.
- Left column: a single empty box reserved for the calendar (Task 2).
- Middle column: vertically split (`grid-template-rows: 1fr 1fr`),
  each cell renders a centered "Pick a meeting" placeholder.
- Right column: vertically split, top cell is a "Meeting Details"
  placeholder card (replaced in Task 4), bottom cell is an
  "Event Bus Log" placeholder card (replaced in Task 3).
- Total height fills `100vh` minus the existing `<header>`. Use
  `min-height: 0` on grid children so children with their own
  scrollable content (later: bus log) don't blow out the layout.

**Viewport gate (< 1280 px).** Pure-CSS swap via media query: hide the
grid, show a centered "Best viewed on desktop" message. No JS, no
window-resize listeners. Three lines of CSS.

**Header.** The existing `<header>Frankenstein Meeting Room</header>`
stays; tighten its styling only if needed to give the layout the rest
of the viewport.

**Implementation choice.** Either inline everything in `app.ts` /
`app.html` / `app.css`, or extract a `LayoutComponent`
(`layout.ts/.html/.css`) and use it from `App`. Either works for M2;
extract only if `app.html` would otherwise exceed ~40 lines.

### Key Discoveries

- **Three-column grid is fixed** — no responsive breakpoints inside
  it. Spec explicitly out-of-scopes mobile responsive (line 651).
  Tablet landscape may degrade gracefully but is not actively tested.
- **Placeholders are throwaway DOM.** Task 2 replaces the left box
  with `<app-calendar>`, Task 3 replaces the right-bottom box with
  `<app-bus-log>`, Task 4 replaces the right-top box with
  `<app-meeting-details>`. The middle two cells stay as "Pick a
  meeting" placeholders all the way through M2 — they become the
  whiteboard / mermaid Custom Element slots in M3 / M4.
- **Existing `App` class is empty by design** (M1 Task 2 wrap-up).
  Add `imports: [...]` only when bringing in child components.

### Acceptance

- `pnpm -F shell start` boots clean on `:4200`.
- Page shows the existing header plus the three-column grid: empty
  left box, two stacked placeholder cells in the middle ("Pick a
  meeting"), two stacked placeholder cards on the right ("Meeting
  Details", "Event Bus Log").
- Resizing the browser below 1280 px swaps to a centered "Best viewed
  on desktop" message; resizing back up restores the grid.
- DevTools console clean (no errors, no new warnings beyond the M1
  baseline).
- `pnpm -F shell build` completes successfully.

### Key Locations

- `packages/shell/src/app/app.ts`
- `packages/shell/src/app/app.html`
- `packages/shell/src/app/app.css`
- (optional) `packages/shell/src/app/layout.ts/.html/.css`
- `packages/shell/src/styles.css` (only if a global tweak is needed)

---

## Task 2: Schedule-X weekly calendar + click emits `event:selected` to bus

**Depends on Task 1** (needs the left-column slot to drop into).

### Instructions

Install Schedule-X, render a weekly calendar with the three seeded
meetings in the left column, and wire `onEventClick` to emit
`event:selected` directly to the shared bus. **No `MeetingService`
yet** — the direct emit is a temporary architectural shortcut so
Task 3 (Bus Log) has something visible to display. Task 4 refactors
this to route through the service.

**Install dependencies (from repo root):**

```bash
pnpm -F shell add @schedule-x/angular @schedule-x/calendar @schedule-x/theme-default \
  @preact/signals preact temporal-polyfill
```

**Calendar component (`packages/shell/src/app/calendar.ts/.html/.css`).**

- Standalone component, selector `app-calendar`. Imports
  `CalendarComponent` from `@schedule-x/angular`, `createCalendar` and
  `createViewWeek` from `@schedule-x/calendar`.
- Top-of-file side-effect import: `import 'temporal-polyfill/global'`
  (or hoist to `main.ts` if more consumers appear later).
- Theme CSS is **not** imported per-component (Angular's view
  encapsulation drops it). Import once globally — either via
  `styles.css` (`@import '@schedule-x/theme-default/dist/index.css';`)
  or via the `styles` array in `angular.json`.
- Import `seed` directly from `@frankenstein/shared/seed`. Map each
  `Meeting` to a Schedule-X event:

  ```ts
  const tz = Temporal.Now.timeZoneId();
  const toSx = (m: Meeting) => ({
    id: m.id,
    title: m.title,
    start: Temporal.Instant.from(m.start).toZonedDateTimeISO(tz),
    end:   Temporal.Instant.from(m.end).toZonedDateTimeISO(tz),
  });
  ```

  (`Temporal.ZonedDateTime.from(iso)` may reject an ISO string ending
  in `Z`; `Instant.from(...).toZonedDateTimeISO(tz)` is the safe path.)
- `createCalendar({ views: [createViewWeek()], events: seed.map(toSx),
  selectedDate: Temporal.Now.plainDateISO(),
  callbacks: { onEventClick: (e) => { ... } } })`.
- In `onEventClick`, look up the matching `Meeting` in `seed` by
  `e.id` (cast `e.id as string`; Schedule-X types it `string | number`)
  and dispatch:

  ```ts
  emit('event:selected', { meetingId: m.id, initialData: m });
  ```

  Add a one-line comment: `// TODO Task 4: route through MeetingService`.
- Template: `<sx-calendar [calendarApp]="calendarApp"></sx-calendar>`
  inside a wrapper `<div class="ng-calendar-wrapper">` styled with
  `width: 100%; height: 100%; min-height: 0;` (deviation from docs'
  fixed `1200×800` because we live in a grid cell).
- Drop `<app-calendar>` into the left column of the layout from
  Task 1, replacing the empty box.

### Key Discoveries

- **Schedule-X mandates Temporal.** Angular 21 / Node 22 don't ship
  native `Temporal` — `temporal-polyfill/global` is required. Top-of-
  file side-effect import in `calendar.ts` (or in `main.ts` before
  Angular bootstrap if multiple consumers appear).
- **Wrapper sizing.** Without explicit dimensions on the wrapper the
  calendar collapses to zero height. Use `100% / 100%` so the grid
  cell drives the size; do not copy the docs' fixed `1200×800`.
- **Theme CSS via global stylesheet.** Per-component CSS imports get
  scoped away by Angular's view encapsulation. Global import is the
  expected path.
- **Direct bus emit is a temporary shortcut.** The spec mandates that
  the service is the single broadcast point (line 110). Task 4
  refactors `onEventClick` to call `meetingService.selectMeeting(id)`
  and replaces `seed` import with `meetingService.meetings()`. Task
  ordering is deliberate: Task 3 needs *some* bus traffic to verify
  the log without standing up the full service yet.
- **`Meeting.id` is a string.** Schedule-X event ids are
  `string | number`; cast `e.id as string` rather than introspecting
  the original `Meeting` (round-trip the id so Task 4's refactor is
  a single-line change).
- **Federation & Schedule-X.** Schedule-X is a host-only dependency,
  never federated — the host owns the calendar. M3 / M4 don't touch
  this component.
- **pnpm peer deps.** Schedule-X's docs list `@preact/signals` +
  `preact` as required-for-pnpm (npm hoists transitively). Install
  both explicitly; do not rely on hoisting.
- **No event re-fetch on data change.** M2 has no UI to mutate
  meeting metadata (Create / Delete are M5 stretch). The calendar can
  read `seed` once at construction. Task 4 swaps `seed` for
  `meetingService.meetings()` but still reads once — re-fetch on
  signal change is M5 territory.

### Acceptance

- `pnpm -F shell start` on `:4200` shows the weekly calendar in the
  left column, current ISO week, three seeded events visible
  ("Architecture Review", "Sprint Retro", "Design Sync").
- In DevTools, run
  `frankensteinBus.addEventListener('event:selected', e => console.log(e.detail))`
  then click "Architecture Review" → log entry with
  `{ meetingId: 'meeting-architecture-review', initialData: {...} }`.
  Click another meeting → second log entry.
- DevTools console otherwise clean (no errors, no new warnings).
- `pnpm -F shell build` completes successfully.

### Key Locations

- `packages/shell/package.json`
- `packages/shell/src/app/calendar.ts`
- `packages/shell/src/app/calendar.html`
- `packages/shell/src/app/calendar.css`
- `packages/shell/src/app/app.html` (drop the new component into the
  left column)
- `packages/shell/src/styles.css` (theme CSS import) — or
  `packages/shell/angular.json` `styles` array if preferred

---

## Task 3: Event Bus Log component (right-bottom slot)

**Depends on Task 2** (needs `event:selected` traffic to verify).

### Instructions

Implement the right-bottom slot as a real Angular standalone
component that subscribes to all four bus events and renders the last
ten entries. Independently visible end-to-end: click a calendar event
in the left column and the row appears in the log immediately, with no
service in the middle.

**`bus-log.ts/.html/.css`.**

- Standalone Angular component, selector `app-bus-log`.
- State held in a single `signal<BusLogEntry[]>([])`. Type:

  ```ts
  type BusLogEntry = {
    name: 'context:request' | 'event:selected' | 'drawing:changed' | 'diagram:changed';
    payload: unknown;
    at: string;        // formatted HH:mm:ss
  };
  ```
- In the constructor, subscribe via `on(...)` from
  `@frankenstein/shared/bus` to **all four** events. Each handler
  appends a new entry to the front of the signal array and trims to
  ten. Push the returned `off()` callbacks onto a private array.
- Implement `ngOnDestroy` to call every stored `off()`. Defensive in
  practice (the host root component lives for the app's lifetime),
  but it sets the unsubscribe pattern that M3 / M4 remotes will
  mirror in their Custom Element `disconnectedCallback`.
- Template: a small header "Event Bus Log", then a `@for` loop over
  the signal. Each row renders `{at} {name}` plus a payload preview
  — `JSON.stringify(payload)` truncated to ~80 chars with an ellipsis
  if longer. Empty state: "Bus is quiet."
- Make the list scrollable inside the right-bottom card
  (`overflow: auto`, fixed parent height).
- Drop `<app-bus-log>` into the right-bottom slot of the layout from
  Task 1, replacing the placeholder.

### Key Discoveries

- **Bus log is in-memory only.** Spec says "last ~10 events" — no
  persistence. Don't write entries to LocalStorage; they reset on
  reload, by design. Cheap and matches the spec.
- **Subscriber lifecycle pattern.** Returning `off()` from `on(...)`
  and storing the unsubscribers in an array sets the convention that
  M3 / M4 remotes will follow in their Custom Element
  `disconnectedCallback`. Even if the host root never unmounts, the
  pattern is readable and consistent.
- **Generic subscriber, not calendar-coupled.** The log subscribes
  via `on(...)` to four event names only; it does not know about the
  calendar. Test this: in DevTools, fire
  `frankensteinBus.dispatchEvent(new CustomEvent('drawing:changed', { detail: { meetingId: 'x', excalidrawData: { elements: [] } } }))`
  and confirm a row appears even without any UI interaction. M3 / M4
  remotes plug into this same channel for free.
- **Bus log doubles as the seed for Integration Moment 6** ("Activity
  feed shows changes from remotes"). Don't over-design — M5 polish
  can add filtering / styling. Stay minimal.
- **No Schedule-X here.** The right column is pure Angular — no
  Temporal, no theme, no extra dependencies.
- **`@frankenstein/shared/bus` import path.** TS-source import; the
  bundle inlines its own copy of `bus.ts`, the singleton lives in
  `globalThis.frankensteinBus` (set via `??=`). Don't add the package
  to NF's `shared` block. (M1 Task 2 wrap-up has the full reasoning.)

### Acceptance

- Click a meeting in the calendar → a new `event:selected` row
  appears at the top of the bus log immediately, with the correct
  timestamp and payload preview. Click a different meeting → second
  row appears, first stays.
- Click a third / fourth / etc. meeting until the buffer fills past
  ten — oldest entries fall off; the list never exceeds ten rows.
- In DevTools, fire
  `frankensteinBus.dispatchEvent(new CustomEvent('drawing:changed', { detail: { meetingId: 'meeting-architecture-review', excalidrawData: { elements: [] } } }))`
  and
  `frankensteinBus.dispatchEvent(new CustomEvent('context:request', { detail: {} }))`
  → both rows appear (the second has no further effect since no
  service yet — Task 4 wires the response). Proves the log is a
  generic subscriber, not coupled to the calendar.
- Reload the page → bus log resets to empty state ("Bus is quiet.").
  Spec design — log is per-session.
- `pnpm -F shell build` completes successfully.

### Key Locations

- `packages/shell/src/app/bus-log.ts`
- `packages/shell/src/app/bus-log.html`
- `packages/shell/src/app/bus-log.css`
- `packages/shell/src/app/app.html` (drop the component into the
  right-bottom slot)

---

## Task 4: `MeetingService` + Meeting Details panel + route calendar through the service

**Depends on Tasks 2 + 3** (refactors the calendar's emit and
verifies via the bus log).

### Instructions

Land the full `MeetingService` per the spec, add the Meeting Details
component to the right-top slot, and refactor the calendar so its
click goes through the service instead of emitting to the bus
directly. End state: the host is demoable as a self-contained Angular
app — exactly the M2 artifact.

**`MeetingService` (`packages/shell/src/app/meeting.service.ts`).**

Implement exactly per `specs/SPEC.md` lines 113–164:

```ts
@Injectable({ providedIn: 'root' })
class MeetingService {
  readonly currentMeeting = signal<Meeting | null>(null);
  readonly meetings = signal<Meeting[]>([]);

  constructor() {
    this.meetings.set(this.loadAll());
    on('drawing:changed', (p) => this.applyDrawingChange(p));
    on('diagram:changed', (p) => this.applyDiagramChange(p));
    on('context:request', () => this.rebroadcastCurrent());
  }

  selectMeeting(id: string): void { /* per spec */ }
  // applyDrawingChange — stale-update guard; updates excalidrawData,
  //                     excalidrawUpdatedAt, updatedAt; persists.
  // applyDiagramChange — analogous for mermaidSource + mermaidUpdatedAt.
  // updateMeeting(id, mut): immutable map; if id matches currentMeeting,
  //                        re-set currentMeeting; persistAll().
  // rebroadcastCurrent(): re-emit event:selected for currentMeeting().
  // loadAll(): JSON.parse(localStorage.getItem('frankenstein:meetings')) ?? seed.
  // persistAll(): localStorage.setItem(..., JSON.stringify(this.meetings())).
}
```

- `providedIn: 'root'` — no entry needed in `app.config.ts`.
- Stash returned `off()` callbacks from `on(...)` for symmetry, even
  though a root service lives for the app lifetime.
- Bus payloads arrive `DeepReadonly<T>` (shared package typing) —
  copy before mutating into a `Meeting`.

**Meeting Details (`packages/shell/src/app/meeting-details.ts/.html/.css`).**

- Standalone component, selector `app-meeting-details`. Inject
  `MeetingService`.
- Template renders `currentMeeting()`: title, formatted `start` / `end`
  via `Intl.DateTimeFormat` (no extra dependency), comma-separated
  attendee list. Empty state when `currentMeeting()` is `null`:
  "Select a meeting from the calendar."
- **No editing UI.** Meeting metadata edit is explicit Out of Scope
  (spec line 651).
- Drop into the right-top slot of the layout, replacing the
  placeholder card.

**Refactor the calendar (Task 2 → Task 4 wiring).**

- Inject `MeetingService` into `calendar.ts`.
- `onEventClick(e)` body becomes:
  `meetingService.selectMeeting(e.id as string);`. The `// TODO Task
  4` comment is removed at the same time.
- The calendar's data source switches from `import { seed } from
  '@frankenstein/shared/seed'` to a single read of
  `meetingService.meetings()`. Re-fetch on signal change is **not**
  required in M2 (no UI mutates the list).
- Drop the unused `seed` import.

### Key Discoveries

- **`@frankenstein/shared` is a `devDependency`** (M1 Task 2 wrap-up
  + `federation.config.mjs` comment): the bus is a `globalThis`
  singleton, the package is TS source with no built artifact, types
  erase at runtime, and `workspace:*` has no version semantics for
  the orchestrator. Do not move it to `dependencies`.
- **Stale-update guard is load-bearing.** Both `applyDrawingChange`
  and `applyDiagramChange` start with
  `if (p.meetingId !== this.currentMeeting()?.id) return;`. Without
  this, a `drawing:changed` in flight from meeting A would silently
  land in meeting B's persisted state when the user switches mid-
  stream — the kind of race that never shows in dev but always shows
  in workshop Q&A.
- **Persistence is direct LocalStorage**, no Repository pattern (spec
  line 167 is explicit). Single entity (`Meeting`), domain shape
  equals storage shape.
- **Service is the single broadcast point.** Every entry path that
  mutates context (calendar click today; deep-link or hotkey later)
  goes through `selectMeeting` → state update + `event:selected`
  emit in the same call. Task 4's calendar refactor is what enforces
  this.
- **`context:request` boot pattern is wired in M2 already**, even
  though no remote will fire it until M3. Verifiable from DevTools:
  fire `frankensteinBus.dispatchEvent(new CustomEvent('context:request', { detail: {} }))`
  after selecting a meeting — service responds with a fresh
  `event:selected`, a new row appears in the bus log.
- **Initial seed.** `loadAll()` finds an empty LocalStorage on first
  boot and falls back to the imported `seed` constant. To re-seed
  during dev, clear the `frankenstein:meetings` key from DevTools >
  Application > LocalStorage. (Once seeded, the seed's
  `weekday(...)`-based ISO timestamps are frozen — the calendar
  won't drift to the new week unless you re-seed.)
- **`currentMeeting` is not persisted** by design. Reload returns to
  the empty state; only the meetings array is in LocalStorage.

### Acceptance

- Click a meeting in the calendar → bus log shows the
  `event:selected` row (still works, now via the service) **and**
  the right-top card fills with title, formatted start/end, attendee
  list. Click a second meeting → details swap, log gets a second
  row. Click a third → both update again.
- Reload page → details reset to empty state ("Select a meeting from
  the calendar."), bus log resets, LocalStorage `frankenstein:meetings`
  exists and equals the seed (3 entries, no `excalidrawUpdatedAt`).
- After selecting "Architecture Review", fire
  `frankensteinBus.dispatchEvent(new CustomEvent('drawing:changed', { detail: { meetingId: 'meeting-architecture-review', excalidrawData: { elements: [] } } }))`
  in DevTools. Bus log shows the row;
  LocalStorage `frankenstein:meetings`'s Architecture Review entry
  now has `excalidrawData`, `excalidrawUpdatedAt`, and a fresh
  `updatedAt`. Reload the page → LocalStorage still carries the
  change.
- Stale guard: with Architecture Review still selected, fire the same
  `drawing:changed` but with `meetingId: 'meeting-sprint-retro'`.
  LocalStorage's Sprint Retro entry is **not** modified (the bus log
  row still appears — it's a generic subscriber).
- Boot pattern: with a meeting selected, fire
  `frankensteinBus.dispatchEvent(new CustomEvent('context:request', { detail: {} }))`
  → service responds with a fresh `event:selected` (new row in the
  bus log).
- DevTools console clean. `pnpm -F shell build` completes.

### Key Locations

- `packages/shell/src/app/meeting.service.ts` (new)
- `packages/shell/src/app/meeting-details.ts` (new)
- `packages/shell/src/app/meeting-details.html` (new)
- `packages/shell/src/app/meeting-details.css` (new)
- `packages/shell/src/app/calendar.ts` (refactor `onEventClick` and
  data source)
- `packages/shell/src/app/app.html` (drop `<app-meeting-details>`
  into the right-top slot)
