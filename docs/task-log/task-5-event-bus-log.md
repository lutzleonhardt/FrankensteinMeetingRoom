# Task 5 — Event Bus Log component (right-bottom slot)

### Task
Implement `app-bus-log` as a standalone Angular component in the
host's right-bottom slot. Subscribe via `on(...)` to all four bus
events, keep the last ten entries in a single signal, render
`{at} {name}` plus a truncated `JSON.stringify` payload preview,
empty state "Bus is quiet."

### Status
DONE

### Files Modified
- `packages/shared/src/bus.ts` (modified) — promoted the runtime `ALL_BUS_EVENTS` tuple (`as const`) to single source of truth for the event-name set; derived `export type BusEventName = (typeof ALL_BUS_EVENTS)[number]`; exported `BusEvents` (was internal); added a compile-time drift guard (`_busEventsExhaustive`) that fails to typecheck when the tuple and the payload map have diverging keys. No bundle-size impact (4-string tuple, type aliases erased).
- `packages/shell/angular.json` (modified) — added `serve-original.options.prebundle.exclude: ['@frankenstein/shared']`. Disables Vite's dep-pre-bundling for the shared workspace package; future `packages/shared/`-edits flow through Angular's esbuild pipeline and trigger HMR rebuilds, so the dev server can no longer freeze a stale snapshot of the shared bus/types/seed (Key Decisions §11).
- `packages/shell/src/app/bus-log.ts` (new) — standalone `BusLog` component, selector `app-bus-log`. Imports `ALL_BUS_EVENTS` (runtime tuple) and `BusEventName` (type-only) from `@frankenstein/shared/bus`; only `BusLogEntry` stays local (UI-shaped: `at: string` is formatted display time, `payload: unknown` is intentionally generic across all four bus events — not a wire-format type). Two constants: `MAX_ENTRIES = 10`, `PAYLOAD_PREVIEW_MAX = 80`. Constructor iterates `ALL_BUS_EVENTS` directly (`for (const name of ALL_BUS_EVENTS)`) and pushes each `on(name, ...)`'s returned unsubscriber onto a private array — adding a fifth event in shared automatically widens the subscription set here, no edit required. Each handler builds `{ name, payload, at: new Date().toLocaleTimeString('en-GB', { hour12: false }) }` and `entries.update(prev => [entry, ...prev].slice(0, 10))`. `ngOnDestroy` calls every stored `off()` and clears the array (defensive; the host root never unmounts, but this sets the pattern M3/M4 remotes mirror in `disconnectedCallback`). `preview()` is the template-callable truncator: `JSON.stringify(payload) ?? 'undefined'`, slice to 80 chars + `…` if longer.
- `packages/shell/src/app/bus-log.html` (new) — `<h2 class="header">`, then `@if (entries().length === 0)` → "Bus is quiet." else `<ul class="list">` with `@for (e of entries(); track $index)` over three `<span>`s (`at`, `name`, `payload`).
- `packages/shell/src/app/bus-log.css` (new) — `:host` is column-flex, `height: 100%; min-height: 0; box-sizing: border-box; padding: 0.75rem 1rem; background: #fafafa; border: 1px dashed #cfcfcf` (mirrors the `.cell.card` chrome that the placeholder used to provide). `.list { flex: 1; min-height: 0; overflow-y: auto }` — `min-height: 0` is load-bearing per Task 4's flex-overflow lesson; comment in CSS makes that explicit. Rows use `grid-template-columns: auto auto 1fr` with monospace font; payload column has `white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0` so a long preview clips inside its cell instead of pushing the row wider.
- `packages/shell/src/app/app.html` (modified) — line 15: `<div class="cell card">Event Bus Log</div>` → `<app-bus-log></app-bus-log>`. The placeholder above (`Meeting Details`) stays for Task 6.
- `packages/shell/src/app/app.ts` (modified) — added `import { BusLog } from './bus-log'` and appended `BusLog` to `imports: [Calendar, BusLog]`.

