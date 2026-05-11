# Task 14 — Artifact metadata in Meeting Details (Integration Moment 5)

### Task
Surface `excalidrawUpdatedAt` and `mermaidUpdatedAt` as
reactive rows inside the Meeting Details card (label +
status pill + HH:MM timestamp), and — folded in mid-task
after the user spotted spurious `drawing:changed` floods —
add a producer-side dedup guard in the React whiteboard
remote so resize/scroll/select/mount no longer fire bus
events that uselessly tick `excalidrawUpdatedAt`.

### Status
DONE — `pnpm -F shell exec tsc --noEmit` exits 0;
`pnpm -F whiteboard build:federate:dev` exits with
`Whiteboard federate build complete.`; user confirmed end-to-
end behavior matches every AC and the formerly-flooding bus
log is now quiet across resize/scroll/select.

### Files Modified

- `packages/shell/src/app/meeting-details.ts` (modified) —
  added module-scope `timeFormat` (`Intl.DateTimeFormat`
  with `hour: '2-digit', minute: '2-digit'`) next to the
  existing `dateFormat`; added local `ArtifactStatus = 'saved'
  | 'none'` type; added four `computed` signals
  (`excalidrawStatus`, `excalidrawTimestamp`,
  `mermaidStatus`, `mermaidTimestamp`) that read
  `this.meeting()?.excalidrawUpdatedAt` /
  `mermaidUpdatedAt` and return either `'saved'` + the
  formatted HH:MM or `'none'` + `null`. Format instance is
  module-scope so it is allocated once, not per re-render.

- `packages/shell/src/app/meeting-details.html` (modified) —
  inside the existing `@if (meeting(); as m)` block, after
  the `<p class="attendees">` line, appended a
  `<div class="artifacts">` wrapper containing two
  `<div class="artifact-row">` blocks. Each row renders a
  `.art-label` (`Whiteboard` / `Mermaid`), then a status
  pill (`<span class="pill pill--saved">Saved</span>` or
  `<span class="pill pill--none">No artifact yet</span>`)
  selected via an inline `@if (…Status() === 'saved')`;
  when `saved`, a `<span class="ts">` displays the
  formatted timestamp.

- `packages/shell/src/app/meeting-details.css` (modified) —
  added `.artifacts` (top border + 0.5rem padding-top +
  flex-column with 0.35rem gap, sitting under the existing
  attendees row), `.artifact-row` (flex row, label takes
  remaining space, pill + timestamp right-aligned), `.pill`
  (11px font, rounded `999px`, 1px 0.5rem padding), two
  variants `.pill--saved` (`#0a7d3f` text on `#e6f4ea` bg)
  and `.pill--none` (`#666` on `#f0f0f0`), and `.ts`
  (monospace stack, `0.8rem`, right-aligned, min-width
  3.25rem for column-alignment between the two rows).

- `packages/whiteboard/src/App.tsx` (modified) — added
  `elementFingerprint(elements)` module helper that joins
  `${e.id}:${e.version ?? 0}` per element; added
  `prevFingerprintRef` (`useRef<string>('')`) plus a
  `mountedRef` synchronous-prime block that runs on the
  first render; re-prime inside the existing
  `useEffect([initialData])` *before* calling
  `apiRef.current.updateScene(...)`; guarded
  `handleChange` with `if (fp === prevFingerprintRef.current)
  return;` followed by ref-update. Excalidraw's
  `element.version` only bumps on real mutations, so
  resize/scroll/select/mount-time `onChange` events now
  short-circuit before the existing 500ms debounce.

### Files Read (Context Only)

- `docs/plans/m5-polish-and-stretch.md` — preamble + Task
  14 block. Adopted AC IDs verbatim; followed the plan's
  recommended four-computed-signal shape, module-scope
  `timeFormat`, status-pill palette (`#0a7d3f` on
  `#e6f4ea` / `#666` on `#f0f0f0`), and the inside-`@if`
  placement.
- `docs/task-log/task-13-framework-affordance-panel-chrome.md`
  — predecessor. Confirmed `<div class="body">` wrapper
  pattern, `<app-panel-header>` chrome contract, residual
  `specs/SPEC.md` carry-forward to exclude on commit.
- `packages/shell/src/app/meeting-details.{ts,html,css}` —
  pre-T14 state before adding rows + styles.
- `packages/shell/src/app/meeting.service.ts` — re-verified
  that `applyDrawingChange` / `applyDiagramChange` already
  write `excalidrawUpdatedAt` / `mermaidUpdatedAt` and that
  `currentMeeting` is `computed` over `_meetings` (so the
  new computeds reactively pick up timestamp ticks with no
  service-layer changes).
- `packages/whiteboard/src/App.tsx` — pre-fix state of the
  existing `onChange` handler (already trimmed appState
  via `APPSTATE_KEYS` and debounced 500ms, but had no
  content-vs-cosmetic-change dedup).
