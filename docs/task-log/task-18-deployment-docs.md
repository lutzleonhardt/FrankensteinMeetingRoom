# Task 18 — Deployment docs + SPEC.md Deployment section + README live-demo link

### Task
Document the build-and-deploy workflow as a single canonical
reference (`docs/deployment.md`), append a short Deployment
section to `docs/specs/SPEC.md`, surface the live-demo URL
prominently in `readme.md`, and add a one-paragraph
cross-link from `docs/build-modes.md`.

### Status
DONE. Three of four ACs (`T18-AC-01..03`) verified
internally; `T18-AC-04` is the empirical live-demo gate and is
**`pending`** — the plan explicitly permits this because the
upload to `lutzleonhardt.de/frankenstein-meeting-room/` is
out-of-process operations work. User confirmed during this
session that the demo currently only runs locally on
`http://localhost:8088/frankenstein-meeting-room/` (the T17
smoke setup, still standing); the canonical production URL is
not yet live.

### Files Modified

- `docs/deployment.md` (new, 175 lines) — canonical
  build-and-deploy reference. Sections, top to bottom: framing
  paragraph + live-demo link → target deployment tree (copied
  from the plan preamble, plus the three post-deploy URLs that
  match XC-01) → numbered Build Steps 1–4 (manifest swap with
  the corrected `./`-prefixed example, `pnpm build:deploy`,
  upload, revert) → dedicated *Why the `./` prefix matters*
  paragraph (importmap-spec → es-module-shims strictness; T17
  Key Decision #2 made canonical) → Server requirements
  (static, no CORS, no SPA fallback needed, MIME for `.json`)
  → Local verification recipe (rename + `npx serve` + 8088)
  → Troubleshooting (the three plan-listed failure modes +
  stale-artefact note + Excalidraw-fonts back-stop) →
  Operations note that the actual upload is out-of-repo.
  Manifest example uses *only* the corrected `./`-prefixed form
  per T17 Open Issue #1.

- `docs/specs/SPEC.md` (modified, +8 lines) — new `##
  Deployment` section inserted between `## Milestones` (ends
  line 665) and `## Explicit Out of Scope` (now starts line
  677). Two short paragraphs:
  1. The app deploys as a fully-static bundle under a subpath,
     all three packages co-host in one directory tree, no
     server logic, no CORS — federation works because the
     manifest uses paths relative to `document.baseURI`.
  2. Pointer to `docs/deployment.md` for the build process;
     live demo URL link.
  Within the plan's 5–10-line budget (6 content lines + 2
  blank + 1 heading + 1 trailing rule).

- `readme.md` (modified, +4 / −1 lines) — two edits:
  1. New line at row 5, directly after the tagline blockquote
     and before "A deliberately small demo…":
     `**Live demo →** <https://lutzleonhardt.de/frankenstein-meeting-room/>`.
     Placement chosen for maximum prominence (first
     anchor/link below `# H1`) per user request to surface
     the live URL as a route back to lutzleonhardt.de.
  2. Reading Order entry #4 (between the existing
     `build-modes.md` entry and the "code, package by
     package" closer): pointer to `docs/deployment.md` for
     the build-and-deploy workflow. Re-numbers the original
     entry 4 → 5; no other reordering.

- `docs/build-modes.md` (modified, +9 lines) — new `##
  Deployment` subsection appended at the bottom (after
  `## Host-only deps live in devDependencies`). Two short
  sentences: (a) full build-and-deploy story is in
  `docs/deployment.md`; (b) explicit one-line callout that
  the deploy manifest uses `./`-prefixed values, *not* the
  bare form some earlier notes show — links to deployment.md
  for the explanation. Satisfies T17 Open Issue #1's
  request for a back-stop note here, so future readers don't
  follow T16/plan-text patterns blindly.

### Files Read (Context Only)

- `docs/plans/m6-deployment.md` — preamble (lines 1–108) +
  Task 18 block (lines 336–449). AC IDs and Step 1–4
  structure followed verbatim; preamble's target-deployment
  tree reused in `docs/deployment.md`'s Layout section so
  the two documents agree word-for-word.