### Files Read (Context Only)
- `docs/plans/m2-host-complete.md` — preamble + Task 5 block only (no sibling tasks).
- `docs/task-log/task-4-schedule-x-calendar.md` — handoff context: bus traffic shape, right-column overflow already configured, `.cell.card` chrome the placeholder used, calendar precedent for dropping the wrapper.
- `packages/shared/src/bus.ts` — confirmed `on(name, handler) → () => void` signature, `BusEvents` keys, `DeepReadonly` payload typing.
- `packages/shell/src/app/{app.html,app.ts,app.css}`, `packages/shell/src/app/calendar.ts` — pre-edit state and component-shape precedent.

### Key Decisions

1. **Drop the `.cell.card` wrapper; let `app-bus-log` own its full chrome.** Task 4 set the precedent: the calendar slot is `<app-calendar>` directly inside `<section class="col-left">`, not wrapped in `.cell`. Mirroring that for the bus log keeps the right column symmetric (placeholder above is still `<div class="cell card">Meeting Details</div>` until Task 6 replaces it the same way). The component's `:host` reproduces the chrome (`background: #fafafa`, `border: 1px dashed #cfcfcf`, `padding: 0.75rem 1rem`, `min-height: 0`) so visual parity with the placeholder is preserved. Alternatives considered:
   - Keep `<div class="cell card"><app-bus-log/></div>` — would have given free chrome but doubles the box (cell padding + host padding) and breaks the calendar parallel.
   - Move `.cell.card` styles into `app-bus-log` *and* delete the rule from `app.css` — premature; Task 6 still wants `.cell.card` for the meeting-details placeholder slot, and even after Task 6 lands, leaving the rule lets us swap remotes back to a placeholder slot for debugging.
   - **Chosen**: drop the wrapper for this slot only; component owns its chrome; `.cell.card` rule untouched in `app.css`.

2. **Subscribe via `on(...)` not `bus.addEventListener(...)`.** Plan called this out, Task 4's wrap-up reinforced it: `on()` exists exactly so subscribers don't need to import the singleton or hand-roll the `CustomEvent → detail` cast. Returning the unsubscriber from `on()` also handed us the array-of-`off()` pattern for free; an `addEventListener` route would have needed us to keep the listener references *and* the names *and* call `removeEventListener` symmetrically. `on()` is canonically narrower and keeps the M3/M4 remote pattern the same.

3. **In-memory only — no LocalStorage.** Plan said "log row per bus event, last ~10, no persistence." Resisting the temptation to mirror the `MeetingService` LocalStorage pattern (Task 6) here: bus log is per-session by design and the spec's Integration Moment 6 ("Activity feed shows changes from remotes") doesn't require survival across reload.

4. **`Array<() => void>` for unsubscribers, cleared in `ngOnDestroy`.** Could have used a single `() => void` that loops, or `DestroyRef.onDestroy(...)` with one closure per subscription. Picked the explicit array because (a) the M3/M4 remote pattern is "store handles, call them in `disconnectedCallback`" — same shape, different framework; (b) no DI surface needed; (c) `ngOnDestroy` is already a Component lifecycle method, no extra import cost.

5. **`new Date().toLocaleTimeString('en-GB', { hour12: false })` for `HH:mm:ss`.** `'en-GB'` because it's the locale that gives `HH:MM:SS` 24-hour format with no AM/PM, no seconds-suppression, no locale wobble across user environments. Alternatives:
   - Manual `pad(date.getHours()) + ':' + pad(...) + ':' + pad(...)` — three lines + a helper, no upside.
   - `date.toISOString().slice(11, 19)` — UTC, not local; misleading on a debug log.
   - **Chosen**: `'en-GB'` locale gives the exact format with one call.

6. **`@for (e of entries(); track $index)`.** Entries are append-only (we prepend, never reorder a row), so `$index` is stable until the buffer trims. Using `track e.at` would collide on the same-second clicks; `track e` is fine but `$index` is cheaper and the semantics here are "newest first, fixed slots" — index identity is what we want.