- `packages/whiteboard/src/whiteboard-remote.tsx` — to
  confirm the React custom element re-uses a single App
  instance across meeting switches (no remount), which is
  why `useEffect([initialData])` is the meeting-switch
  re-prime site.
- `packages/shared/src/seed-architecture-review.excalidraw.ts`
  — confirmed seed elements do NOT carry a `version`
  field (Excalidraw stamps it at mount). Drove the
  `?? 0` default on the fingerprint helper.
- `node_modules/.pnpm/@excalidraw+excalidraw@0.18.1_…/dist/
  types/excalidraw/element/types.d.ts` — confirmed
  `version: number` is a required field on
  `ExcalidrawElement` and `versionNonce: number` exists,
  validating the fingerprint contract.

### Key Decisions

1. **Module-scope `timeFormat` allocation.** Both the new
   computeds and the existing `dateFormat` allocate their
   `Intl.DateTimeFormat` once at module load. Allocating
   inside a `computed` would create a new instance on
   every signal re-run — wasteful for a hot read path.
   Mirrors the existing pattern.

2. **Two narrow row-status computeds per artifact, not
   one wide row-model computed.** Plan offered the
   four-computed shape; I followed it. Alternative was a
   single `artifactRows` computed returning `{whiteboard:
   {status, ts}, mermaid: {status, ts}}` — denser but
   forces the template to dereference into the object,
   and the row HTML reads cleaner with `excalidrawStatus()`
   / `excalidrawTimestamp()` as direct signals.

3. **Local `ArtifactStatus = 'saved' | 'none'` instead of
   a shared `Meeting`-adjacent type.** The status is a
   presentation concern of `MeetingDetails`. No other
   consumer needs it. Keep it co-located; promote only if
   another panel surfaces artifact status later.

4. **Pill palette — green-on-pale-green for `Saved`,
   neutral grey for `No artifact yet`.** Exact plan
   palette. Borrowed font/spacing from `<app-panel-header>`'s
   chip (11px, 600 weight, `letter-spacing: 0.02em`,
   rounded `999px`) without copying the framework-brand
   colors — these are informational pills, not framework
   chips. Visual kinship without semantic confusion.

5. **`.ts` column gets a `min-width` instead of a fixed
   column-grid.** Two artifact rows, both `flex-direction:
   row` with the same children, so the natural way to
   align the timestamp column is to give `.ts` a
   `min-width: 3.25rem` + `text-align: right`. Avoids a
   CSS grid for two rows — flex is enough.

6. **Producer-side dedup using `element.version`, not
   JSON deep-equal.** User flagged a flood of
   `drawing:changed` events on resize / initial-load /
   scroll mid-task and asked for the cheapest robust fix.
   Two paths considered:
   - (a) JSON.stringify both excalidrawData payloads and
     deep-compare in either the producer or the service.
     Expensive on large drawings, and the appState side
     of the payload would still cause spurious mismatches
     because Excalidraw fills defaults that differ from
     the seed's partial appState.
   - (b) Fingerprint on `element.version`. Excalidraw's
     `Mutation` namespace bumps `version` only on real
     structural changes; non-mutating renders (resize,
     scroll, select, pan, mount) do not call
     `mutateElement` and therefore leave `version`
     unchanged. O(n) on element count, cleanly catches
     the entire flood class.
   Chose (b). Documented one-line tradeoff in code comment
   that this relies on an undocumented-but-stable
   Excalidraw internal contract.

7. **Producer-only guard, no service-layer mirror.**
   Asked the user explicitly. Choice was producer-only —
   the bug is in the producer, fixing it there is
   sufficient. A service-side mirror would be belt-and-
   braces but is out of scope; if a future remote
   over-emits, the guard goes there too.

8. **Re-prime fingerprint before `updateScene`, not
   after.** Excalidraw's `onChange` fires synchronously
   or in a microtask after `updateScene`, before any
   `setTimeout(…, 0)` we could schedule. Priming the ref
   from the elements we're *about to load* — even though
   the seed elements lack `version` (defaulting to `0`) —
   makes the load-echo onChange compare to that same
   `version: 0` shape and match on most renders. Residual:
   if Excalidraw stamps mid-load and the first onChange
   sees `version: 1`, one extra emit on switch; far better
   than the prior flood.

9. **`mountedRef` synchronous prime on first render.**
   Effects run after commit, but Excalidraw's first
   `onChange` can fire as part of its own mount. Doing
   the prime synchronously in the render body (guarded
   by `mountedRef`) makes the dedup robust to that
   ordering. Standard React idiom for "run once during
   the first render."

