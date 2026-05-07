# M1 — Workspace + Host Skeleton + Federation Init

**Spec:** `specs/SPEC.md`, Milestone M1.

**Scope.** Stand up the pnpm monorepo, the `@frankenstein/shared` package
(bus, types, seed), and an Angular host (`packages/shell/`) scaffolded
with Native Federation v4 in `dynamic-host` mode. The host renders a
single header *"Frankenstein Meeting Room"* and the orchestrator's
two-phase bootstrap runs against an empty manifest. No calendar, no
`MeetingService`, no remotes — those are M2+.

**M1 artifact (success criterion).** Empty shell renders the header on
`http://localhost:4200`, browser console shows orchestrator init output,
zero errors. The federation infrastructure is live and extensible.

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

## Task 1: pnpm workspace + `@frankenstein/shared` package

### Instructions

Create the monorepo root and the shared TypeScript package consumed
(as source) by the host and the future remotes.

**Root files**

- `pnpm-workspace.yaml` listing `packages/*`.
- Root `package.json`: `"name": "frankenstein-meeting-room"`, `"private": true`, no runtime deps. Add `engines.pnpm` only if convenient — not required.
- `tsconfig.base.json`: `"strict": true`, `"target": "ES2022"`, `"module": "ESNext"`, `"moduleResolution": "bundler"`, `"esModuleInterop": true`, `"skipLibCheck": true`, `"forceConsistentCasingInFileNames": true`. No `paths` — workspace linking handles cross-package imports.
- Append to `.gitignore`: `node_modules/`, `dist/`, `.angular/`, `*.log`. Existing entries (`.brokk/`, `.idea/`) stay.

**`packages/shared/`**

- `package.json`: `"name": "@frankenstein/shared"`, `"private": true`, `"type": "module"`, exports map:
  ```json
  {
    "./bus":   "./src/bus.ts",
    "./types": "./src/types.ts",
    "./seed":  "./src/seed.ts"
  }
  ```
  (TS-source consumers; no build step.)
- `tsconfig.json` extending `../../tsconfig.base.json`, no `outDir` needed.
- `src/types.ts` — exact shapes from the spec:
  - `ExcalidrawDemoData = { elements: ExcalidrawElement[]; appState?: Partial<{ viewBackgroundColor: string; gridSize: number; gridStep: number; gridModeEnabled: boolean }> }`. Import `ExcalidrawElement` from `@excalidraw/excalidraw/element/types`. If that import would force adding an Excalidraw dep purely to compile the shared package in M1, fall back to `type ExcalidrawElement = unknown` with a `// TODO: replace with @excalidraw/excalidraw type when M3 lands` and document the deviation in the wrap-up.
  - `Meeting = { id: string; title: string; start: string; end: string; attendees: string[]; excalidrawData?: ExcalidrawDemoData; mermaidSource?: string; updatedAt: string; excalidrawUpdatedAt?: string; mermaidUpdatedAt?: string }`.
- `src/bus.ts` — exact wrapper from the spec:
  ```ts
  import type { Meeting, ExcalidrawDemoData } from './types';

  type BusEvents = {
    'context:request': {};
    'event:selected':  { meetingId: string; initialData: Meeting };
    'drawing:changed': { meetingId: string; excalidrawData: ExcalidrawDemoData };
    'diagram:changed': { meetingId: string; mermaidSource: string };
  };

  const bus = ((globalThis as any).frankensteinBus ??= new EventTarget()) as EventTarget;

  export function emit<K extends keyof BusEvents>(name: K, payload: BusEvents[K]) {
    bus.dispatchEvent(new CustomEvent(name, { detail: payload }));
  }

  export function on<K extends keyof BusEvents>(
    name: K,
    handler: (payload: BusEvents[K]) => void,
  ): () => void {
    const listener = (e: Event) => handler((e as CustomEvent).detail);
    bus.addEventListener(name, listener);
    return () => bus.removeEventListener(name, listener);
  }
  ```
