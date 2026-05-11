# Task 15 — README polish + recordable demo-flow walkthrough

### Task
Final docs pass turning the running M5 prototype into a
shareable repo: slim, TL;DR-first README with a working
Demo Flow walkthrough; consolidated `docs/` folder
structure; long-form build / clean / standalone story
split into its own doc; all milestones marked complete
in the spec.

### Status
DONE — user ran the 5-step demo flow end-to-end on
the running prototype and confirmed *"Sehr gut, das
klappt bereits."* All four ACs covered, scope
expanded in three user-approved directions during the
session (path consolidation, Milestones-list drop,
result-image add).

### Files Modified

- `readme.md` (modified) — full slim rewrite. Replaced
  prior structure with: tagline + LabNotebook hero,
  new **TL;DR — Run it** block (3 commands +
  port-by-port comment), Architecture sketch
  (preserved ASCII), Tech Stack table (unchanged),
  **Repository Layout** updated for the
  `docs/specs/` move, **Quick Start** with the
  authoritative current scripts (`pnpm -F shell
  start`, `pnpm -F whiteboard dev`, `pnpm -F mermaid
  dev`) + this-week-relative seed note, new **Build
  Modes** subsection (5-row script table + one-paragraph
  `clean`-rationale + link to long-form doc), new
  **Demo Flow** H2 with the Money Shot screenshot at
  the top and the 5-step walkthrough below, Why /
  Out-of-Scope (kept), **Reading Order** rewired to
  Dev.to → SPEC → build-modes → code. **Milestones
  list dropped** entirely (user-approved scope shift;
  see Key Decision #2).

- `specs/SPEC.md` → `docs/specs/SPEC.md` (renamed +
  modified) — `git mv` into the consolidated docs
  tree; on top of the pre-existing T13 carry-forward
  edits (Framework Affordance section + M5 bullet),
  flipped **M4 and M5 checkboxes** from `[ ]` to
  `[x]` at lines 643 / 653. Final spec state: all
  five milestones marked complete.

- `specs/LabNotebook.png` → `docs/specs/LabNotebook.png`
  (renamed) — `git mv` only.

- `specs/svelte-nf-research.md` →
  `docs/specs/svelte-nf-research.md` (renamed) —
  `git mv` only.

- `docs/build-modes.md` (new) — long-form companion
  doc. Contents: two-orthogonal-axes table (standalone
  × dev) for both remotes, host-CLI script table,
  three-part `clean`-script rationale (NF
  cache-poisoning across `ng build` ↔ `ng serve`,
  standalone+federate `dist/`-mixing, stale hashed
  Bootstrap chunks), Standalone-mode explainer,
  **Host-only deps live in devDependencies** block
  (moved verbatim out of README to keep README lean).

- `docs/specs/MoneyShot.png` (new) — application
  screenshot showing localhost:4200 with calendar +
  populated Excalidraw + Mermaid editor + Meeting
  Details with artifact rows + Bus Log. Used as the
  payoff image at the top of the README's **Demo
  Flow** section ("here's what it actually looks
  like").

### Files Read (Context Only)

- `docs/plans/m5-polish-and-stretch.md` — preamble +
  Task 15 block (lines 576–702). AC IDs adopted
  verbatim; plan Step 1–6 followed with three
  user-approved scope expansions (see Key Decisions).
- `docs/task-log/task-14-artifact-metadata-meeting-details.md`
  — predecessor. Confirmed `specs/SPEC.md` was
  already dirty with T13 carry-forward at session
  start and that the carry-forward should be kept
  on the M5 checkbox flip rather than discarded.
- `docs/task-log/task-11-host-mermaid-federation.md`
  — *the* canonical script-rename + clean-script
  source. Drove the Build Modes section content
  (`start:standalone:dev`, `dev`, `build:federate:dev`,
  `clean`, the `ngDevMode` shim + NF cache-poisoning
  story).
- `docs/task-log/task-10-mermaid-federation.md` —
  earlier `build:federate:debug` (since renamed) +
  `dist/` accumulation observation. Cross-referenced
  into Build Modes section.
- `docs/task-log/task-7-whiteboard-remote-standalone.md`
  — origin of the standalone-vs-federate split
  ("plain React app + opt-in federate build") that
  drove the four-script shape. Cross-referenced into
  Build Modes section.
- `packages/{shell,whiteboard,mermaid}/package.json`
  — authoritative script names; verified each
  command in the README's TL;DR and Quick Start
  matches what the package.json actually exposes.
- `packages/shell/src/main.ts` — confirmed
  `initFederation('federation.manifest.json', ...)`
  and `hostRemoteEntry: './remoteEntry.json'` are
  already relative (informed the M6 plan; no T15
  source edit).
- `packages/{whiteboard,mermaid}/public/index.html`
  — confirmed standalone HTMLs use relative
  `<script src="main.js">` / `<link href="main.css">`
  (informed the M6 plan).
- `packages/whiteboard/build.mjs` — confirmed the
  unified `--dev` flag semantics
  (sourcemaps + non-minified + `NODE_ENV=development`)
  for the Build Modes table.

### Key Decisions

— session 2026-05-11

1. **Move `specs/` → `docs/specs/`.** User flagged the
   split between `specs/` and `docs/plans/` +
   `docs/task-log/` as fragmentation. Single
   `docs/` root makes the docs surface cohesive
   (`docs/specs/`, `docs/plans/`, `docs/task-log/`,
   plus the new `docs/build-modes.md`). Done as
   `git mv specs docs/specs` so history is
   preserved. Two README references updated
   (`docs/specs/LabNotebook.png`, `docs/specs/SPEC.md`).
   No other refs outside `docs/` (verified via grep).
   The plan's T15-AC-03 references
   `specs/SPEC.md` line 653; AC is re-mapped to
   `docs/specs/SPEC.md` line 653. Documented as a
   plan amendment.

2. **Drop the Milestones list from the README
   entirely.** User reflection during plan
   discussion: "Ich frage mich gerade, ob die
   Meilensteine überhaupt in die Readme gehören.
   Das war ja eher meine persönliche
   Entwicklungsleitlinie." Reader-value test agrees:
   visitors care about *what this is*, *how to run
   it*, *what it demonstrates* — not the build
   roadmap. Full milestone history lives in
   `docs/plans/` + `docs/task-log/`. Plan
   T15-AC-01 partially deviates: "Milestones list
   shows five `- [x]` lines" no longer applies;
   the underlying intent (M-status visible) is
   satisfied by the Status block ("All five
   milestones complete") + the `docs/specs/SPEC.md`
   checkboxes.

3. **Flip M4 checkbox in SPEC.md too, not only M5.**
   Plan literally specifies only the M5 flip at
   line 653, but M4 has been done since commit
   `78b3413` (Mar 2026's "docs: mark M1–M3
   milestones as complete in README and SPEC"
   missed M4 because at that time M4 was indeed
   still incomplete; the catch-up never happened).
   User confirmed: *"1. ja"*. Both lines flipped
   in one edit pass.

4. **Slim README; long form into linked sub-docs.**
   User principle: *"Ich möchte grundsätzlich das so
   haben, dass die Readme nicht total fett ist. Die
   soll schon übersichtlich sein, komplexe Blöcke in
   eigene Markdown Dateien verschieben und verlinken
   im Notfall."* Two extractions:
   - The build-mode / clean-script / standalone story
     → new `docs/build-modes.md`.
   - The **Host-only deps live in devDependencies**
     block (formerly README lines 50–69) → moved
     verbatim into `docs/build-modes.md` as its own
     section. Replaced in README with a one-line
     pointer ("…see [`docs/build-modes.md`](...) for
     the full story (including why `Schedule-X` lives
     in `devDependencies`)").

5. **TL;DR at the top, under the tagline.** User asked
   for my recommendation. Chose top placement (before
   "Status" / status now removed) because the
   impatient-reader path (open repo → see commands →
   run) is the most common entry. The narrative
   sections (Why This Pattern, Out of Scope) follow
   for readers who want the framing.

6. **Hero image stays `LabNotebook.png`; new
   `MoneyShot.png` placed at the top of Demo Flow.**
   User explicitly wanted both: *"Ich finde es ganz
   interessant zu sehen, wie wir es geplant haben
   und was am Ende rausgekommen ist."* The lab
   notebook is the story device (vision); the money
   shot is the result-payoff. Placing them in
   narrative order (vision at top, result at the
   working-it-yourself point) keeps the
   project-identity framing while still showing the
   real thing. Caption: *"Money Shot — Architecture
   Review with both remotes populated."*

7. **No new Deployment content in T15.** Mid-session
   the user raised deployment to
   `lutzleonhardt.de/frankenstein-meeting-room/`.
   Decision: explicitly out of T15 scope. Spawned
   M6 plan (`docs/plans/m6-deployment.md`) as a
   separate, planned-then-committed unit. T15 stays
   the M5 closer; M6 is its own milestone. The M6
   plan file is intentionally **not** staged into
   T15's commit — it gets its own
   `plan: M6 deployment to subpath` commit
   (analogous to commit `b252567 plan: M5 polish +
   stretch`).

8. **`docs/build-modes.md` describes scripts as they
   are, not as a deployment guide.** Deferred the
   "and here's how to build a deployable bundle"
   content to M6 / `docs/deployment.md`. `build-modes.md`
   stops at "what does each per-package script do
   and why does the `clean` script exist" — the
   subpath / orchestration story is a different
   document because it's a different abstraction
   level (workspace-orchestration, not per-package
   build).

### Test Evidence

— session 2026-05-11

- **README script-table cross-check.** Inspected
  `packages/{shell,whiteboard,mermaid}/package.json`
  `scripts` blocks against the README's TL;DR + Quick
  Start commands. Shell: `start`, `build`, `clean`
  match. Remotes: `start:standalone:dev`,
  `build:standalone`, `build:federate`,
  `build:federate:dev`, `dev`, `clean` all present
  and named per the README. **T15-AC-02 surface
  verified.**

- **`docs/specs/SPEC.md` diff bounded.**
  `git diff docs/specs/SPEC.md` shows: T13
  carry-forward (Framework Affordance section,
  lines 540–566 in the new state; M5 bullet at
  line 656) **plus** the M4 (643) and M5 (653)
  checkbox flips. No unrelated edits leaked.
  **T15-AC-03 verified.**

- **`grep -rn 'specs/' --exclude-dir=docs ...`** after
  the rename returns only the three intentional
  README references (`docs/specs/LabNotebook.png`
  on line 9, the literal `specs/SPEC.md` inside the
  Repository Layout ASCII tree on line 62 where it's
  scoped under the `docs/` parent shown two lines
  above, and `docs/specs/SPEC.md` in Reading Order).
  No stale `specs/`-prefixed paths remain.

- **Demo flow end-to-end (user-run).** With all
  three dev servers up (`pnpm -F whiteboard dev`,
  `pnpm -F mermaid dev`, `pnpm -F shell start`)
  and LocalStorage cleared, the user walked the
  5-step README walkthrough end-to-end. Result:
  *"Sehr gut, das klappt bereits."* No fix-ups
  required; no console errors reported.
  **T15-AC-04 verified (empirical gate, user-run).**

- **`pnpm -F shell build` not exercised.** Same
  Angular CLI sandbox cache-write hang documented
  in T11–T14 open issues. T15 introduces no
  Angular source changes; the browser-boot path
  covers the rendering surface. The new Demo Flow
  section's correctness is gated on the running
  dev servers, which the user ran.

### Acceptance Coverage

(IDs from `docs/plans/m5-polish-and-stretch.md` Task 15
§Acceptance.)

- **T15-AC-01** — `partial` (with approved deviation).
  Status block reflects M1–M5 complete: ✓
  ("All five milestones complete" — phrased without
  the checkbox list).
  Milestones-list five `[x]`: **N/A** — list dropped
  from README by user-approved plan amendment (Key
  Decision #2). The underlying done-status is visible
  via the Status text + the `docs/specs/SPEC.md` `[x]`
  marks for M1–M5.
  Demo Flow H2 present and matches Step 4 script: ✓.

- **T15-AC-02** — `passed`. Each command in the README
  (`pnpm -F whiteboard dev`, `pnpm -F mermaid dev`,
  `pnpm -F shell start`) matches the corresponding
  package's `package.json#scripts`. User-run dev
  flow proves the copy-paste path is correct.

- **T15-AC-03** — `passed` (with approved deviation).
  `docs/specs/SPEC.md` (path remapped from `specs/`
  per Key Decision #1) line 653 reads `### [x] M5 —
  Polish + Stretch`. Plan also asks for the diff to
  contain "only intentional edits" — confirmed: the
  diff is T13 carry-forward (intentional, kept) +
  the M4 + M5 checkbox flips (M4 was the
  user-approved expansion per Key Decision #3).

- **T15-AC-04** — `passed`. Empirical demo-flow gate
  ran clean against the running prototype with
  cleared LocalStorage; user confirmed end-to-end
  ("Sehr gut, das klappt bereits."). No console
  errors surfaced that would have required a code
  fix.

### Open Issues

- **`docs/plans/m6-deployment.md` is in the working
  tree but not part of T15's commit.** Intentional.
  Stage and commit it as a separate
  `plan: M6 deployment to subpath` commit after
  `/commit 15` lands, mirroring the prior
  `plan: M5 polish + stretch` pattern.

- **`pnpm -F shell build` still hangs in the
  Claude-Code sandbox.** Carried from T11–T14.
  Unchanged by T15. Browser-boot path covers the
  same compiler surface for verifying T15's
  README/SPEC edits. Real fix is environmental;
  not a T15 concern.

- **Live-demo URL not yet linked from README.**
  Deferred to T18 (M6). User has indicated
  intent to deploy to
  `lutzleonhardt.de/frankenstein-meeting-room/`;
  the README's "Live Demo" link lands in T18 once
  the bundle exists and has been uploaded.

- **Mermaid empty-source console warning carried
  forward.** Same one-line `MermaidEditor.svelte`
  whitespace-guard follow-on noted in T12/T13/T14.
  Did not block the T15-AC-04 demo-flow gate; the
  user's run was clean.

### Context for Next Task

T16 (M6 — Shell deployable under a subpath) is the
next consumer. Relevant state after T15:

- **`docs/` is the canonical writing root.** `specs/`
  no longer exists at repo root. Any new docs go
  under `docs/{specs,plans,task-log}/` or as
  top-level companion files (`docs/build-modes.md`).
  M6's `docs/deployment.md` follows the same
  pattern.
- **README is lean.** New deployment content in T18
  must respect the user's "Readme nicht total fett"
  principle — long form into `docs/deployment.md`,
  README gets a short Live Demo line + a Reading
  Order entry.
- **`docs/specs/SPEC.md` is all five milestones `[x]`.**
  T18 will append a short Deployment section after
  Milestones, before "Out of Scope (Production
  Concerns)".
- **`docs/build-modes.md` exists as the natural
  cross-link target.** T18 adds a short Deployment
  subsection at the bottom of `build-modes.md`
  pointing into `docs/deployment.md`.
- **`docs/plans/m6-deployment.md` is the executing
  plan.** Ready to feed `/start-task 16` once the
  T15 commit + M6-plan commit have landed.
- **Manifest swap is manual.** User's decision
  (recorded in the M6 plan preamble): the dev/prod
  manifest split is a manual edit, no automated
  swap. T18's `docs/deployment.md` must make this
  step impossible to miss.
- **Shell `initFederation` call is already
  subpath-portable.** Verified during T15 docs
  research; no source change anticipated in T16.

### Git State

```
git diff --stat
 docs/specs/SPEC.md |  29 +++++++++++++-
 readme.md          | 110 +++++++++++++++++++++++++++++------------------------
 2 files changed, 87 insertions(+), 52 deletions(-)

git status --short
R  specs/LabNotebook.png        -> docs/specs/LabNotebook.png
RM specs/SPEC.md                -> docs/specs/SPEC.md
R  specs/svelte-nf-research.md  -> docs/specs/svelte-nf-research.md
 M readme.md
?? docs/build-modes.md
?? docs/plans/m6-deployment.md
?? docs/specs/MoneyShot.png
```

Stage on `/commit 15`:
- the three `R`/`RM` renames under `docs/specs/`
- `M readme.md`
- new `docs/build-modes.md`
- new `docs/specs/MoneyShot.png`
- this log (`docs/task-log/task-15-readme-polish-demo-flow.md`)

**Do NOT stage** `docs/plans/m6-deployment.md` on the
T15 commit — it gets its own
`plan: M6 deployment to subpath` commit immediately
afterwards (mirroring the `plan: M5 polish + stretch`
pattern in commit `b252567`).
