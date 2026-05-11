# Build Modes

How the host and the two remotes are built, what each script does,
and why the `clean` script exists. The short version lives in the
[README](../readme.md#build-modes); this file is the deep dive.

## Two orthogonal axes (remotes only)

The two remote packages (`whiteboard`, `mermaid`) build the same
source code in four configurations along two independent axes:

|                   | **standalone** (own dev server, mock host) | **federate** (remoteEntry for the shell) |
|-------------------|--------------------------------------------|------------------------------------------|
| **dev** (`--dev`) | `start:standalone:dev`                     | `build:federate:dev`                     |
| **prod**          | `build:standalone`                         | `build:federate`                         |

`--dev` and `--federate` are independent flags inside each remote's
`build.mjs`. `--dev` flips sourcemaps on, minification off, swaps
React dev builds in (whiteboard), and sets
`NODE_ENV=development`. `--federate` switches the entry point from
the standalone HTML page to the Native Federation bootstrap that
emits `dist/remoteEntry.json`.

For day-to-day host-integration work, the shortcut is:

```bash
pnpm -F whiteboard dev   # build:federate:dev → start:standalone:dev
pnpm -F mermaid dev      # same shape
```

That sequence produces a federated `remoteEntry.json` for the
shell *and* starts the remote's own dev server on its standalone
port, so you can poke the remote in isolation while the shell
loads it via Native Federation.

## Host

The Angular shell uses the standard CLI:

| Script                        | What it does                                                                  |
|-------------------------------|-------------------------------------------------------------------------------|
| `pnpm -F shell start`         | `ng serve` on `:4200`                                                          |
| `pnpm -F shell build`         | Production Angular build via `@angular/build` (wrapped — see below)            |
| `pnpm -F shell build:deploy`  | `build` + `--base-href /frankenstein-meeting-room/` for the M6 subpath bundle  |
| `pnpm -F shell watch`         | `ng build --watch --configuration development`                                 |
| `pnpm -F shell clean`         | `rm -rf dist .angular/cache node_modules/.cache/native-federation`             |

The host has no `--dev` flag of its own — Angular's `start` is
already a dev server, `build` is already prod. The remotes are
loaded at runtime from their own dev servers, so the host doesn't
need to know which mode they are in.

### Why `build` / `build:deploy` go through a Node wrapper

Both scripts shell out to `scripts/ng-build.mjs`, not directly to
`ng build`. The `@angular-architects/native-federation-v4` builder
finishes writing the artifacts (`dist/shell/browser/index.html` and
chunks) but then does not exit — the NF post-step hangs
indefinitely. Manual usage is fine (`Ctrl-C` once the bundle
summary prints), but it's a silent trap when running under an
agent or in CI: the wrapper sees no completion event and the
build appears stuck.

The wrapper sidesteps this without trying to fix the upstream
issue:

1. Pre-delete `dist/shell/browser/index.html` so a prior artifact
   can't masquerade as a successful re-build.
2. Run `ng build …` in its own process group with `stdio:
   'inherit'` (full output preserved).
3. Poll for `dist/shell/browser/index.html`. When it appears,
   `SIGKILL` the process group and exit `0`.
4. If `ng build` exits on its own before the artifact appears,
   propagate its exit code — real compile errors are not masked.
5. Hard ceiling of 5 minutes guards against a genuinely stuck
   build (never hit in normal operation; would indicate a real
   problem).

Net effect: `pnpm -F shell build` and `pnpm -F shell build:deploy`
exit cleanly in seconds with the same artifacts as a hand-killed
`ng build`. The wrapper lives at `packages/shell/scripts/ng-build.mjs`.

## Why the `clean` script exists

Both remote and shell `clean` scripts wipe `dist/` plus
framework-specific caches. Three concrete reasons drove them in:

### 1. NF cache poisoning across `ng build` ↔ `ng serve`

The Angular host uses
`@angular-architects/native-federation-v4`. Switching between
production builds (`ng build`) and dev serves (`ng serve`) can
leave a poisoned Native Federation cache in
`node_modules/.cache/native-federation` that causes a runtime
`ngDevMode is not defined` crash on the next boot — the cached
share entries reference symbols that the other mode doesn't
provide.

A guarded pre-bootstrap shim in `packages/shell/src/main.ts`
(`(globalThis as { ngDevMode?: unknown }).ngDevMode ??= false`)
absorbs the crash so the page still boots, but the real fix is
to clear the cache when transitioning modes — that's what
`pnpm -F shell clean` does.

### 2. Mixed standalone + federate artefacts in `dist/`

Each remote can produce two different shapes into the same
`dist/` directory: a standalone bundle (`main.js`, `index.html`,
CSS) and a federated bundle (`remoteEntry.json`,
`Bootstrap-*.js`, sidecar CSS). Running both in sequence works
functionally — each build only writes its own files — but the
directory ends up with stale artefacts from the previous mode.

For the shell to consume an authentic federated bundle (e.g.
before recording the demo), `pnpm -F <remote> clean` + a fresh
federate build is the reliable path.

### 3. Stale hashed `Bootstrap-<hash>.js` files

`build:federate` re-hashes the Bootstrap entry chunk on every
run. Previous hashes stay in `dist/` and inflate it. Same
`clean` script fixes this.

## Standalone mode

Each remote is also a complete app that runs without the shell.
This is how they were developed and how they should be debugged
when something looks off in isolation:

```bash
pnpm -F whiteboard start:standalone:dev   # http://localhost:3000
pnpm -F mermaid start:standalone:dev      # http://localhost:4000
```

The standalone entry (`src/standalone-main.tsx` for whiteboard,
`src/standalone-main.ts` for mermaid) renders the remote directly
against a built-in mock that fires the same V1 bus events the
shell would fire. No Native Federation, no orchestrator, no
import map — just a normal React or Svelte app.

The federated entry (`src/bootstrap.tsx` / `src/bootstrap.ts`)
registers the remote as a Custom Element (`<whiteboard-remote>`,
`<mermaid-remote>`) and is what the shell loads via Native
Federation. The two entries import the same component code; only
the mounting and the bus wiring differ.

A small chip header in each remote's `index.html` mirrors the
shell's framework affordance so the standalone view still shows
the React/Svelte chip — useful when demoing the remote on its
own.

## Host-only deps live in `devDependencies`

Schedule-X and its transitive runtime (`preact`,
`@preact/signals`, `temporal-polyfill`) are pinned in the
shell's **`devDependencies`**, not `dependencies`. Same goes
for `@frankenstein/shared`.

Native Federation's `shareAll` iterates `dependencies` only.
Anything listed there gets emitted as a separately-loaded
shared chunk and added to the import map for remotes to
consume. For host-only code that no remote will ever import —
the calendar, the internal bus types — sharing buys nothing
and costs real correctness: the Schedule-X Preact tree in
particular breaks the moment the runtime sees two Preact
module instances (federated copy + a deep-import path that
slips past the import map), with the canonical `__H undefined`
crash. Keeping these out of `dependencies` sidesteps the whole
class of single-instance / version-skew problems and lets the
bundler keep one copy inline.

**Rule of thumb:** if a remote will never `import` it, it's a
`devDependency` of the shell.