10. **`excalidrawStatus()` returns `'saved' | 'none'`,
    not a tri-state including the spec's optional
    `'unsaved'`.** Plan explicitly drops the `Unsaved`
    pill from V1: the architecture has no unsaved state
    (every `drawing:changed` / `diagram:changed` is
    persisted synchronously). A pill that always reads
    `Saved` whenever it exists is more honest.

### Test Evidence

— session 2026-05-11

- **Type-check (shell)** — `pnpm -F shell exec tsc
  --noEmit -p tsconfig.json` exits 0 after the
  meeting-details edits land. Covers
  `meeting-details.ts` + the four new computeds + the
  template references. **T14-AC-01 surface verified.**

- **Federate-build (whiteboard)** — `pnpm -F whiteboard
  build:federate:dev` exits with `Whiteboard federate
  build complete.` after the producer-dedup change.
  Confirms the new fingerprint helper, ref priming, and
  `handleChange` guard compile cleanly through the
  Native Federation bundler. (`pnpm -F whiteboard exec
  tsc --noEmit` fails on the pre-existing TS2688
  "Cannot find type definition file for 'node'"
  workspace config issue — unrelated to T14; federate
  build is the authoritative compile gate for this
  package.)

- **Browser verification by user (`:4200` with `:3000`
  + `:4000` running, after `pnpm -F whiteboard
  build:federate:dev`):**
  - Boot with LocalStorage cleared, no meeting
    selected → details panel shows the existing "Select
    a meeting from the calendar." placeholder, no
    artifact rows. **T14-AC-01 ✓**.
  - Click **Architecture Review** → details panel shows
    title + time + attendees + two new rows:
    `Whiteboard [Saved] HH:MM` and `Mermaid [Saved]
    HH:MM`, with timestamps matching the seed's `start`
    in local time. **T14-AC-02 ✓**.
  - Click **Sprint Retro** (T12 seed: `mermaidSource`
    only) → `Whiteboard [No artifact yet]` (no
    timestamp), `Mermaid [Saved] HH:MM`. **T14-AC-03 ✓**.
  - Click **Design Sync** (no artifacts) → both rows
    show `[No artifact yet]`. **T14-AC-04 ✓**.
  - On Architecture Review, edit the Mermaid textarea
    → within ~500ms (existing producer debounce) the
    Mermaid row's timestamp ticks to the current time;
    DevTools → LocalStorage → `frankenstein:meetings`
    → `mermaidUpdatedAt` matches; Whiteboard row
    unchanged. **T14-AC-05 ✓**.
  - On Architecture Review, draw on the Excalidraw
    canvas → ~500ms later the Whiteboard row's
    timestamp ticks; LocalStorage's `excalidrawUpdatedAt`
    matches; Mermaid row unchanged. **T14-AC-06 ✓**.
  - On Sprint Retro (Whiteboard `[No artifact yet]`),
    draw on the canvas → row flips to `[Saved] HH:MM`;
    LocalStorage's Sprint Retro entry now has
    `excalidrawData` + `excalidrawUpdatedAt` populated.
    Switch back to Architecture Review: its Whiteboard
    row still shows the seed's earlier timestamp — no
    cross-meeting bleed. **T14-AC-07 ✓**.

- **Producer-dedup behavior (visual confirmation in
  Event Bus Log panel):**
  - Before fix (user-reported, screenshot): roughly 8
    `drawing:changed` events in 11 seconds with no
    deliberate user activity — triggered by initial
    load + window resize + pointer movement.
  - After fix: bus log is silent across resize,
    scroll, click-to-select, panel-size changes, and
    initial meeting load; `drawing:changed` fires only
    on actual draw/edit/drag, exactly once per ~500ms
    debounce window. User confirmed:
    *"Funktioniert alles so wie es soll."*

- **`pnpm -F shell build` not exercised** — same
  Angular CLI sandbox cache-write hang documented in
  T11–T13 open issues. Browser-boot path covers the
  same compiler surface; `tsc --noEmit` covers the TS
  type surface.

### Acceptance Coverage

(IDs from `docs/plans/m5-polish-and-stretch.md` Task 14
§Acceptance.)

- **T14-AC-01** — `pnpm -F shell build` completes; empty
  state preserved — `partial`. TS surface green via
  `tsc --noEmit`; empty-state visual confirmed by user.
  Full `ng build` still hangs in sandbox per T11 carry-
  forward; user's browser-boot covers the compile pass.
- **T14-AC-02** — Architecture Review: both rows
  `[Saved] HH:MM` matching seed `start` — `passed`.
- **T14-AC-03** — Sprint Retro: Whiteboard `[No artifact
  yet]`, Mermaid `[Saved] HH:MM` — `passed`.
- **T14-AC-04** — Design Sync: both rows `[No artifact
  yet]` — `passed`.
- **T14-AC-05** — Mermaid edit ticks Mermaid row only,
  LocalStorage matches, Whiteboard unchanged — `passed`.