7. **`preview()` lives on the component, not as a pipe.** A pure `Pipe` would be slightly more idiomatic-Angular, but adds a file and an import per usage; the function is single-call and doesn't need DI. Inlining keeps the component self-contained.

8. **`min-height: 0` on `.list`, with a comment explaining why.** Same flex-overflow gotcha as `.sx__view-container` in Task 4 — without it, the column-flex parent lets the list grow to its content size and `overflow-y: auto` has nothing to scroll. The comment intentionally names Task 4 so a future reader can find the corresponding lesson without context.

9. **`BusEventName` lives in `@frankenstein/shared/bus`; `BusLogEntry` stays local.** First pass declared the four-name union as a local type in `bus-log.ts`; user flagged the drift risk during review. The fix: export `BusEvents` and a `BusEventName` alias from shared, then import it. `BusLogEntry` deliberately stays in `bus-log.ts`: `at: string` is a UI formatting decision (HH:mm:ss display) and `payload: unknown` is intentionally generic across all four bus events because the log is a wire-shape-agnostic readout. Hoisting it to shared would force every future consumer (e.g. an M5 second activity panel) to accept the same UI assumptions or duplicate-type-with-rename. Lift on the second consumer, not the first.

10. **`ALL_BUS_EVENTS` `as const` tuple is the source of truth; `BusEventName` is derived; a compile-time drift guard keeps the payload map in lockstep.** Iteration v1 used a hand-typed `BusEventName[]` literal in `bus-log.ts` — typed correctly but with a real loophole: a fifth event added to `BusEvents` in shared would leave `bus-log.ts` silently subscribed to only four. TypeScript accepts a *subset* of a union as a valid `BusEventName[]`, so no compile error fires. Iteration v2 considered `Record<BusEventName, unknown> & { ...explicit map }` for the same intersection trick — also broken: the Record half resolves missing names to `unknown`, which `emit`/`on` happily accept. Iteration v3 (chosen): runtime tuple `ALL_BUS_EVENTS` `as const`, type derived via `(typeof ALL_BUS_EVENTS)[number]`, and an `_busEventsExhaustive` const whose type is `[Exclude<BusEventName, keyof BusEvents>, Exclude<keyof BusEvents, BusEventName>] extends [never, never] ? true : ['BUS_EVENTS_OUT_OF_SYNC', ..., ...]`. Drift in either direction makes `true` non-assignable; CI catches it. `void _busEventsExhaustive` keeps the unused-binding lint quiet. Bundle cost: zero (the const tuple is already there at runtime; the assertion type erases). **Why not a TypeScript enum?** Enums would also give runtime iteration but bring an indirection layer (`BusEvent.EventSelected → 'event:selected'`) between the symbol and the wire string; output is a generated `var BusEvent;` IIFE that bundlers don't always tree-shake; `erasableSyntaxOnly` (TS 5.5+, default in some runtimes) forbids them outright; the TS team's own guidance since 5.x prefers `as const` for exactly this pattern. The tuple is closer to what actually goes onto the bus.

