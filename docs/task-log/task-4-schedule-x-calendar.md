# Task 4 — Schedule-X weekly calendar + click emits `event:selected` to bus

### Task
Mount a Schedule-X weekly calendar in the host's left column, render
the three seeded meetings on the current ISO week, wire `onEventClick`
to emit `event:selected` directly on the shared bus. Plus the runtime
crash + page-scroll + internal-scroll fixes that surfaced during
browser integration.

### Status
DONE

### Files Modified
- `packages/shell/package.json` (modified) — Schedule-X / Preact / temporal-polyfill landed in **devDependencies** (not `dependencies`); see Key Decisions §1.
- `packages/shell/src/app/calendar.ts` (new) — standalone `Calendar` component, `temporal-polyfill/global` side-effect import at top, builds `calendarApp` via `createCalendar({ views: [createViewWeek()], events: seed.map(toSx), selectedDate: Temporal.Now.plainDateISO(), callbacks: { onEventClick } })`. `onEventClick` looks up the `Meeting` in `seed` by `e.id as string` and dispatches `emit('event:selected', { meetingId, initialData: m })` with a `// TODO Task 6: route through MeetingService` marker beside the emit.
- `packages/shell/src/app/calendar.html` (new) — single line `<sx-calendar [calendarApp]="calendarApp">`. No outer wrapper div; see Key Decisions §7.
- `packages/shell/src/app/calendar.css` (new) — `:host` and `sx-calendar` both `display: block; width: 100%; height: 100%; min-height: 0`. The component contributes only to the percentage-height chain.
- `packages/shell/src/app/app.html` (modified) — `<div class="cell cell--empty">` inside `.col-left` replaced with `<app-calendar>`.
- `packages/shell/src/app/app.ts` (modified) — `imports: [Calendar]` (was `[]`).
- `packages/shell/src/app/app.css` (modified) — added `grid-template-rows: 1fr` and `overflow: hidden` to `.layout`; added `.col-left { min-height: 0; overflow: hidden }` (matches the sibling columns Task 3 already had); added `overflow: hidden` to `.col-mid` / `.col-right`. Eliminates the page-level scrollbar Schedule-X's intrinsic 1600 px content was producing.
- `packages/shell/src/styles.css` (modified) — global `@import '@schedule-x/theme-default/dist/index.css';`, `html, body { overflow: hidden }`, and two Schedule-X CSS-bug workarounds with explanatory comments: `.ng-calendar-wrapper { height: 100%; min-height: 0 }` and `.sx__view-container { min-height: 0 }` (Key Decisions §6).
- `pnpm-lock.yaml` (modified) — Schedule-X / Preact / temporal-polyfill resolution.
- `readme.md` (modified) — added "Host-only deps live in `devDependencies`" subsection between **Tech Stack** and **Repository Layout**, capturing the rule, the mechanism (`shareAll` walks `dependencies`), and why it matters (Preact `__H` instance-split crash).
- `packages/shell/angular.json` (modified, **incidental**) — Angular CLI auto-added `"analytics": false` during a `ng build` / `ng serve` run; not deliberate, harmless, can be staged with the task or split into a follow-up cleanup commit per user preference.

