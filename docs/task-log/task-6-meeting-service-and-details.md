# Task 6 — `MeetingService` + Meeting Details panel + route calendar through the service

### Task
Land the host-side state layer per spec lines 113–164: a root-provided
`MeetingService` with Signals + LocalStorage persistence and bus subscriptions;
a Meeting Details card in the right-top slot; and refactor the calendar so its
click goes through `selectMeeting()` instead of emitting `event:selected`
directly.

### Status
DONE

### Files Modified
- `packages/shell/src/app/meeting.service.ts` (new) — `@Injectable({ providedIn: 'root' })`, single `STORAGE_KEY = 'frankenstein:meetings'`. Source of truth is `_meetings: WritableSignal<Meeting[]>` + `_currentMeetingId: WritableSignal<string | null>`; public `meetings` is `_meetings.asReadonly()` and public `currentMeeting` is a `computed<Meeting | null>` derived via the private `findMeeting(id: string | null)` helper. `selectMeeting(id)` looks up via the same helper, sets `_currentMeetingId` and emits `event:selected`. `applyDrawingChange` / `applyDiagramChange` start with `p.meetingId !== this._currentMeetingId()` stale-update guards, then `structuredClone` (drawing) / direct copy (diagram) into a fresh `Meeting` via `updateMeeting(id, mut)` which `map`-updates the array, sets the signal, persists. `rebroadcastCurrent` re-emits `event:selected` for `context:request`. `loadAll` reads `JSON.parse(localStorage.getItem(...)) ?? seed`. Constructor checks `localStorage.getItem(STORAGE_KEY) !== null` *before* the hydrate; if storage was empty, calls `persistAll()` once after `_meetings.set(...)` so first-boot leaves the seed on disk (Task 6 Acceptance #2). `unsubscribers: Array<() => void>` for the three `on(...)` returns + matching `ngOnDestroy` cleanup; mirrors Task 5's `BusLog` pattern, defensive given the root service never unmounts but locks the shape that M3/M4 remotes will mirror in `disconnectedCallback`.
- `packages/shell/src/app/meeting-details.ts` (new) — standalone `MeetingDetails`, selector `app-meeting-details`, `inject(MeetingService)`. Re-exports the service's `currentMeeting` signal as `readonly meeting`; two `computed`s: `formattedRange` builds `"{weekday} {HH:mm} – {weekday} {HH:mm}"` via a module-level `Intl.DateTimeFormat(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })`, `attendeeList` is `attendees.join(', ')` with a `null`-safe `?? ''`. No editing UI (spec line 651, explicit Out-of-Scope).
- `packages/shell/src/app/meeting-details.html` (new) — `@if (meeting(); as m) { <h2 class="title">, <p class="when">, <p class="attendees"> } @else { <p class="empty">Select a meeting from the calendar.</p> }`.
- `packages/shell/src/app/meeting-details.css` (new) — `:host` chrome mirrors `bus-log.css` (column-flex, `min-height: 0`, `padding: 0.75rem 1rem`, `background: #fafafa`, `border: 1px dashed #cfcfcf`) so the right-top slot matches the right-bottom one. Title, formatted range (monospace), attendees label, italic `.empty` state.
- `packages/shell/src/app/calendar.ts` (modified) — dropped `seed` import + `emit` import; added `inject(MeetingService)`. Events source is `this.meetingService.meetings().map(toSx)` (one-shot read at calendar construction; spec doesn't require live re-fetch in M2 since no UI mutates the list). `onEventClick` is now a one-liner: `this.meetingService.selectMeeting(e.id as string);`. `// TODO Task 6: route through MeetingService` comment removed at the same time.
- `packages/shell/src/app/app.html` (modified) — line 14: `<div class="cell card">Meeting Details</div>` → `<app-meeting-details></app-meeting-details>`. Right column is now two bare components in a column-flex grid (matches Task 5 precedent for the bus-log slot).
- `packages/shell/src/app/app.ts` (modified) — added `import { MeetingDetails } from './meeting-details'` and appended `MeetingDetails` to `imports: [Calendar, BusLog, MeetingDetails]`.
- `packages/shell/tsconfig.app.json` (modified) — extended `include` from `["src/**/*.ts"]` to `["src/**/*.ts", "../shared/src/**/*.ts"]`. Closes the silent type-check gap surfaced by build warnings (`File '../shared/src/bus.ts' not found in TypeScript compilation`). Bundle behaviour unchanged; type-check now covers shared from the host's lens, so Task 5's `_busEventsExhaustive` drift guard is finally load-bearing for the host build.

### Files Read (Context Only)
- `docs/plans/m2-host-complete.md` — preamble + Task 6 block only (sibling tasks intentionally not read).
- `docs/task-log/task-5-event-bus-log.md` — handoff context: `app.html:14` placeholder shape, `:host` chrome precedent, Subscriber-with-`Array<() => void>` pattern, `prebundle.exclude` carry-over note.
- `specs/SPEC.md` (lines 113–164) — `MeetingService` reference snippet (signals, bus subscriptions, stale guard, persistence). Cited explicitly by the plan, so reading it is allowed by `/start-task`'s self-containment rule.
- `packages/shared/src/{types,seed,bus}.ts` — confirmed `Meeting` shape, seed export, `BusEvents` map + `DeepReadonly` payload typing, the `_busEventsExhaustive` drift guard.
- `packages/shell/src/app/{calendar.ts, app.html, app.ts, app.css, bus-log.{ts,css,html}}` — pre-edit state, component-shape precedent, `.cell.card` chrome the placeholder previously provided.
- `packages/shell/{tsconfig.json, tsconfig.app.json}`, `packages/shared/tsconfig.json`, `tsconfig.base.json`, `packages/shared/package.json` — to diagnose the TypeScript-include warning and pick the fix.

### Key Decisions

1. **`currentMeeting` is a `computed`, not a second writable signal.** Spec snippet has `currentMeeting = signal<Meeting | null>(null)`; we kept the **public surface** identical (`Signal<Meeting | null>`) but the internal source of truth is `_currentMeetingId: signal<string | null>` and `currentMeeting` derives via `this._meetings().find(id)`. Why: the spec's literal shape stores the same Meeting twice — once in `_meetings`, once in `_currentMeeting` — and forces `updateMeeting` to manually re-sync (`if (this.currentMeeting()?.id === id) this.currentMeeting.set(next.find(...)!)`) so a `drawing:changed` doesn't leave the details card pointing at a stale snapshot. The derived form deletes that branch and makes drift-by-construction impossible. Plan Flexibility Clause covers this; consumer call-sites (`calendar.ts`, `meeting-details.ts`) read the same getter shape, so the deviation is internal-only. Will document in M2 milestone wrap-up if the shape ever leaks back into spec amendments.

2. **Public `meetings` and `currentMeeting` are read-only views; `_meetings` and `_currentMeetingId` are private writable signals.** First pass exposed `readonly currentMeeting = signal<...>` and `readonly meetings = signal<...>` per the spec snippet — but `readonly` only protects the property binding, not the signal's `.set()` / `.update()`. Any consumer could call `meetingService.currentMeeting.set(...)` and bypass `selectMeeting` + the `event:selected` emit, leaving the bus log + LocalStorage out of sync with state. Switched to private `_meetings` / `_currentMeetingId` + `.asReadonly()` views, so only the service body can write. User-flagged during review.

3. **`findMeeting(id: string | null): Meeting | null` is a single-call helper, not inlined twice.** Two callsites: the `currentMeeting` `computed` and `selectMeeting`. Helper carries the `id === null` early-return so the `computed` is a one-liner (`computed(() => this.findMeeting(this._currentMeetingId()))`). Right at the borderline of the project's "three similar lines is better than a premature abstraction" guidance — but the second consumer was already there and `null`-handling is non-trivial, so the helper earned its name. User-flagged during review.

4. **First-boot persist in the constructor.** Spec snippet's `loadAll` is read-only and `persistAll` only fires from `updateMeeting` — so a session that only clicks (never fires `drawing:changed` / `diagram:changed`) leaves `localStorage.getItem('frankenstein:meetings') === null` after reload. That fails Task 6 Acceptance #2 verbatim ("LocalStorage `frankenstein:meetings` exists and equals the seed"). Fix: constructor reads `localStorage.getItem(STORAGE_KEY) !== null` *before* `_meetings.set(this.loadAll())`, then calls `persistAll()` once if storage was empty. Comment names the AC as the reason. Alternative (write-through inside `loadAll`) was rejected because it makes `loadAll` impure and hides the side effect from the constructor's call site.

5. **Private method types are `BusEvents['drawing:changed']` / `BusEvents['diagram:changed']`, not the spec's mutable shape.** First pass typed `applyDrawingChange(p: { meetingId: string; excalidrawData: ExcalidrawDemoData })` — strict TS rejected because `on('drawing:changed', ...)` hands the handler a `DeepReadonly<...>` payload (intentional, see `bus.ts` lines 5–8) and `readonly unknown[]` is not assignable to `unknown[]`. Indexing `BusEvents` directly preserves the readonly bound; `structuredClone(p.excalidrawData)` returns a fresh mutable copy on the way into the `Meeting` write. Note: the diagram path doesn't need `structuredClone` because `mermaidSource` is a primitive `string`.

6. **Calendar reads `meetings()` once at construction; no auto-refresh via `effect`.** The spec is explicit ("Re-fetch on signal change is not required in M2 — no UI mutates the list"). Adding an `effect`/`computed` for the events array would be premature: `applyDrawingChange` only mutates `excalidrawData`/`updatedAt`, never the calendar-displayed fields (`title`, `start`, `end`); the array reference does change but there's nothing the calendar needs to re-render for. Will revisit in M3+ if remote-driven mutation ever touches calendar-displayed fields.

7. **`Intl.DateTimeFormat(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })` is constructed once at module scope.** `Intl.DateTimeFormat` instances are heavy to construct; one per process is enough since the formatter is stateless and reusable across all meetings. `undefined` locale picks browser default (matches host language), keeping locale-specific weekday names and hour-format. Alternatives:
   - Per-call `new Intl.DateTimeFormat(...)` — reconstructs on every render, wasteful.
   - Pinned `'en-GB'` (Task 5's bus-log pattern) — would force English in a possibly non-English host. The bus-log uses `'en-GB'` because it specifically wants 24h `HH:mm:ss` regardless of locale; that's a different need.

8. **`ngOnDestroy` on a `providedIn: 'root'` service is defensive symmetry, not a real teardown path.** Angular root services don't unmount during the app lifetime — when the page reloads, the JS context is gone anyway and `removeEventListener` is moot. Kept the unsubscribe pattern so `MeetingService` and `BusLog` look the same as the M3/M4 remotes' Custom Elements (which *do* unmount) and so a future test using `TestBed.resetTestingModule()` doesn't leak listeners onto the global `frankensteinBus`.

9. **`MeetingDetails` reads `currentMeeting` directly; no extra signal-mirror in the component.** Could have copied to a local `signal` via an `effect`; chose `readonly meeting = this.svc.currentMeeting` because the service signal IS the desired binding and any wrapper would just re-emit the same value with extra reactivity surface. The two `computed`s (`formattedRange`, `attendeeList`) re-derive only when `meeting()` changes, no manual subscription needed.

10. **Did NOT wrap `emit`/`on` in a host-side `BusService`.** User asked whether a Prod-Angular app would extract the bus into an injectable. Discussed and rejected for this codebase: `frankensteinBus` is *globalThis by architectural design* — it's the host↔remote contract that M3/M4 Custom Elements (Excalidraw, Mermaid) will use directly because Angular DI is unreachable from a Custom Element. Wrapping inside the host creates two entry points for the same bus and risks "host doesn't hear remote" bugs. For testability the lower-friction route is `vi.mock('@frankenstein/shared/bus', ...)` or dispatching real `CustomEvent`s on `globalThis.frankensteinBus` and asserting state — both keep the production code shape identical to what remotes will mirror. Saved the user's broader Angular preference ("default = DI-wrap globalThis APIs for tests") to global feedback memory; will revisit in M3+ if it stops being self-contained.

11. **`tsconfig.app.json` `include` extended to cover `../shared/src/**/*.ts`.** Symptom: build warnings `File '../shared/src/bus.ts' not found in TypeScript compilation` and same for `seed.ts`. Diagnosis: `@frankenstein/shared/bus` resolves via `package.json#exports` directly to the shared `.ts` source, esbuild bundles it correctly, but the host's `tsc` program only included `src/**/*.ts` so the shared sources were imported-but-not-type-checked. Implication: a typo in `bus.ts` would slip past `pnpm -F shell build` and only surface at runtime; Task 5's `_busEventsExhaustive` drift guard was effectively dormant for the host build. Three options weighed:
    - **`include` glob extension (chosen)** — one-line fix, host-tsc covers shared from the consumer's perspective. Type-check is shared for free.
    - **TypeScript Project References** (`composite: true` in shared, `references: [...]` in shell) — the canonical TS monorepo answer, but `composite: true` typically wants emit semantics that fight with shared's `noEmit: true`. Net invasive for one warning.
    - **Build shared to `.d.ts`** — explicitly Out of Scope per Task 5 wrap-up #11 (shared is "TS source with no built artifact").

### Test Evidence

- `pnpm -F shell build` → exit 0 across **five iterations**: initial type-error, post-fix, post-readonly-refactor, post-derived-state-refactor, post-tsconfig-include extension. Bootstrap lazy chunk **257.32 kB** (was 253.30 kB after Task 5) — +4.02 kB for service + details component + tsconfig-driven type-check delta. Initial total **120.66 kB raw / 32.38 kB transfer** unchanged. The persistent `WARN  No meta data found for shared lib @preact/signals-core` from Task 4 still appears — same root cause, still cosmetic. The two `File '../shared/src/*.ts' not found in TypeScript compilation` warnings are gone after the include-glob extension; verified in the final build pass.
- `git diff --stat` matches the file inventory in §Files Modified (5 modified, 4 new untracked under `packages/shell/src/app/`).
- Sandbox/loopback caveat carries over from Tasks 4 + 5: `pnpm -F shell start` binds cleanly but `curl 127.0.0.1:4200` is firewalled in this harness. **Browser smoke is the user's** — see §Acceptance Coverage for the queued list.

### Acceptance Coverage

(IDs reference the bullets in `docs/plans/m2-host-complete.md` Task 6 § Acceptance, in order.)

- **AC1 — Click meeting → bus log row + details card; second click swaps both; third updates again** — `partial`. Build green; bus log subscribes to `event:selected` (Task 5 evidence) and the calendar refactor still emits via `selectMeeting` → service → `emit`. `MeetingDetails` reads the `currentMeeting` computed which re-derives when `_currentMeetingId` flips. End-to-end browser click queued for the user (sandbox loopback blocked).
- **AC2 — Reload → details empty + bus log empty + LocalStorage exists & equals seed (3 entries, no `excalidrawUpdatedAt`)** — `partial`. The first-boot persist (§Key Decisions #4) is the explicit fix that lets this AC pass; `_currentMeetingId` is *not* persisted (by design — spec line implicitly through "currentMeeting is not persisted" in plan); `_meetings` flushes through `persistAll` in the constructor. Browser reload check queued.
- **AC3 — Select Architecture Review, fire `drawing:changed` for matching id → bus log row + LocalStorage gains `excalidrawData`/`excalidrawUpdatedAt`/fresh `updatedAt`; reload preserves** — `partial`. `applyDrawingChange` writes those three fields exactly via `updateMeeting`; `structuredClone` strips the `DeepReadonly`. Browser DevTools-fired `CustomEvent` queued.
- **AC4 — Stale guard: with Architecture Review selected, fire `drawing:changed` with `meetingId: 'meeting-sprint-retro'` → Sprint Retro entry NOT modified; bus log row still appears** — `partial`. Guard is `if (p.meetingId !== this._currentMeetingId()) return;` (line 55 + 67); cheaper than `?.id` lookup. Browser test queued.
- **AC5 — With a meeting selected, fire `context:request` → fresh `event:selected` row** — `partial`. `rebroadcastCurrent` reads `this.currentMeeting()` (the computed) and emits when non-null. Queued.
- **AC6 — DevTools console clean; `pnpm -F shell build` exit 0** — `passed` for the build half; console-clean is queued.

All ACs are partial-pending-browser, none skipped. Same harness limitation as Task 4 + 5 — browser verification is owed but the wiring is straight-line traceable from the code.

### Open Issues

- **Browser-side acceptance (AC1–6) queued for the user.** Sandbox blocks loopback; same workflow as Tasks 4 + 5.
- **`@preact/signals-core` meta warning + `temporal-polyfill` peer warning** carry over unchanged from Tasks 4 + 5. Cosmetic only.
- **Stored seed dates freeze on first boot.** First boot now persists the seed; the `weekday(...)`-computed ISO timestamps in `seed.ts` capture *that* week. The next ISO week, the calendar still shows the frozen entries unless the user clears `frankenstein:meetings` from DevTools > Application > LocalStorage. Task 5 already flagged this; the first-boot persist makes it stick faster but doesn't change the underlying contract. Not a defect — explicit "no time-travel" demo behaviour. May want a "Reset demo" button in M5 polish.
- **Calendar's `events` array is a one-shot read of `meetings()`.** Acceptable for M2 (no UI mutates the calendar-displayed fields); becomes a real concern in M3+ if a remote ever changes a meeting's `title`/`start`/`end`. Will need an `effect` that calls `calendarApp.events.set(...)` (or whatever Schedule-X's mutation API is) at that point.
- **`MeetingDetails` doesn't subscribe to `drawing:changed`/`diagram:changed`.** It reads `currentMeeting` only; the computed re-fires when `_meetings` mutates (via `applyDrawingChange`/`applyDiagramChange`) so the card auto-updates *if* a "last edited" hint is added later. M2 doesn't surface that hint, but the wiring is already free.

### Context for Next Task

Task 6 closes Milestone M2. The next milestone is M3 (host ↔ Excalidraw remote). What this task hands off:

- **`MeetingService` is now the single broadcast point for `event:selected`.** Calendar click → `selectMeeting(id)` → service emits. Future entry paths (deep-link, hotkey, remote-initiated rebroadcast on `context:request`) all go through `selectMeeting`. Don't add a parallel emit elsewhere — the bus log is a generic readout, but state-bearing emits must funnel here.
- **Stale-update guard is load-bearing for the host↔remote handshake.** Once M3 wires Excalidraw, `drawing:changed` will fire continuously while the user draws. The guard `p.meetingId !== this._currentMeetingId()` is what prevents a debounced-emit-in-flight from meeting A landing in meeting B's persisted state when the user switches mid-stream. Task 6 is the test; Task 9+ is the consumer.
- **`structuredClone` boundary is the M3/M4 contract.** Bus payloads are `DeepReadonly`; before writing into a `Meeting`, `structuredClone` makes a fresh mutable copy. M3's Excalidraw remote will hand us `excalidrawData` of unbounded depth — the `structuredClone` cost is O(payload size), which is fine because Excalidraw debounces emits to ~250ms. If profiling ever shows it as hot, switch to a typed shallow copy.
- **`currentMeeting` is derived; do NOT store a second copy in M3 components.** If the Excalidraw remote needs the current meeting's `excalidrawData`, it should read it from `event:selected.initialData` once on mount and rely on bus events for updates — not query `MeetingService` directly (that breaks the host↔remote isolation). The host service is internal to the host.
- **`tsconfig.app.json` now type-checks shared.** Task 7 (M3 setup) can edit `packages/shared/src/` knowing the host build will catch type errors. The `_busEventsExhaustive` drift guard finally fires for the host build, so adding a fifth event without a matching tuple entry will fail `pnpm -F shell build` with a type error rather than silently shipping.
- **Federation share map unchanged.** No new dependencies added. `package.json` for shell is untouched.
- **LocalStorage write-frequency is per-event.** Every `drawing:changed` triggers a JSON-stringify of the full meetings array. For M2's three meetings + tiny `excalidrawData` this is ~kilobytes; for M3 with a real Excalidraw payload it could be ~hundreds of kB per emit. If profiling shows it as hot, batch via `requestIdleCallback` or a 250ms debounce on `persistAll` (not on the emit itself — the emit must stay synchronous for the bus contract).
- **`_currentMeetingId` is intentionally not persisted.** Reload returns to empty state. If a future "restore last selection" UX is wanted, persist `_currentMeetingId` separately under a sibling key (`frankenstein:current-meeting-id`); don't fold it into `frankenstein:meetings` because the data shape is "list of meetings", not "session state".

### Git State

```
git diff --stat
 packages/shell/src/app/app.html           |  2 +-
 packages/shell/src/app/app.ts             |  3 ++-
 packages/shell/src/app/calendar.ts        | 14 +++++------
 packages/shell/src/app/meeting.service.ts | 40 ++++++++++++++++++++-----------
 packages/shell/tsconfig.app.json          |  3 ++-
 5 files changed, 37 insertions(+), 25 deletions(-)

git status --short
 M packages/shell/src/app/app.html
 M packages/shell/src/app/app.ts
 M packages/shell/src/app/calendar.ts
A  packages/shell/src/app/meeting-details.css
A  packages/shell/src/app/meeting-details.html
A  packages/shell/src/app/meeting-details.ts
AM packages/shell/src/app/meeting.service.ts
 M packages/shell/tsconfig.app.json
```

Untracked entries that should NOT be staged: `docs/m1-article-draft.md` and the
sandbox/harness home-dir files (`.bash_profile`, `.bashrc`, `.zshrc`,
`.zprofile`, `.profile`, `.gitconfig`, `.gitmodules`, `.mcp.json`, `.ripgreprc`,
`.vscode/`, `.claude/`).