11. **`prebundle.exclude: ['@frankenstein/shared']` in `serve-original.options` so Vite doesn't freeze the shared workspace package.** Surfaced in-session: after adding `ALL_BUS_EVENTS` to `bus.ts`, the live dev server kept serving an older pre-bundled snapshot — `packages/shell/.angular/cache/.../shell/vite/deps/@frankenstein_shared_bus.js` had only `emit`/`on`. Diagnosis: Angular CLI's `@angular/build:dev-server` builder hard-codes `server.fs.allow = [cacheDir, packages/shell/node_modules, ...assets]` (`@angular/build/src/builders/dev-server/vite/server.js`). pnpm symlinks `packages/shell/node_modules/@frankenstein/shared → ../../../shared`; Vite's resolver follows the symlink, the realpath `packages/shared/...` falls outside the allow list, so Vite cannot serve the source directly — it pre-bundles instead, and the pre-bundle is sticky across edits. Three options were considered:
   - **Cache-deletion routine** — works but is a recurring papercut on every edit in shared.
   - **Patch `server.fs.allow` via custom Vite plugin or builder fork** — too invasive for a one-line ergonomics fix.
   - **`prebundle.exclude` (chosen)** — the `@angular/build:dev-server` schema (`schema.json`) exposes `prebundle: { exclude: string[] }` and the description explicitly notes that `@foo/bar` covers all sub-paths, so a single `'@frankenstein/shared'` entry covers `bus`/`seed`/`types`. Verified end-to-end on a probe server (`ng serve --port 4201`): no `@frankenstein_shared_*` files appear under `.angular/cache/.../vite/deps/`, the bootstrap chunk (`chunk-O3H62DTK.js`) contains both `ALL_BUS_EVENTS` and `Bus is quiet`, and the app loads via Angular's esbuild pipeline rather than Vite's `/@fs/` raw-source endpoint — bypassing the fs.allow restriction entirely.

   Caveat: the existing dev server (running at the time the option was added) still uses the old config. Restarting picks up the change. Build target (`pnpm -F shell build`) is unaffected — `prebundle` only applies to the dev-server runtime.

### Test Evidence

- `pnpm -F shell build` → exit 0. Bootstrap lazy chunk **253.30 kB** (was 250.29 kB after Task 4) — +3.01 kB for the new component + template + CSS. Initial total **120.66 kB raw / 32.38 kB transfer** (≈ +0.10 kB on `main`/`styles`). No new federated chunks; the federation manifest is unchanged. The persistent `WARN  No meta data found for shared lib @preact/signals-core` from Task 4 still appears — same root cause, still cosmetic.
- `pnpm -F shell start` → bound to `localhost:4200` cleanly (`vite` reported `Local: http://localhost:4200/`, `chunk-JV6MC4SY.js  bootstrap 15.15 kB`). Sandboxed loopback prevented `curl 127.0.0.1:4200` ("Verbindungsaufbau abgelehnt"); same harness limitation Task 4 hit, so the in-browser visual verification is the user's. Server stopped via `TaskStop`.
- File inventory after the edit: `ls packages/shell/src/app/` → `app.config.ts app.css app.html app.ts bus-log.css bus-log.html bus-log.ts calendar.css calendar.html calendar.ts` (the three new bus-log files present).
- `git diff --stat` → only `app.html` (1 line, placeholder → `<app-bus-log>`) and `app.ts` (3 lines, import + `imports` array). The three new component files are untracked, as expected pre-commit.
- **Smoke checks the user owns** (sandbox can't run a browser):
  - Initial render → "Bus is quiet."
  - Click each of the three seeded meetings → three rows appear with newest on top, correct `HH:mm:ss`, `event:selected` name, payload preview ending in `…` (the `initialData: Meeting` JSON exceeds 80 chars).
  - From DevTools, fire `frankensteinBus.dispatchEvent(new CustomEvent('drawing:changed', { detail: { meetingId: 'meeting-architecture-review', excalidrawData: { elements: [] } } }))` → row appears immediately with no calendar interaction. Same for `context:request` (which renders as `{}`).
  - Spam clicks past 10 events → buffer trims; list never exceeds 10 rows.
  - Reload → list resets to "Bus is quiet."
  - Inner `.list` scrolls inside the card; the right column doesn't push the page taller (Task 4's column overflow gates already enforced this; nothing in this task should change it).

### Open Issues