- **T14-AC-06** — Excalidraw edit ticks Whiteboard row
  only, LocalStorage matches, Mermaid unchanged —
  `passed`.
- **T14-AC-07** — Sprint Retro draw flips Whiteboard to
  `[Saved] HH:MM`; switch back to Architecture Review
  shows its own (seed) timestamp — no cross-bleed —
  `passed`.

### Open Issues

- **`specs/SPEC.md` has uncommitted in-progress edits
  from pre-T12.** Continues T12/T13 hygiene: `/commit
  14` must exclude `specs/SPEC.md` from the staging
  list.
- **Mermaid empty-source parse error in panel body** —
  carried forward from T12/T13. Out of scope for T14.
  Cheap follow-on: guard the `mermaid.render()` call
  in `packages/mermaid/src/MermaidEditor.svelte` with
  a whitespace check and show a placeholder.
- **Federate-build is one-shot at dev-server start.**
  Producer-dedup change required `pnpm -F whiteboard
  build:federate:dev` before the host saw the new
  guard. Same DX caveat as T13; a `--watch` mode on
  the federate build is the proper fix.
- **Excalidraw `element.version` is undocumented-but-
  stable.** Producer-dedup relies on the convention
  that `Mutation` bumps `version` only on real
  structural changes. If a future Excalidraw release
  changes this contract, the dedup degrades to "always
  emit" — which is the pre-T14 behavior, not data
  loss. Worth a smoke check after any
  `@excalidraw/excalidraw` major bump.
- **Producer-dedup is whiteboard-only.** Mermaid
  producer (`textarea.oninput` in the Svelte remote)
  is content-only and does not over-emit, so it
  needed no equivalent guard. If a future Mermaid
  remote variant introduces editor-internal re-renders
  that fire `onChange` cosmetically, the same
  fingerprint pattern can be applied there.
- **Appstate-only changes (grid toggle, bg color) no
  longer persist independently.** Fingerprint is over
  elements only; the four `APPSTATE_KEYS` still ship
  in the emit payload but the emit itself is gated on
  element changes. Acceptable for a workshop demo;
  any element edit re-persists the current appState
  alongside.

### Context for Next Task

T15 (README polish + recordable demo-flow walkthrough)
is the next consumer. Relevant state after T14:

- **`MeetingDetails` is the IM5 surface.** Both rows
  are live across boot, meeting switch, Excalidraw
  edit, Mermaid edit, and meeting-without-artifact
  states. T15's demo script can reference them as
  "host-owned context UI reacts within ~500ms to a
  remote-fired bus event with no remote-side coupling."
- **`drawing:changed` cadence is now clean.** Bus Log
  panel during a recording session shows
  `event:selected` on click, then `drawing:changed` /
  `diagram:changed` only when the user actually edits
  — no resize/scroll noise. Makes the bus-log panel
  legible on camera; T15's screenshots can lean on
  this.
- **`element.version`-based dedup pattern is
  documented in code.** If T15 (or any later remote
  refactor) needs to debug "why no emit?", the
  fingerprint helper + the comment above it are the
  reference. Same pattern applies if future remotes
  over-emit.
- **No new shared types or bus contract.** V1 bus
  surface unchanged: `context:request`,
  `event:selected`, `drawing:changed`,
  `diagram:changed`. `Meeting`-level shape
  unchanged.
- **`Intl.DateTimeFormat` instances live module-scope
  in `meeting-details.ts`.** If T15 wants to add
  another time/date display elsewhere, prefer
  importing/extracting a small `formatters.ts` to a
  shared location rather than re-allocating per
  component.
- **Pill palette is local CSS in
  `meeting-details.css`.** If T15 wants to surface
  status pills elsewhere (e.g. bus-log entry severity,
  README screenshot annotations), promote `.pill /
  .pill--saved / .pill--none` to a shared stylesheet.

### Git State

```
git diff --stat
 packages/shell/src/app/meeting-details.css  | 49 +++++++++++++++++++++++++++++
 packages/shell/src/app/meeting-details.html | 20 ++++++++++++
 packages/shell/src/app/meeting-details.ts   | 23 ++++++++++++++
 packages/whiteboard/src/App.tsx             | 21 ++++++++++++-
 specs/SPEC.md                               | 25 +++++++++++++++
 5 files changed, 137 insertions(+), 1 deletion(-)

git status --short
 M packages/shell/src/app/meeting-details.css
 M packages/shell/src/app/meeting-details.html
 M packages/shell/src/app/meeting-details.ts
 M packages/whiteboard/src/App.tsx
 M specs/SPEC.md
```

Stage on `/commit 14`: the four `M packages/{shell,
whiteboard}` files + this log. Do **not** stage
`specs/SPEC.md` — pre-T12 carry-forward, unrelated to
T14's scope.