### Files Read (Context Only)
- `docs/plans/m2-host-complete.md` — preamble + Task 4 block only (no sibling tasks).
- `docs/task-log/task-3-host-layout-shell.md` — handoff context: calendar slot location, `--header-h: 3rem`, `min-height: 0` already on `.col-mid` / `.col-right`, `:host { imports: [] }` precedent.
- `packages/shared/src/{bus.ts,seed.ts,types.ts}` — verified `emit` / `on` API, `seed` shape, `Meeting` fields, `event:selected` payload type.
- `packages/shell/federation.config.mjs` — confirmed `shareAll` iterates `dependencies` and the existing `@frankenstein/shared`-in-devDeps precedent (lines 7-9 comment).
- `packages/shell/src/app/{app.html,app.ts,app.css}`, `packages/shell/src/styles.css` — pre-edit state.
- `packages/shell/node_modules/@schedule-x/angular/{package.json,index.d.ts,fesm2022/schedule-x-angular.mjs}` — confirmed `sx-calendar` selector, single `[calendarApp]` input, internal `<div class="ng-calendar-wrapper">` template (the source of the class-name collision in §7).
- `packages/shell/node_modules/@schedule-x/calendar/dist/{core.d.ts,core.js}` — `EventId = number | string`, `CalendarEventExternal` shape, `DEFAULT_WEEK_GRID_HEIGHT = 1600`, runtime CSS-var setters for `--sx-week-grid-height` / `--sx-week-grid-hour-height`.
- `packages/shell/node_modules/@schedule-x/theme-default/dist/index.css` — `.sx__calendar-wrapper`, `.sx__calendar`, `.sx__view-container`, `.sx__week-grid` rules, confirmed absence of any `.ng-calendar-wrapper` rule and absence of `min-height: 0` on `.sx__view-container`.

### Key Decisions

1. **Schedule-X / Preact / `@preact/signals` / `temporal-polyfill` in `devDependencies`, not `dependencies`.** The plan's install command was literally `pnpm -F shell add ...` (no `-D`). First pass followed it and produced `TypeError: Cannot read properties of undefined (reading '__H')` from `preact/hooks/src/index.js:26` on first browser load. Diagnosis: Native Federation's `shareAll` walks `dependencies`, so it had emitted `preact`, `preact_hooks`, `_preact_signals`, `_schedule_x_angular`, `_schedule_x_calendar`, `temporal_polyfill_global` as separate `browser-separate` chunks and added them to the import map. Vite's dev pipeline simultaneously served `preact/hooks/src/index.js` from raw `node_modules/.pnpm/preact@10.29.1/...` (deep import paths slip past the bare-specifier import map). Two Preact module instances at runtime ⇒ Schedule-X rendered against instance A, hooks ran against instance B, `currentComponent.__H` lived on the wrong copy.

   Three fixes considered:
   - **`skip` array entries** — rejected. Requires manual enumeration of every Preact subpath Schedule-X imports (`preact`, `preact/hooks`, `preact/jsx-runtime`, `preact/compat`, `@preact/signals`, `@preact/signals-core`, `temporal-polyfill`, `temporal-polyfill/global`, plus `@schedule-x/*`). A Schedule-X minor bump that adds a new subpath silently re-federates and reproduces the bug.
   - **`includeSecondaries: { keepAll: true }` override on `preact`** — would work but brings federation-internals tax now for zero benefit. No remote in M3/M4 needs to share Preact.
   - **`devDependencies` (chosen)** — `shareAll` ignores them by design; vite bundles a single Preact instance inline. Matches the precedent already documented in `federation.config.mjs` for `@frankenstein/shared` (line 7-9 comment). One pnpm command, zero config edits, automatically catches future transitive subpaths.

   Bootstrap chunk grew from 4.47 kB → 250.29 kB after the move (Schedule-X bundled inline instead of emitted as separate browser-separate chunks). Federation manifest now lists only `@angular/*`, `rxjs`, `tslib`. The decision is documented in the new readme subsection.

2. **Direct bus emit from `onEventClick` (no `MeetingService` yet).** Per the plan's own "Key Discoveries": deliberate temporary shortcut so Task 5 (Bus Log) has visible bus traffic without standing up the full service. Inline `// TODO Task 6: route through MeetingService` comment at the emit site marks the swap point. Task 6's refactor is a single-line change (replace `seed.find(...)` with `meetingService.selectMeeting(id)`).

3. **`temporal-polyfill/global` side-effect import at the top of `calendar.ts`** rather than hoisting to `main.ts`. Calendar is the only consumer; localising the polyfill keeps the dependency declaration close to its use. Revisit when M5 introduces another Temporal user.

4. **Theme CSS via global `styles.css` `@import`**, not the `angular.json` `styles` array. Both are valid; `styles.css` was the path of least resistance — one file, already touched for Task 3 resets.