- **Browser-side acceptance not yet executed inside this session.** Sandbox blocks loopback so the verification list above is queued for the user. Mirrors Task 4's pattern — same caveat, same workflow.
- **`temporal-polyfill` peer warning + `@preact/signals-core` meta warning** carry over from Task 4 unchanged. Cosmetic only; flagging because they will keep appearing in build output until upstream fixes them or we file an issue.
- **`track $index` in `@for`** is correct for the current "prepend + trim" model but would need re-thinking if Task 6 ever introduces row deletion or reordering inside the bus log (it shouldn't — bus log is append-only by design).

### Context for Next Task

Task 6 (`MeetingService` + Meeting Details + route calendar through service) — what this task hands off:

- **Meeting Details slot still placeholder.** `packages/shell/src/app/app.html:14` is still `<div class="cell card">Meeting Details</div>`. Task 6 replaces this with `<app-meeting-details>`, ideally mirroring the bus-log precedent: drop the `.cell.card` wrapper, let the component own its chrome via `:host` (background `#fafafa`, dashed border, padding `0.75rem 1rem`). One side benefit: when both right-column children are bare components, the `.cell.card` rule in `app.css` becomes dead-code candidate — defer the deletion to a polish pass; Task 6 should *not* delete it as a drive-by since other M5 tasks may revive the placeholder pattern.
- **Subscriber pattern is established.** `packages/shell/src/app/bus-log.ts` is the reference for the standalone-component-with-bus-subscription shape: `Array<() => void>` + `ngOnDestroy`, `on(...)` from `@frankenstein/shared/bus`, signal-backed state, no DI for the bus. `MeetingDetails` should follow the same shape: subscribe to `event:selected` (and likely `drawing:changed`/`diagram:changed` if the details card surfaces a "last edited" hint) the same way.
- **Calendar's direct emit becomes a service call.** `packages/shell/src/app/calendar.ts:25-37` has the `// TODO Task 6: route through MeetingService` marker at the `emit('event:selected', { meetingId, initialData: m })` site. Per Task 4 wrap-up, the swap is one-line: replace `seed.find(...)` with `meetingService.selectMeeting(id)` and let the service emit. The bus log will keep working unchanged because it subscribes to the channel, not the producer — that's the contract Task 5 just made testable.
- **Bus log is a passive readout — don't try to plumb commands through it.** `MeetingService` may want bidirectional traffic (host emits `context:request`, remotes respond) but the bus log only reads. Resist any temptation to make the log a controller; it's a generic subscriber and the M3/M4 remotes will need that property to remain true.
- **Empty-state copy is "Bus is quiet."** If Task 6's `MeetingService` constructor (provided in `app.config.ts`) emits an `event:selected` *on init* (e.g. to restore last-selected meeting from LocalStorage), the bus log will record that emit and the "Bus is quiet." state may never appear after a reload. That's correct and expected — flag it here so the next-task author doesn't try to "fix" the bus log to suppress init events.
- **`@for` track strategy is `$index`.** Append-only semantics — if Task 6 ever introduces a row-clear or filter, the track strategy revisits.
- **Federation share map unchanged.** No new dependencies added.

### Git State

```
git diff HEAD --stat
 packages/shared/src/bus.ts          | 27 ++++++++++++++-
 packages/shell/angular.json         |  5 ++-
 packages/shell/src/app/app.html     |  2 +-
 packages/shell/src/app/app.ts       |  3 +-
 packages/shell/src/app/bus-log.css  | 67 +++++++++++++++++++++++++++++++++++++
 packages/shell/src/app/bus-log.html | 15 +++++++++
 packages/shell/src/app/bus-log.ts   | 55 ++++++++++++++++++++++++++++++
 7 files changed, 170 insertions(+), 4 deletions(-)

git status --short
 M packages/shared/src/bus.ts
 M packages/shell/angular.json
 M packages/shell/src/app/app.html
 M packages/shell/src/app/app.ts
A  packages/shell/src/app/bus-log.css
A  packages/shell/src/app/bus-log.html
AM packages/shell/src/app/bus-log.ts
```

The three new `bus-log.*` files were partially staged during the
session (`A`/`AM`), which is harmless — `/commit 5` will pick up
the full vs-HEAD delta regardless of index state.

(Sandbox/harness untracked entries — `.bash_profile`, `.bashrc`, `.zshrc`, `.zprofile`, `.profile`, `.gitconfig`, `.gitmodules`, `.mcp.json`, `.ripgreprc`, `.vscode`, `.claude/`, `docs/m1-article-draft.md` — should not be staged.)