- `src/seed.ts` — three story-driven sample meetings as `Meeting[]`:
  - "Architecture Review" (the Money-Shot meeting), "Sprint Retro", "Design Sync".
  - ISO timestamps inside the **current ISO week** so the calendar (M2) shows them on first run. Compute at module load (e.g. with a small `weekday(offset, hour)` helper that returns `new Date(...).toISOString()` based on `new Date()`'s Monday). The seed is deterministic per-day; that's fine.
  - Plausible attendee lists, e.g. `["Lutz", "Manfred", "Yara"]`.
  - Set `updatedAt` to the same value as `start` for each meeting. Leave `excalidrawData`, `mermaidSource`, `excalidrawUpdatedAt`, `mermaidUpdatedAt` unset (added in M3/M4).
- Add `pnpm` to the workspace: run `pnpm install` once to populate `node_modules/` and verify the workspace symlink exists (`ls packages/shell/node_modules/@frankenstein/shared` will be checked in Task 2; for now just confirm `pnpm install` succeeds without warnings about missing packages).

### Key Discoveries

- **Federation must inline the shared package — never share it.** When Task 2 (and later remotes) configure `federation.config.mjs`, `@frankenstein/shared` must NOT appear in the `shared` block. The bus singleton lives in `globalThis.frankensteinBus`; each bundle compiling its own copy of `bus.ts` is by design — `??=` makes the second init a no-op. List the package as a `devDependency` in consumers (or filter from `shareAll`) so Native Federation's auto-share never picks it up. (M1 only creates the package; this becomes load-bearing in M2/M3/M4.)
- **All artifact-related fields are optional in `Meeting`.** Seed leaves `excalidrawData`, `mermaidSource`, `excalidrawUpdatedAt`, `mermaidUpdatedAt` unset — they get populated by M3/M4 remote events.
- **`bus.ts` is consumed as TypeScript source**, not as a compiled `dist/`. The package has no build script and no `main`/`types` fields pointing at JS — exports map points at `.ts` files. Each consumer (Angular shell, esbuild remotes) compiles them via its own toolchain.
- **`globalThis.frankensteinBus` typing.** Avoid declaring a `declare global` block in the shared package — that pollutes every consumer's globals. Cast inline (`(globalThis as any).frankensteinBus`) or use a local `interface GlobalWithBus`. Both are acceptable; the cast is shorter.

### Acceptance

- `pnpm install` at repo root succeeds, no errors.
- `pnpm -C packages/shared exec tsc --noEmit` passes (zero TS errors).
- `seed` exports an array of length 3, each item has all required `Meeting` fields populated. Verify with a one-liner: `pnpm -C packages/shared exec node --input-type=module -e "import('./src/seed.ts').then(m => console.log(m.seed.length, m.seed[0]))"` — if that's awkward without a TS loader, write a tiny ad-hoc `tsx` invocation or simply rely on the `tsc --noEmit` and a manual file read.

### Key Locations

- `pnpm-workspace.yaml`
- `package.json`
- `tsconfig.base.json`
- `.gitignore`
- `packages/shared/package.json`
- `packages/shared/tsconfig.json`
- `packages/shared/src/bus.ts`
- `packages/shared/src/types.ts`
- `packages/shared/src/seed.ts`

---

## Task 2: Angular shell with Native Federation v4 dynamic-host

**Depends on Task 1** (needs the pnpm workspace).

### Instructions

Scaffold the Angular host inside `packages/shell/`, install Native
Federation v4, run the dynamic-host schematic, and verify the
two-phase bootstrap works against an empty manifest. End state: shell
runs on `:4200` and shows a single header.

**Generate the Angular project**

From the repo root:

```bash
pnpm dlx @angular/cli@latest new shell \
  --directory packages/shell \
  --routing=false \
  --style=css \
  --skip-git \
  --strict \
  --package-manager=pnpm \
  --standalone
```

(If `@angular/cli` insists on a specific Angular major, use the latest
stable that supports Native Federation v4 — currently Angular 18+; v4
docs cover up through Angular 20+.) Verify `packages/shell/package.json`
exists and the workspace picks it up (`pnpm install` from root sees it).

Trim the generated `AppComponent`:

- `app.component.html`: replace placeholder content with `<header>Frankenstein Meeting Room</header>`.
- `app.component.css`: delete generated body, leave empty or add minimal header styling (one or two lines — not the M1 focus).
- Delete or empty the auto-generated `app.component.spec.ts` if it pulls in test infra you don't need; tests are explicit Out of Scope per the spec.

**Install Native Federation v4 + run the dynamic-host schematic**

```bash
pnpm -F shell add -D @angular-architects/native-federation-v4
pnpm -F shell exec ng g @angular-architects/native-federation-v4:init \
  --project shell --port 4200 --type dynamic-host
```

The schematic will produce / modify:

- `angular.json`: `build` and `serve` targets repointed to `@angular-architects/native-federation-v4:build`. The originals are preserved as `esbuild` (using `@angular/build:application`) and `serve-original` (using `@angular/build:dev-server`).
- `packages/shell/src/main.ts`: calls `initFederation('/assets/federation.manifest.json', { ... })` and dynamically imports `./bootstrap`.
- `packages/shell/src/bootstrap.ts`: wraps the original Angular bootstrap (`bootstrapApplication(AppComponent, ...)`).
- `packages/shell/federation.config.mjs`: host federation config (shared deps).
- `packages/shell/tsconfig.federation.json`: federation-specific TS config.
- `packages/shell/public/federation.manifest.json` **or** `packages/shell/src/assets/federation.manifest.json` (location depends on Angular version's asset pipeline). The schematic ships an example `{ "mfe1": "http://localhost:4201/remoteEntry.json" }` — replace its body with `{}` for M1 (we have no remotes yet). Keep the file path intact; Task 2 does **not** rename it.

**Verify the schematic output (do not hand-edit unless verifying fails)**

- `main.ts` uses the orchestrator options exactly as in the spec: `useShimImportMap({ shimMode: true })`, `consoleLogger`, `globalThisStorageEntry`, `hostRemoteEntry: './remoteEntry.json'`. If the schematic writes a leaner version, accept it — those defaults are equivalent.
- `bootstrap.ts` calls `bootstrapApplication(AppComponent, ...)`.
- A `loadRemoteModule` is exported / handed to `bootstrap` (the spec shows passing it as a function arg; the schematic may bind it differently — either is fine for M1).

**Sanity-run**

- `pnpm -F shell start` (or whatever script the schematic registered — usually `ng serve`) boots on `:4200`.
- Visit `http://localhost:4200` in a browser. The page shows the `Frankenstein Meeting Room` header.
- DevTools console shows orchestrator init output (manifest fetched, shim import-map injected, no errors).
- `pnpm -F shell build` completes successfully.

### Key Discoveries

- **Orchestrator runtime, not classic.** The Angular adapter `@angular-architects/native-federation-v4` is built on `@softarc/native-federation-orchestrator`. Don't swap to the classic runtime — the spec mandates orchestrator for semver-aware version resolution and persistent caching.
- **`federation.manifest.json` may be `{}` for M1.** The two-phase bootstrap fetches it, finds no remotes, and Angular boots normally. Remotes are added in M3 (whiteboard, `:3000`) and M4 (mermaid, `:4000`). Do NOT delete the file.
- **Host's `remoteEntry.json` is a shared-deps manifest, not a federable bundle.** The `hostRemoteEntry: './remoteEntry.json'` option in `initFederation` lets the host win version conflicts for libs it brings (Angular, RxJS). Keep whatever the schematic generates in `federation.config.mjs` — defaults are correct.
- **`angular.json` builder swap is intentional.** `build` and `serve` now target the federation builder; the original Angular builder is preserved as `esbuild` / `serve-original` for cases where you want a non-federated build. Don't "fix" this back.
- **Header styling is not load-bearing.** M1's done bar is "header visible, console clean" — don't burn time on layout, theming, or the three-column grid. That's M2.

### Acceptance

- `pnpm -F shell start` runs `ng serve` on `:4200` (or the equivalent federation builder serve target).
- `http://localhost:4200` renders the text "Frankenstein Meeting Room" in a `<header>`.
- Browser DevTools console shows the orchestrator's init output, no errors / no unhandled rejections.
- `pnpm -F shell build` completes successfully and emits to `packages/shell/dist/` (or whatever the schematic configured).

### Key Locations

- `packages/shell/angular.json`
- `packages/shell/package.json`
- `packages/shell/src/main.ts`
- `packages/shell/src/bootstrap.ts`
- `packages/shell/src/app/app.component.ts`
- `packages/shell/src/app/app.component.html`
- `packages/shell/federation.config.mjs`
- `packages/shell/tsconfig.federation.json`
- `packages/shell/public/federation.manifest.json` (or `src/assets/federation.manifest.json`)