- `docs/task-log/task-17-repo-build-orchestration.md` —
  direct predecessor. Carried six T17 facts forward:
  (1) `./`-prefixed manifest values are the canonical form
  (Key Decision #2, Open Issue #1 → made canonical in
  `docs/deployment.md`), (2) pre-flight WARN's bare-form
  example is still stale (Open Issue #3 → flagged below,
  intentionally NOT fixed by T18), (3) `pnpm build:deploy`
  produces a self-contained `dist/deploy/` tree, (4)
  smoke-serve recipe (rename + `npx serve -l 8088`),
  (5) orchestrator implementation details NOT to document
  (per-remote `public/index.html` copy, Excalidraw font
  cpSync, font duplication), (6) AC-04 is empirical and may
  be marked `pending`.
- `docs/task-log/task-16-shell-deploy-subpath.md` — searched
  via `rg -l 'build-modes\.md|docs/deployment'` together with
  T15/T17. Skimmed only for confirmation that T16's plan-text
  manifest swap was the bare-form one (now superseded by
  T17's `./`-prefix correction); did not pull additional facts
  forward beyond what T17's log already carried.
- `docs/task-log/task-15-readme-polish-demo-flow.md` — read
  for the README's current TL;DR, Reading Order, and Demo
  Flow shape so the live-demo insertion + new Reading Order
  bullet land without disturbing T15's structure.
- `readme.md` — full file read for current section structure
  (lines 1–163) before editing.
- `docs/specs/SPEC.md` (lines 605–690, plus heading skeleton
  via `grep -n '^## '`) — to confirm the insertion point
  between Milestones and Out of Scope is a clean 2-line gap
  (`---` + blank), no surrounding edits needed.
- `docs/build-modes.md` (lines 120–173) — to find the
  bottom of the file and confirm a new `##` heading fits
  without colliding with the existing `## Host-only deps…`
  section.
- `git log --oneline -- readme.md docs/specs/SPEC.md
  docs/build-modes.md` — verified per-file history;
  no recent surprises. Last touch on readme/SPEC was T15/T16
  for cosmetic milestone updates.

### Key Decisions

— session 2026-05-11

1. **README live-demo placement: row 5, between tagline
   blockquote and first prose paragraph.** User asked for
   prominent positioning because the link is a discoverable
   route back to `lutzleonhardt.de`. Options considered:
   - Inside `## TL;DR — Run it` (original briefing
     proposal) — sits below the LabNotebook image and the
     "Remote owns capability…" pull-quote; less prominent
     than the top.
   - Right after `# H1`, before the tagline — would
     break the existing rhythm (tagline is currently the
     first thing under the title, intentionally setting the
     "three frameworks" framing).
   - **Right after the tagline blockquote, before the
     descriptive paragraph.** First anchor/link below H1,
     above the LabNotebook image, above the fold on
     practically every viewport. Chosen.
   Format: `**Live demo →** <https://...>`. The `→` arrow
   is a Unicode glyph already used elsewhere in the repo
   docs and is not an emoji; the auto-mode emoji prohibition
   does not apply. Bold + angle-bracketed URL renders as a
   clickable link in GitHub's markdown and reads as a
   call-to-action.

2. **Manifest example: only the `./`-prefixed form, no
   "see also the bare form" footnote.** T17 made it
   empirically clear the bare form does not work in
   production (es-module-shims rejects). Showing both
   forms in `docs/deployment.md` would only invite
   confusion — readers copy-paste from docs, not from
   prose. The `./`-prefixed form is the only valid form
   and is presented as such throughout the new doc. The
   reasoning gets its own short section (*Why the `./`
   prefix matters*) so readers who arrive via the plan
   text or T16's log understand *why* the docs diverge
   from those older notes.

3. **`docs/build-modes.md` cross-link explicitly mentions
   the `./`-prefix gotcha.** T17 Open Issue #1 asked for a
   one-line note here so future readers don't follow
   T16/plan-text patterns blindly. The new Deployment
   subsection is two sentences (one pointer, one gotcha
   callout) — the gotcha sentence makes the file useful as
   a stepping-stone to `docs/deployment.md` even for a
   reader who only ever skims build-modes.md.

4. **Pre-flight WARN message in `scripts/build-deploy.mjs`
   left untouched.** T17 Open Issue #3 flagged the WARN's
   example payload as still showing the bare-relative
   manifest form. Plan-listed T18 Key Locations
   intentionally do *not* include `scripts/build-deploy.mjs`
   — it's an orchestrator script, outside the docs remit.
   Options considered:
   - Fix it as part of T18 (small one-line edit, would
     close the T17 open issue).
   - **Leave it for a separate trivial follow-on or a
     future maintenance pass.** Chosen — T18's diff stays
     pure docs, and the canonical `./`-prefixed form is
     now established in `docs/deployment.md` and
     `docs/build-modes.md`, so a reader who hits the WARN
     and follows its example will *also* land on the
     correct docs within one link-hop. Surfaced as an
     Open Issue below so it doesn't get lost.

5. **`T18-AC-04` marked `pending`, not blocked.** Plan
   text explicitly permits this — the upload to
   `lutzleonhardt.de` is operations work, not part of the
   repo's responsibility. User confirmed mid-session that
   the demo currently runs only on the T17 smoke server
   (`localhost:8088`). The README, SPEC, and deployment.md
   all link to the canonical production URL; T18 is
   "DONE pending upload", which is the form the plan
   describes.

6. **Live-demo URL appears three times across the
   committed docs, intentionally.** Once in `readme.md`
   (top, prominent CTA), once in `docs/specs/SPEC.md`
   (Deployment section, inline link), once in
   `docs/deployment.md` (framing paragraph). Some
   duplication, but each surface has a different reader:
   README readers may never open the spec; spec readers
   may never read deployment.md; deployment.md readers
   are already in build-and-deploy mode and benefit from
   the URL being visible as the post-deploy target.
   Cost: one URL string in three places. Acceptable.

### Test Evidence

— session 2026-05-11

- **T18-AC-01 — `docs/deployment.md` walks clean-checkout
  to deployable `dist/deploy/`, manifest swap is explicit.**
  Verified by self-review: opened the new file cold
  (`wc -l docs/deployment.md` → 175). Build Steps section
  presents the manifest swap as its own numbered Step 1
  with a code block showing the corrected `./`-prefixed
  shape; not buried in prose. Steps 2–4 follow
  (`pnpm build:deploy` → upload → revert manifest). The
  file links out to `readme.md#demo-flow` for the
  end-to-end verification flow, closing the loop. **AC-01
  passed.**

- **T18-AC-02 — SPEC.md has Deployment section between
  Milestones and Out of Scope, links to deployment.md +
  live URL.** Verified via `grep -n '^## ' docs/specs/SPEC.md`:
  ```
  610:## Milestones
  669:## Deployment
  677:## Explicit Out of Scope
  ```
  Insertion sits cleanly between the two flanking
  sections. Line-range check `sed -n '669,676p'` shows the
  new section is 2 paragraphs (6 content lines + 1
  heading + blank lines), within the plan's 5–10-line
  budget. Both required links present: `docs/deployment.md`
  via relative path `../deployment.md` (correct because
  SPEC.md lives in `docs/specs/`, deployment.md lives in
  `docs/`) and the live-demo URL. **AC-02 passed.**

- **T18-AC-03 — `readme.md` shows Live Demo link near top
  + Reading Order references `docs/deployment.md`.**
  Verified via `grep -n 'Live demo\|deployment\.md' readme.md`:
  ```
  5:**Live demo →** <https://lutzleonhardt.de/frankenstein-meeting-room/>
  161:4. [`docs/deployment.md`](docs/deployment.md) for the build-and-deploy workflow that produces the live demo.
  ```
  Row 5 is directly after the tagline blockquote (row 3)
  and before the descriptive paragraph (row 7), which is
  the most prominent location below `# H1`. Reading Order
  entry inserted as new bullet 4; original bullet 4 ("The
  code, package by package.") becomes bullet 5. **AC-03
  passed. Touches XC-01** — the Live Demo link is the
  user-facing surface that makes the three deployed URLs
  (integrated app + two standalone remotes) discoverable.

- **T18-AC-04 — Live URL resolves to a working page,
  T15 demo flow runs without console errors.** **Pending.**
  Empirical gate, plan-text explicitly out-of-process. The
  bundle has been verified by T17-AC-02..05 against the
  local smoke server (`http://localhost:8088/frankenstein-meeting-room/`);
  AC-04 differs only by serving the same bundle from
  `lutzleonhardt.de` instead of localhost. Will be
  manually verified post-upload by reloading the live URL
  with cleared LocalStorage and running the 5-step demo
  flow from `readme.md#demo-flow`. No code-side risk:
  if AC-02..05 passed locally and the manifest is in
  `./`-prefixed shape at upload, AC-04 follows
  deterministically.

- **Cross-link integrity check.** Confirmed all four
  new/edited docs cross-reference each other consistently:
  - `readme.md` → `docs/deployment.md` (Reading Order)
  - `docs/specs/SPEC.md` → `../deployment.md` (Deployment section)
  - `docs/build-modes.md` → `deployment.md` (Deployment subsection)
  - `docs/deployment.md` → `../readme.md#demo-flow` (verification recipe)
  Each link uses the correct relative path from its source
  file's directory. No 404s on the relative-path math.

- **Diff scope check.** `git diff --stat`:
  ```
   docs/build-modes.md | 9 +++++++++
   docs/specs/SPEC.md  | 8 ++++++++
   readme.md           | 5 ++++-
   3 files changed, 21 insertions(+), 1 deletion(-)
  ```
  Plus untracked `docs/deployment.md` (175 lines, new).
  Four files touched, exactly matching the plan's Key
  Locations list. No collateral edits, no whitespace churn,
  no out-of-scope additions.

### Acceptance Coverage

(IDs from `docs/plans/m6-deployment.md` Task 18 §Acceptance.)

- **T18-AC-01** — `passed`. `docs/deployment.md` written
  from clean-checkout perspective; manifest swap is its
  own numbered Step 1 with the corrected `./`-prefixed
  example, not buried in prose. The four numbered Build
  Steps (swap → `pnpm build:deploy` → upload → revert)
  walk a reader end-to-end.

- **T18-AC-02** — `passed`. SPEC.md now has a `##
  Deployment` section between `## Milestones` (line 610)
  and `## Explicit Out of Scope` (line 677). Within the
  plan's 5–10-line budget; two paragraphs; links out to
  `docs/deployment.md` for the build process and to the
  live-demo URL.

- **T18-AC-03** — `passed`. `readme.md` shows
  `**Live demo →** <https://lutzleonhardt.de/frankenstein-meeting-room/>`
  on line 5, directly under the tagline blockquote — the
  most prominent location below `# H1`. Reading Order
  entry #4 references `docs/deployment.md`. **Touches
  XC-01** — the live-demo link is the first surface that
  makes XC-01's three deployed URLs discoverable from the
  repo entry point.

- **T18-AC-04** — `pending`. Empirical live-demo gate;
  plan text explicitly permits closing T18 DONE with this
  AC pending because the upload to
  `lutzleonhardt.de/frankenstein-meeting-room/` is
  operations work. To be verified post-upload by reloading
  the canonical production URL with cleared LocalStorage
  and running the T15 demo flow. **Touches XC-01.**

### Open Issues

- **Pre-flight WARN payload in `scripts/build-deploy.mjs`
  still cites bare-relative manifest form.** Carried over
  from T17 Open Issue #3. The script's
  `console.log` block prints the recommended replacement
  manifest as `{"whiteboard": "whiteboard/remoteEntry.json",
  ...}` (bare); the empirically-correct form is
  `{"whiteboard": "./whiteboard/remoteEntry.json", ...}`.
  Left as-is because (a) plan-listed Key Locations for
  T18 exclude `scripts/build-deploy.mjs` — it's
  orchestrator code, not docs; (b) the canonical
  `./`-prefixed form is now established in
  `docs/deployment.md` and `docs/build-modes.md`, so a
  reader following the WARN's stale example will land on
  the correct docs within one cross-link hop. Could be
  closed by a trivial one-line edit to the WARN string
  in a future small task or follow-on commit. No
  follow-up task filed.

- **`T18-AC-04` empirical gate pending upload.** Documented
  above in Acceptance Coverage. Not a follow-up task —
  the upload itself is operations work, not repo work.
  When the upload happens, this AC closes by manual
  browser verification against the canonical URL. If the
  bundle fails the gate post-upload, a small follow-on
  task can be filed *then*; pre-emptive task-filing now
  would be speculative.

- **Standalone-bundle font duplication.** Carried forward
  from T17 Open Issue #2. Not a T18 concern (orchestrator
  implementation detail, not docs). No follow-up task
  filed; flagged here so a future maintainer doesn't
  paper over the duplication without context.

- **Mermaid empty-source console warning.** Carried
  forward from T12–T17. Did not surface on the T18 doc
  edits (no code touched). Still latent.

### Context for Next Task

T18 closes M6 — there is no T19 in the plan, and no
further task block follows. The deployment story is
end-to-end documented and the live-demo entry point is
prominent in the README. Forward-looking notes for
*future* work (M7+ or a maintenance pass):

- **Live-demo upload.** The one outstanding pre-acceptance
  step. When it happens, `T18-AC-04` closes; if any of
  the three deployed URLs (integrated app + two
  standalone remotes) fails on the live origin, file a
  small follow-on task pointing back at this log.
- **Pre-flight WARN message follow-on.** Trivial
  one-line edit to `scripts/build-deploy.mjs` to update
  the example payload to `./`-prefixed shape. Could be
  bundled into any future maintenance pass on the
  orchestrator. Until then, the docs absorb the
  inconsistency by being the canonical reference.
- **Documentation surface remains stable.** `readme.md`,
  `docs/specs/SPEC.md`, `docs/build-modes.md`, and
  `docs/deployment.md` now form a closed
  cross-reference graph for the deployment story. Future
  edits to any one of them should preserve the four
  cross-links inventoried in Test Evidence above.
- **Manual manifest swap is the deployment's one
  moving part.** The docs (deployment.md Step 1 +
  build-modes.md gotcha note + the orchestrator's
  pre-flight WARN) all surface it. If a future deploy
  fails for a reason that maps back to the manifest, the
  most likely cause is still "forgot to swap" or "swap
  shape wrong" — exactly the failure modes the docs
  enumerate.
- **Cross-cutting acceptance (XC-01).** M6's cross-cutting
  AC is touched by T16, T17, T18. T18's contribution is
  the discoverability surface (Live Demo link, Reading
  Order entry, SPEC reference) — XC-01 itself only fully
  resolves post-upload alongside `T18-AC-04`.

### Git State

```
git diff --stat
 docs/build-modes.md | 9 +++++++++
 docs/specs/SPEC.md  | 8 ++++++++
 readme.md           | 5 ++++-
 3 files changed, 21 insertions(+), 1 deletion(-)

git status --short
 M docs/build-modes.md
 M docs/specs/SPEC.md
 M readme.md
?? docs/task-log/task-18-deployment-docs.md
?? docs/deployment.md
```

Stage on `/commit 18`:
- `M readme.md` (Live Demo line + Reading Order entry)
- `M docs/specs/SPEC.md` (Deployment section)
- `M docs/build-modes.md` (Deployment subsection)
- new `docs/deployment.md` (full deployment reference)
- this log
  (`docs/task-log/task-18-deployment-docs.md`)

No code files changed. T18 is pure docs.