5. **`.layout { grid-template-rows: 1fr; overflow: hidden }`.** Task 3's grid had `display: grid; grid-template-columns: ...; height: calc(100vh - var(--header-h))` but **no** `grid-template-rows`. The implicit single row defaulted to `auto` (≈ `max-content`); Schedule-X's intrinsic 1600 px content stretched the row past viewport, the body scrolled, and the right column inherited the taller row (visible empty space below "Event Bus Log"). Locking the row to `1fr` plus `overflow: hidden` on `body` / `.layout` / each column eliminated the page-level scrollbar. Defensive `min-height: 0` on `.col-left` to match its siblings (Task 3 had skipped it because `.col-left` was a single-child column at the time; Schedule-X put real pressure on it).

6. **Two Schedule-X CSS-bug workarounds in `styles.css`, both with comments.**
   - `.ng-calendar-wrapper { height: 100%; min-height: 0 }` — `@schedule-x/angular`'s wrapper component renders an unstyled `<div class="ng-calendar-wrapper">` inside `<sx-calendar>` and mounts the Preact tree there. Schedule-X's theme CSS does **not** size that div. With `height: auto` it content-sized to 1699 px (DevTools-confirmed), breaking the percentage-height chain at this link, so the `100%` cascade from `<section class="col-left">` never reached `.sx__calendar-wrapper`.
   - `.sx__view-container { min-height: 0 }` — Schedule-X ships `.sx__view-container` as `flex: 1; overflow-y: auto` but **without** `min-height: 0`. In a column-flex parent, default `min-height: auto` lets a flex item grow to its content size (the fixed 1600 px `.sx__week-grid`); the `flex: 1` then never constrains it and `overflow-y: auto` has nothing to scroll. `.sx__calendar { overflow: hidden }` clips the visual overflow, producing the "8 PM is the last hour, no scrollbar" symptom. Schedule-X's docs use a fixed `1200×800` host wrapper, which is large enough that the bug doesn't trigger — masking the issue for upstream.

   Both rules are global because the offending elements are inside Schedule-X's encapsulation; Angular's emulated view encapsulation can't reach them. The comments are intentionally long: `min-height: 0` on its own looks like dead CSS to a future reader.

7. **Dropped the outer `<div class="ng-calendar-wrapper">` from `calendar.html`.** Schedule-X's Angular wrapper (`@schedule-x/angular/fesm2022/schedule-x-angular.mjs:132`) renders its own internal `<div class="ng-calendar-wrapper">` inside `<sx-calendar>` — a class-name collision with our outer wrapper. Our outer wrapper was redundant anyway: `:host { display: block; width: 100%; height: 100%; min-height: 0 }` on `app-calendar` already provides the full sizing surface. Removing it eliminates the collision and one DOM level. Side effect: the global `.ng-calendar-wrapper` rule now matches only Schedule-X's internal div, which is exactly what we want.

8. **`overflow: hidden` on `html, body`.** Defense-in-depth. Schedule-X's internal `.sx__view-container` is the only element that should produce a vertical scrollbar; the `< 1280 px` viewport gate from Task 3 shows a single centred message and doesn't need scrolling either.

### Test Evidence

- `pnpm -F shell add ...` (initial) → installed cleanly. One peer-warning: `temporal-polyfill@0.3.0` expected by `@schedule-x/calendar`, `0.3.2` resolved — non-fatal, runtime works (the `Temporal.Now.timeZoneId()` and `Temporal.Instant.from(iso).toZonedDateTimeISO(tz)` path is stable across the patch range).
- `pnpm -F shell build` (initial, deps in `dependencies`) → exit 0. Bootstrap chunk **4.47 kB**. Federated browser-separate chunks present in `dist/shell/browser/`: `_schedule_x_angular`, `_schedule_x_calendar`, `preact`, `preact_compat`, `preact_hooks`, `preact_jsx_runtime`, `_preact_signals`, `temporal_polyfill_global`. Browser load → `__H` undefined crash.
- `pnpm -F shell add -D ...` → moved all six packages from `dependencies` to `devDependencies`. Same peer-warning, no other changes.
- `pnpm -F shell build` (final, deps in `devDependencies`) → exit 0. Initial total **120.56 kB raw / 32.34 kB est. transfer** (`main` 50.51 kB, `polyfills` 41.02 kB, `styles.css` 28.42 kB, anonymous chunk 618 B). **Bootstrap lazy chunk 250.29 kB** (Schedule-X + Preact + Temporal bundled inline). No `_schedule_x_*` / `preact*` / `temporal_polyfill_global` chunks in `dist/shell/browser/`.
- Persistent cosmetic warning at build/serve time: `WARN  No meta data found for shared lib @preact/signals-core`. Native Federation probes transitive metadata; harmless because `@preact/signals*` is no longer in the federation manifest.
- `pnpm -F shell start` → boots clean on `:4200`. `curl /remoteEntry.json` → only `@angular/common`, `@angular/common/http`, `@angular/platform-browser`, `rxjs`, `rxjs/operators`, `tslib`, `@angular/core` (+ secondaries), `@angular/forms`, `@angular/router`. No `preact|schedule|temporal` entries (`grep` confirmed empty).
- `curl http://localhost:4200/` → HTTP 200, `<app-root></app-root>` + `esms-options` shim tag.
- `curl http://localhost:4200/styles.css` → contains `.sx__calendar-wrapper`, `.sx__view-container`, plus our two override rules and the body-overflow reset.
- Bootstrap chunk grep → contains `app-calendar`, `sx-calendar`, `event:selected`. Vite-served `seed.ts` returns all three meeting IDs (`meeting-architecture-review`, `meeting-sprint-retro`, `meeting-design-sync`).
- **Browser session (user-driven debug, this conversation):**
  - First mount → `__H` undefined crash. Fix: deps to `devDependencies` (§1).
  - Second mount → calendar renders, three events visible on the current ISO week (Architecture Review Mon 10:00–11:30, Design Sync Wed 09:30–10:30, Sprint Retro Tue 14:00–15:00). Page has a vertical scrollbar reaching past viewport. Fix: layout overflow + `grid-template-rows: 1fr` (§5).
  - Third mount → no page scrollbar; calendar visible 1 AM–8 PM with no scrollbar inside, hours 9 PM–11 PM unreachable. Fix: `.sx__view-container { min-height: 0 }` (§6).
  - Fourth mount → `min-height: 0` applied per DevTools but `.sx__view-container` rendered at 338 × 1699 px. DevTools tree showed unexpected nested `<div class="ng-calendar-wrapper">` inside `<sx-calendar>`. Fix: global `.ng-calendar-wrapper` sizing rule + drop our redundant outer wrapper (§6, §7).
  - Final state: weekly view with current ISO week, full 24-hour grid scrollable inside the left column via Schedule-X's own scrollbar, three events clickable, layout stable.
  - DevTools listener (`frankensteinBus.addEventListener('event:selected', e => console.log(e.detail))`) was implicitly exercised during the user's debug session; explicit per-event verification deferred to Task 5 where the Bus Log will surface the same traffic visually.

### Open Issues

- The plan's acceptance bullet *"click each event → three log entries with `meetingId` strings"* was incidentally satisfied during the browser debug session but no explicit triple-click trace was captured. Task 5 (Bus Log) makes this verifiable visually with no DevTools needed — fold into that task's acceptance.
- `WARN  No meta data found for shared lib @preact/signals-core` at every build/serve run. Cosmetic; Native Federation's transitive probe can't resolve metadata for a hoisted dep. Federation manifest is clean. Worth a watch if Schedule-X bumps Preact compat.
- `temporal-polyfill@0.3.2` vs Schedule-X's expected exact `0.3.0` — peer warning only; runtime stable.
- Angular CLI silently added `"analytics": false` to `packages/shell/angular.json` during a build/serve run. Not in scope of this task; harmless. Up to user whether to stage with this task or carve into a follow-up cleanup commit.
- Schedule-X's two CSS bugs are upstream issues. If we ever file an issue or upstream a patch, the two `styles.css` overrides plus their comments could be removed; until then, the comments are load-bearing.

### Context for Next Task

Task 5 (Event Bus Log) — what this task hands off:

- **Bus traffic to display.** `frankensteinBus` already carries `event:selected` events on every calendar click. `Calendar` in `packages/shell/src/app/calendar.ts:25-37` builds the payload `{ meetingId, initialData: m }` from `seed`. Task 5 subscribes via `on('event:selected', ...)` from `@frankenstein/shared/bus` — **don't import the bus singleton directly**; the `on` helper handles cleanup via the returned unsubscribe.
- **Right-bottom slot.** `packages/shell/src/app/app.html` line 14: `<div class="cell card">Event Bus Log</div>`. Replace with the new component. Keep the `.card` styling consistent with the right column or override per-component.
- **Right-column overflow already configured.** `.col-right` is `min-height: 0; overflow: hidden` (Task 4 add) and `grid-template-rows: 1fr 1fr` (Task 3). The bus log component does **not** need its own `overflow-y: auto` on the cell wrapper — but **does** need it on the inner scrollable list (the cell itself is overflow-hidden, so an inner `<ul>` / `<div>` with its own `overflow-y: auto` + `min-height: 0` is the canonical pattern; same flex-overflow gotcha that bit Schedule-X).
- **Bus payloads are deeply readonly.** `@frankenstein/shared/bus.ts` types `event:selected` payload as `DeepReadonly<{ meetingId, initialData: Meeting }>`. The bus log can render directly without cloning; keep field accessors readonly throughout. The same bus also defines `drawing:changed`, `diagram:changed`, `context:request` — Task 5 should subscribe to all four (or at least `event:selected` + the two remote-emitted change events) per the spec's "log row per bus event" requirement.
- **Direct emit will route through `MeetingService` in Task 6.** Don't depend on `seed` or `Meeting` import details inside the log component — render whatever the bus delivers. Task 6's refactor preserves the bus contract; only the producer changes.
- **Schedule-X CSS overrides in `styles.css`** (`.ng-calendar-wrapper`, `.sx__view-container`) are calendar-specific; they don't affect the bus log. They live globally because the offending elements are inside Schedule-X's encapsulation, not under any Angular component selector.
- **Federation share map** — final shape: only `@angular/*`, `rxjs`, `tslib`. Anything host-only added in M5 should land in `devDependencies` per the new readme rule.
- **Imports in `App`.** Currently `imports: [Calendar]`. Task 5 adds the new component to the same array.

### Git State

```
git diff --stat
 packages/shell/angular.json     |   3 +-
 packages/shell/package.json     |   6 ++
 packages/shell/src/app/app.css  |   8 +++
 packages/shell/src/app/app.html |   2 +-
 packages/shell/src/app/app.ts   |   3 +-
 packages/shell/src/styles.css   |  22 ++++++
 pnpm-lock.yaml                  | 145 ++++++++++++++++++++++++----------------
 readme.md                       |  21 ++++++
 8 files changed, 148 insertions(+), 62 deletions(-)

git status --short
 M packages/shell/angular.json
 M packages/shell/package.json
 M packages/shell/src/app/app.css
 M packages/shell/src/app/app.html
 M packages/shell/src/app/app.ts
 M packages/shell/src/styles.css
 M pnpm-lock.yaml
 M readme.md
?? packages/shell/src/app/calendar.css
?? packages/shell/src/app/calendar.html
?? packages/shell/src/app/calendar.ts
```

(Sandbox/harness untracked entries — `.bash_profile`, `.bashrc`, `.zshrc`, `.zprofile`, `.profile`, `.gitconfig`, `.gitmodules`, `.mcp.json`, `.ripgreprc`, `.vscode`, `.claude/`, `docs/m1-article-draft.md` — should not be staged.)
