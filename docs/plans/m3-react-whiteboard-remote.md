# M3 — React Whiteboard Remote (Standalone + Federated)

**Spec:** `specs/SPEC.md`, Milestone M3.

**Task numbering.** Continues from M2 (last task = 6). Tasks in this
plan are 7 → 8. Numbering is globally sequential across the repo so
every `docs/task-log/task-N-*.md` filename stays unique; the milestone
identity lives in this plan's filename.

**Builds on:** M1 + M2. Workspace, `@frankenstein/shared` (bus/types/seed),
Angular 21 host on `:4200` with three-column layout, `MeetingService`
with Signals + LocalStorage, calendar emits via service, bus log
subscribed to all four events. Host's federation infra is initialised
(`@softarc/native-federation-orchestrator@4.1.1`) but the result of
`initFederation` is currently dropped (see Task 8 Discovery).

**Scope.** Stand up the React Whiteboard Remote and federate it into
the host. Two delivery modes both working at end of milestone:
(a) `pnpm -F whiteboard start` renders Excalidraw with mock-host data
on `:3000`; (b) shell on `:4200` lazy-loads the remote when a meeting
is selected, drawing changes round-trip through the bus and persist
via the host's `MeetingService`. **First federation stitching live.**

**M3 artifact (success criterion).** Three terminals — host, whiteboard,
optionally bus log open in DevTools. Click "Architecture Review" in the
calendar → React bundle loads from `:3000`, Excalidraw renders inside
the upper middle-column cell, initial state matches what `seed.ts`
carries for that meeting (empty for the seed; non-empty after the
DevTools `drawing:changed` injection from M2). Drawing in Excalidraw →
debounced `drawing:changed` emits through the bus → `MeetingService`
persists `excalidrawData` + `excalidrawUpdatedAt` to LocalStorage →
reload preserves it. The lower middle cell still shows the "Pick a
meeting" placeholder; M4 fills that.

**Architecture facts (carried across both tasks):**
- **Host build stack stays Angular CLI / `@angular/build`** via
  `@angular-architects/native-federation-v4` — no change.
- **Remote build stack is the standalone esbuild adapter**
  `@softarc/native-federation-esbuild@4.0.0-RC10` (esm-v4 dist-tag,
  not GA), driven by a hand-written `build.mjs` per spec. RC because
  v4 of the standalone adapter has no GA release as of 2026-05.
- **Cross-bundle wire protocol** is the orchestrator's `remoteEntry.json`
  schema — semver-stable between v4.0 and v4.1, so the orchestrator-4.1
  host and RC10-built remote interoperate via the manifest.
- **DI pattern (host) verbatim from `native-federation/angular-examples`
  (simple/):** `MODULE_LOADER` `InjectionToken<NativeFederationResult>`,
  `appConfig` as factory `(nf) => ApplicationConfig`, `bootstrap(nf)`
  receives the result and providers it.
- **Custom Element registration (remote):** manual
  `class WhiteboardRemote extends HTMLElement` with `createRoot` in
  `connectedCallback`, `unmount` + bus-unsubscribe in
  `disconnectedCallback`. **Light DOM only** (Excalidraw struggles with
  Shadow DOM style cascade — explicit per spec, deviates from the
  Aukevanoost-react example which uses Shadow DOM).
- **Excalidraw types** live at `@excalidraw/excalidraw/types/...`
  (note the additional `types/` segment — the spec drafted the older
  `/element/types` path which does not resolve in 0.18.x).

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

## Task 7: Whiteboard Remote — standalone React + Excalidraw on `:3000`

### Instructions

Create `packages/whiteboard/` as a federation-aware esbuild-built React
remote that runs end-to-end standalone on `:3000` before any host
integration. Target: `pnpm -F whiteboard start` opens a browser to
`:3000`, the mock host provides one fake meeting, Excalidraw renders,
drawing changes log `drawing:changed` events to the console.

**Package skeleton.**

```
packages/whiteboard/
├── package.json
├── tsconfig.json
├── federation.config.js
├── build.mjs
├── public/
│   └── index.html
└── src/
    ├── bootstrap.tsx        ← entry, registers <whiteboard-remote>
    ├── whiteboard-remote.tsx ← Custom Element class
    ├── App.tsx              ← React component wrapping Excalidraw
    ├── debounce.ts          ← 10-line debounce helper
    └── standalone-host.ts   ← dev-only mock host, conditionally imported
```

**`package.json` (pin RC10 explicitly; no caret):**

```json
{
  "name": "whiteboard",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node build.mjs --dev",
    "build": "node build.mjs"
  },
  "dependencies": {
    "@excalidraw/excalidraw": "~0.18.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@softarc/native-federation-orchestrator": "4.0.0"
  },
  "devDependencies": {
    "@frankenstein/shared": "workspace:*",
    "@softarc/native-federation": "^4.0.0",
    "@softarc/native-federation-esbuild": "4.0.0-RC10",
    "@chialab/esbuild-plugin-commonjs": "^0.19.1",
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "es-module-shims": "^2.8.0",
    "esbuild": "^0.25.1",
    "typescript": "~5.9.2"
  }
}
```

The orchestrator pin to `4.0.0` matches RC10's `~4.0.0` peer-dep
constraint. The host runs orchestrator `4.1.1`; that's intentional —
each app owns its own orchestrator instance, the wire is the
manifest. **`@frankenstein/shared` lives in `devDependencies`** so
`shareAll` skips it (shareAll iterates `dependencies` only — verified
in `@softarc/native-federation/config` source). The bus singleton lives
in `globalThis`, each bundle inlines its own copy of `bus.ts`, and the
second `??=` is a no-op.

**`federation.config.js` (use `@softarc/native-federation/config` —
not the angular-architects flavour):**

```js
import { withNativeFederation, shareAll } from '@softarc/native-federation/config';

export default withNativeFederation({
  name: 'whiteboard',
  exposes: { './Bootstrap': './src/bootstrap.tsx' },
  shared: {
    ...shareAll(
      { singleton: true, strictVersion: true, requiredVersion: 'auto' },
      {
        overrides: {
          react:       { singleton: true, strictVersion: true, requiredVersion: 'auto', includeSecondaries: { keepAll: true } },
          'react-dom': { singleton: true, strictVersion: true, requiredVersion: 'auto', includeSecondaries: { keepAll: true } },
        },
      },
    ),
  },
  features: { ignoreUnusedDeps: true },
  skip: [
    'react-dom/server',
    'react-dom/server.node',
    'react-dom/server.browser',
    'react-dom/test-utils',
  ],
});
```

**`build.mjs` (template from `Aukevanoost/native-federation-examples-react`,
with CORS headers added so the host on `:4200` can fetch
`remoteEntry.json` from `:3000`):**

```js
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { extname, join } from 'path';
import { runEsBuildBuilder } from '@softarc/native-federation-esbuild';

const isDev = process.argv.includes('--dev');

const federation = await runEsBuildBuilder('federation.config.js', {
  outputPath: 'dist',
  tsConfig: 'tsconfig.json',
  dev: isDev,
  watch: isDev,
  entryPoints: ['src/bootstrap.tsx'],
  adapterConfig: {
    plugins: [],
    define: { 'process.env.NODE_ENV': isDev ? '"development"' : '"production"' },
  },
});

if (isDev) {
  const mimeTypes = {
    '.html': 'text/html', '.js': 'application/javascript',
    '.mjs': 'application/javascript', '.css': 'text/css',
    '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  };
  const server = createServer((req, res) => {
    let filePath = req.url === '/' ? '/public/index.html' : req.url;
    filePath = filePath.split('?')[0];
    const distPath = join('dist', filePath.replace(/^\/dist\//, ''));
    const publicPath = join('public', filePath.replace(/^\/public\//, ''));
    let resolvedPath;
    if (existsSync(distPath) && !filePath.startsWith('/public')) resolvedPath = distPath;
    else if (existsSync(publicPath)) resolvedPath = publicPath;
    else if (existsSync(join('public', 'index.html'))) resolvedPath = join('public', 'index.html');
    if (!resolvedPath) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, {
      'Content-Type': mimeTypes[extname(resolvedPath)] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    });
    res.end(readFileSync(resolvedPath));
  });
  server.listen(3000, () => console.log('Whiteboard dev server: http://localhost:3000'));
  const shutdown = async () => { await federation.close(); process.exit(0); };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} else {
  await federation.close();
  console.log('Whiteboard build complete.');
}
```

**`src/bootstrap.tsx` — entry, defines the Custom Element:**

```ts
import { WhiteboardRemote } from './whiteboard-remote';
if (process.env.NODE_ENV === 'development') await import('./standalone-host');
customElements.define('whiteboard-remote', WhiteboardRemote);
```

**`src/whiteboard-remote.tsx` — Custom Element wrapper:**

- Extends `HTMLElement`. Holds `private root?: Root`,
  `private unsubs: Array<() => void> = []`, `private meetingId: string | null`,
  `private initialData: ExcalidrawDemoData | null`.
- `connectedCallback`:
  1. `this.root = createRoot(this);` — Light DOM mount, no Shadow DOM.
  2. Subscribe `on('event:selected', ({ meetingId, initialData }) => { ... this.render(); })`. Push the returned unsubscribe.
  3. `emit('context:request', {})` — late-subscriber boot pattern.
- `disconnectedCallback`:
  1. Run every stored unsub.
  2. `this.root?.unmount()`.
- `private render()`: `this.root?.render(<App initialData={...} onChange={...} />)`.
- Pass to `App`: `initialData={this.initialData}` plus an `onChange` that
  the App debounces and ultimately calls
  `emit('drawing:changed', { meetingId: this.meetingId!, excalidrawData })`.

**`src/App.tsx` — React app wrapping Excalidraw:**

```tsx
import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';
import type { AppState, BinaryFiles } from '@excalidraw/excalidraw/types/types';
import type { ExcalidrawDemoData } from '@frankenstein/shared/types';
import { useRef } from 'react';
import { debounce } from './debounce';

type Props = {
  initialData: ExcalidrawDemoData | null;
  onChange: (data: ExcalidrawDemoData) => void;
};

const APPSTATE_KEYS = ['viewBackgroundColor', 'gridSize', 'gridStep', 'gridModeEnabled'] as const;

export function App({ initialData, onChange }: Props) {
  const debounced = useRef(debounce((data: ExcalidrawDemoData) => onChange(data), 500)).current;
  const handleChange = (elements: readonly ExcalidrawElement[], appState: AppState, _files: BinaryFiles) => {
    const trimmed: ExcalidrawDemoData = {
      elements: [...elements] as ExcalidrawElement[],
      appState: Object.fromEntries(APPSTATE_KEYS.map(k => [k, appState[k]])) as ExcalidrawDemoData['appState'],
    };
    debounced(trimmed);
  };
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Excalidraw initialData={initialData ?? undefined} onChange={handleChange} />
    </div>
  );
}
```

**`src/debounce.ts` — ten-line debounce, no lodash:**

```ts
export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let t: ReturnType<typeof setTimeout> | undefined;
  return ((...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  }) as T;
}
```

**`src/standalone-host.ts` — dev-only mock host:**

Minimal: respond to `context:request` with one fake meeting, log
outgoing `drawing:changed`. Keep it small — every additional behavior
is M3 scope creep.

```ts
import { on, emit } from '@frankenstein/shared/bus';
import type { Meeting } from '@frankenstein/shared/types';

const fakeMeeting: Meeting = {
  id: 'standalone-demo',
  title: 'Standalone Demo',
  start: new Date().toISOString(),
  end: new Date(Date.now() + 3600_000).toISOString(),
  attendees: [],
  updatedAt: new Date().toISOString(),
};

on('context:request', () => {
  emit('event:selected', { meetingId: fakeMeeting.id, initialData: fakeMeeting });
});
on('drawing:changed', (p) => console.log('[mock host] drawing:changed', p));
```

**`public/index.html` — standalone shell:**

Mounts `<whiteboard-remote>` directly. Loads the orchestrator's
`quickstart.mjs` so the import-map shim resolves the externalised
React. Self-pointing manifest (the standalone declares itself as the
only known remote). This mirrors the Aukevanoost-react pattern — it's
the path of least resistance because the federation build externalises
React even in standalone.

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Whiteboard Remote (standalone)</title>
    <script type="esms-options">{ "shimMode": true }</script>
    <script async src="https://ga.jspm.io/npm:es-module-shims@2.8.0/dist/es-module-shims.js"></script>
    <script type="module" src="https://esm.sh/@softarc/native-federation-orchestrator@4.0.0/quickstart.mjs"
            data-manifest='{"whiteboard":"http://localhost:3000/remoteEntry.json"}'
            data-bootstrap='[["whiteboard","./Bootstrap"]]'></script>
  </head>
  <body style="margin:0;height:100vh">
    <whiteboard-remote style="display:block;width:100vw;height:100vh"></whiteboard-remote>
  </body>
</html>
```

(Exact `data-*` attribute names — verify against the installed
`quickstart.mjs` source. If different, adjust to whatever the
quickstart expects.)

**`tsconfig.json` — extend the base, add React JSX:**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "outDir": "./dist",
    "types": ["node"]
  },
  "include": ["src/**/*"]
}
```

### Key Discoveries

- **`@softarc/native-federation-esbuild@4.0.0-RC10` is RC, not GA.**
  Pin without caret. Its peer-dep on `@softarc/native-federation` is
  `~4.0.0`; the host running orchestrator `4.1.x` does NOT bind on the
  remote — each app owns its own orchestrator instance. Keep
  remote-side orchestrator at `4.0.0` to match RC10.
- **`@frankenstein/shared` MUST be a `devDependency`.** `shareAll`
  iterates `dependencies` only; moving the package into `dependencies`
  would federate it and break the `globalThis` singleton mechanism for
  the bus. M2 task-1 wrap-up has the full reasoning.
- **Excalidraw type subpath at 0.18.x is `@excalidraw/excalidraw/types/...`,
  not `/element/types` directly.** Spec drafted the older path; correct
  paths are `@excalidraw/excalidraw/types/element/types` and
  `@excalidraw/excalidraw/types/types` for AppState/BinaryFiles. If
  resolution still fails after install, run `tsc --traceResolution` on
  the import to find the real subpath in `@excalidraw/excalidraw/package.json#exports`.
- **Excalidraw needs Light DOM** — Shadow DOM breaks its style cascade
  (spec line 255). Aukevanoost's React example uses Shadow DOM; we
  deviate intentionally. `createRoot(this)` on the Custom Element host
  itself, no `attachShadow`.
- **Excalidraw `onChange` `elements` is `readonly`.** Copy with
  `[...elements] as ExcalidrawElement[]` before storing — the type
  matches `ExcalidrawDemoData.elements`, but TS won't let you assign
  the readonly array directly.
- **`appState` subset is the spec's strict export shape** (4 keys).
  Use `Object.fromEntries` over `APPSTATE_KEYS` rather than spreading
  the whole `appState` — the latter would persist huge transient state
  (selected element ids, scroll position, etc.) into LocalStorage.
- **Debounce at the producer, 500 ms**, owned by the React component
  via `useRef` + ten-line helper. No lodash. Do NOT add a second-stage
  debounce in the bus or service — single throttle, clear ownership at
  the producer (spec line 173).
- **Standalone uses the orchestrator's quickstart**, not a "naked"
  `<script type="module" src="dist/main.js">`. Reason: the federation
  build externalises React (and other shared deps); without the
  orchestrator's import map those imports 404 at load. Cheaper than
  maintaining a second non-federation build target.
- **CORS on the dev static server is required.** The host on `:4200`
  fetches `:3000/remoteEntry.json` and the bundles it points to.
  `Access-Control-Allow-Origin: *` is fine for local dev.
- **Mock host stays minimal.** Only what's needed for `<whiteboard-remote>`
  to render *something* on standalone load: respond to
  `context:request` with one fake meeting, log outgoing events. Anything
  more (toggling between meetings, simulating multiple events) is M5
  polish and almost certainly never gets used.
- **pnpm install peer-dep mismatch is plausible.** If install errors
  on `@softarc/native-federation` version conflict between host (4.1.x)
  and remote (4.0.0), the conflict is per-package — not workspace-global —
  and resolves naturally because each app has its own `node_modules`
  via pnpm's hard-linking. If pnpm errors anyway, fall back to
  `pnpm install --strict-peer-dependencies=false`. Do NOT downgrade the
  host orchestrator.
- **Custom Element selector is `whiteboard-remote`** per spec, not the
  Aukevanoost convention `app-mfe1`. Naming convention: `<remote>-remote`.

### Acceptance

- **T7-AC-01** — `pnpm install` from repo root completes (with
  `--strict-peer-dependencies=false` if necessary, documented in the
  task log).
- **T7-AC-02** — `pnpm -F whiteboard build` produces a `dist/` with
  `remoteEntry.json` listing the `./Bootstrap` exposed module.
- **T7-AC-03** — `pnpm -F whiteboard start` boots the dev server on
  `:3000`, file-watcher active, no errors in stdout.
- **T7-AC-04** — Browser to `http://localhost:3000` renders Excalidraw
  full-viewport with the standalone-host's fake meeting; the canvas
  is interactive (drawing tools selectable).
- **T7-AC-05** — Drawing on the Excalidraw canvas → DevTools console
  shows a single `[mock host] drawing:changed` entry per ~500 ms (not
  per pixel-move), with `meetingId: 'standalone-demo'` and an
  `excalidrawData` payload that contains `elements` and an `appState`
  with exactly the four keys `viewBackgroundColor`, `gridSize`,
  `gridStep`, `gridModeEnabled`.
- **T7-AC-06** — DevTools console otherwise clean (no React warnings,
  no Excalidraw errors, no failed federation lookups).

### Key Locations

- `packages/whiteboard/package.json` (new)
- `packages/whiteboard/tsconfig.json` (new)
- `packages/whiteboard/federation.config.js` (new)
- `packages/whiteboard/build.mjs` (new)
- `packages/whiteboard/public/index.html` (new)
- `packages/whiteboard/src/bootstrap.tsx` (new)
- `packages/whiteboard/src/whiteboard-remote.tsx` (new)
- `packages/whiteboard/src/App.tsx` (new)
- `packages/whiteboard/src/debounce.ts` (new)
- `packages/whiteboard/src/standalone-host.ts` (new)
- `pnpm-workspace.yaml` (no change expected — `packages/*` already covers it)

---

## Task 8: Host integrates Whiteboard via Native Federation

**Depends on Task 7** (needs the `:3000` remote running for end-to-end
acceptance) and Task 6 (refactors the host's federation init wiring
laid down in M1).

### Instructions

Plumb the orchestrator result into Angular DI via the canonical
pattern from `native-federation/angular-examples` (`simple/`), add a
`WhiteboardSlot` component that lazy-loads the remote on first meeting
selection, and wire it into the upper middle-column cell of the
existing layout. The lower middle cell remains the "Pick a meeting"
placeholder until M4.

**Step 1 — Refactor `main.ts` to capture and pass `nf`.**

The current `main.ts` (`packages/shell/src/main.ts`) discards the
`NativeFederationResult` returned by `initFederation`. The current
early `.catch` was a M1 scaffold ("Revisit at M2/M3 to fail fast on
host/manifest init errors") — remove it, fail fast on init errors now
that we have a real remote that can fail at runtime in ways worth
surfacing.

```ts
import { initFederation, NativeFederationResult } from '@softarc/native-federation-orchestrator';
import {
  useShimImportMap, consoleLogger, globalThisStorageEntry,
} from '@softarc/native-federation-orchestrator/options';

initFederation('federation.manifest.json', {
  ...useShimImportMap({ shimMode: true }),
  logger: consoleLogger,
  storage: globalThisStorageEntry,
  hostRemoteEntry: './remoteEntry.json',
  logLevel: 'debug',
})
  .then((nf: NativeFederationResult) =>
    import('./bootstrap').then((m) => m.bootstrap(nf)),
  )
  .catch((err) => console.error('[shell] federation init failed', err));
```

**Step 2 — Refactor `bootstrap.ts` to take `nf`.**

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import type { NativeFederationResult } from '@softarc/native-federation-orchestrator';
import { App } from './app/app';
import { appConfig } from './app/app.config';

export const bootstrap = (nf: NativeFederationResult) =>
  bootstrapApplication(App, appConfig(nf)).catch((err) => console.error(err));
```

**Step 3 — Refactor `app.config.ts` to a factory.**

Read the current providers, wrap them in a factory function, add the
`MODULE_LOADER` provider. The token name follows the `simple/` example.

```ts
// packages/shell/src/app/app.config.ts
import { ApplicationConfig, InjectionToken } from '@angular/core';
import type { NativeFederationResult } from '@softarc/native-federation-orchestrator';
// ... existing provider imports

export const MODULE_LOADER = new InjectionToken<NativeFederationResult>('MODULE_LOADER');

export const appConfig = (nf: NativeFederationResult): ApplicationConfig => ({
  providers: [
    { provide: MODULE_LOADER, useValue: nf },
    // ... existing providers (router, change detection, etc.)
  ],
});
```

If the existing `appConfig` is currently a `const` object, convert it
to a factory taking `nf`. Keep all current providers; only add the
`MODULE_LOADER` line.

**Step 4 — Add the manifest entry.**

`packages/shell/public/federation.manifest.json`:

```json
{
  "whiteboard": "http://localhost:3000/remoteEntry.json"
}
```

(Currently `{}`. The mermaid entry comes in M4.)

**Step 5 — Create `WhiteboardSlot` component.**

`packages/shell/src/app/whiteboard-slot.ts/.html/.css`. Standalone
component, selector `app-whiteboard-slot`, schemas
`[CUSTOM_ELEMENTS_SCHEMA]` (locally on this component, NOT on `App`).

```ts
import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, signal } from '@angular/core';
import { MODULE_LOADER } from './app.config';
import { MeetingService } from './meeting.service';

@Component({
  selector: 'app-whiteboard-slot',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './whiteboard-slot.html',
  styleUrl: './whiteboard-slot.css',
})
export class WhiteboardSlot {
  private loader = inject(MODULE_LOADER);
  private service = inject(MeetingService);

  readonly remoteReady = signal(false);
  readonly hasMeeting = computed(() => this.service.currentMeeting() !== null);

  constructor() {
    this.loader
      .loadRemoteModule('whiteboard', './Bootstrap')
      .then(() => this.remoteReady.set(true))
      .catch((err) => console.error('[shell] whiteboard remote failed to load', err));
  }
}
```

(Adjust imports: `computed` from `@angular/core`.)

Eager-load on slot mount mirrors the `simple/` example. The component
fires `loadRemoteModule` once in the constructor; the remote's
`bootstrap.tsx` runs as a side effect, calling `customElements.define`.
After that the Custom Element is globally available; the host just
toggles a signal to render it once both ready and a meeting is
selected.

Template:

```html
@if (remoteReady() && hasMeeting()) {
  <whiteboard-remote class="remote-mount"></whiteboard-remote>
} @else if (!remoteReady()) {
  <div class="placeholder">Loading whiteboard…</div>
} @else {
  <div class="placeholder">Pick a meeting</div>
}
```

CSS: `.remote-mount { display: block; width: 100%; height: 100%; }`,
plus the placeholder styling matching the M2 placeholder. The slot
container itself fills its grid cell.

**Step 6 — Drop `<app-whiteboard-slot>` into the layout.**

Replace the upper middle-column cell in `packages/shell/src/app/app.html`:

```html
<section class="col-mid">
  <app-whiteboard-slot></app-whiteboard-slot>
  <div class="cell placeholder">Pick a meeting</div>
</section>
```

The lower cell (Mermaid slot in M4) keeps the placeholder.

Add `WhiteboardSlot` to `App`'s `imports` array.

**Step 7 — Verify boot flow end-to-end.**

Start both: `pnpm -F whiteboard start` (terminal 1, `:3000`),
`pnpm -F shell start` (terminal 2, `:4200`). Browse `:4200`, click a
meeting, exercise the acceptance below.

### Key Discoveries

- **Current `main.ts` discards `nf`.** The line
  `.then((_) => import('./bootstrap'))` is the offender — the `_` is
  the `NativeFederationResult`. The early `.catch` before the `.then`
  was a M1 scaffold meant to "log and continue" so a missing remote
  wouldn't brick the host. With M3 we do have a remote and want hard
  errors visible — remove the early `.catch`, keep only the trailing
  one.
- **`appConfig` is currently a `const`**; conversion to factory is the
  minimum-blast-radius change: every provider stays, `MODULE_LOADER`
  is appended, the call site in `bootstrap` becomes `appConfig(nf)`.
- **`MODULE_LOADER` holds the *whole* `NativeFederationResult`**, not
  just `loadRemoteModule`. Matches the `simple/` example and gives us
  `initRemoteEntry` for free if we later want runtime-discovered
  remotes (out of scope for M3, but the cost of holding the wider
  shape is zero).
- **Eager `loadRemoteModule` in the slot's constructor** is the
  pattern from `simple/`. Lazy-on-first-meeting-select would also
  work, but adds a `selectMeeting` subscription just to trigger
  loading — not worth the indirection. The fetch happens in parallel
  with the user choosing a meeting; by the time they click, the
  bundle is usually already cached.
- **`<whiteboard-remote>` is a manual Custom Element, not Angular
  Elements.** That's a remote-side decision (Task 7); the host doesn't
  care. `CUSTOM_ELEMENTS_SCHEMA` on `WhiteboardSlot` is enough — no
  need to add it to `App`. Keep the schema localised so unknown tags
  elsewhere still error.
- **No two-way bridging between Angular and the Custom Element.**
  The bus is the only channel. The slot does not pass attributes,
  properties, or events to `<whiteboard-remote>`. Even `meetingId`
  arrives via `event:selected` on the bus, dispatched by
  `MeetingService.selectMeeting` (already in M2). The slot is purely
  a mount + lifecycle gate.
- **`context:request` boot pattern is fully exercised here for the
  first time.** Sequence: user clicks meeting → service emits
  `event:selected` (M2). User then clicks a second meeting → service
  emits again. The remote, mounted in between, didn't see the first
  emit; on its `connectedCallback` it fires `context:request`, which
  M2's service handles via `rebroadcastCurrent()` and re-emits
  `event:selected`. This is why the M2 `context:request` listener
  was already wired up — Task 8 is what proves it works.
- **Manifest entry name MUST match the remote's `federation.config.js`
  `name` field** (`'whiteboard'`). The orchestrator looks up the
  remote by this key on every `loadRemoteModule(name, ...)` call.
- **Stale-update guard in `applyDrawingChange`** (M2 task-6) is the
  invariant that keeps a mid-stream meeting switch from corrupting
  the previous meeting's state. M3 has no new code path for this —
  it's the same path the M2 DevTools-injected `drawing:changed`
  exercised — but now the producer is real, so the guard is finally
  earning its keep.

### Acceptance

- **T8-AC-01** — `pnpm -F shell build` completes after the
  refactors. (Catches typos in the factory conversion.)
- **T8-AC-02** — `pnpm -F shell start` on `:4200` boots clean (no
  console errors), DevTools Network tab shows a fetch of
  `http://localhost:3000/remoteEntry.json` shortly after boot, and
  shortly after that the chunked JS bundles. (Whiteboard remote must
  be running on `:3000` first.)
- **T8-AC-03** — Before any meeting is clicked, the upper middle cell
  shows either "Loading whiteboard…" briefly then "Pick a meeting"
  (or just "Pick a meeting" if the bundle was already cached). The
  lower middle cell still shows "Pick a meeting".
- **T8-AC-04** — Click "Architecture Review" in the calendar →
  Excalidraw renders in the upper middle cell. The bus log shows the
  `event:selected` row (M2) plus a `context:request` row from the
  remote's mount.
- **T8-AC-05** — Draw on the canvas → bus log shows
  `drawing:changed` rows at ~500 ms cadence (debounced producer-side).
  DevTools > Application > LocalStorage > `frankenstein:meetings`
  contains an entry for `meeting-architecture-review` with
  `excalidrawData.elements` populated, `excalidrawUpdatedAt` set, and
  `updatedAt` set.
- **T8-AC-06** — Reload `:4200`. Click "Architecture Review" again.
  Excalidraw renders with the previously drawn elements visible —
  initial state was delivered via the bus from
  `MeetingService.selectMeeting` (which carries the persisted
  `Meeting` payload).
- **T8-AC-07** — Click "Sprint Retro" with no prior drawings → the
  upper middle cell rerenders with a clean Excalidraw canvas. The
  Architecture Review's drawing is unaffected in LocalStorage. Click
  back to "Architecture Review" → drawing reappears.
- **T8-AC-08** — Stale-guard sanity: with "Architecture Review"
  selected and visible, fire from DevTools console
  `frankensteinBus.dispatchEvent(new CustomEvent('drawing:changed', { detail: { meetingId: 'meeting-sprint-retro', excalidrawData: { elements: [] } } }))`.
  LocalStorage's "Sprint Retro" entry is **not** modified (M2 stale
  guard). Bus log row appears (generic subscriber).
- **T8-AC-09** — Stop the whiteboard dev server (`:3000`), reload the
  shell. Console shows the federation-init failure from `main.ts`'s
  trailing `.catch` (or the slot's `.catch`); the rest of the host
  still renders. The upper middle cell is stuck on "Loading
  whiteboard…" (or shows an error placeholder if you choose to render
  one — optional polish, not required for M3 acceptance).

### Key Locations

- `packages/shell/src/main.ts` (refactor: capture `nf`, pass to
  `bootstrap`, drop early `.catch`)
- `packages/shell/src/bootstrap.ts` (refactor: `bootstrap(nf)`)
- `packages/shell/src/app/app.config.ts` (refactor to factory; add
  `MODULE_LOADER` token + provider)
- `packages/shell/public/federation.manifest.json` (add `whiteboard`
  entry)
- `packages/shell/src/app/whiteboard-slot.ts` (new)
- `packages/shell/src/app/whiteboard-slot.html` (new)
- `packages/shell/src/app/whiteboard-slot.css` (new)
- `packages/shell/src/app/app.html` (replace upper middle cell)
- `packages/shell/src/app/app.ts` (add `WhiteboardSlot` to imports)

---

## Cross-Cutting Acceptance

- **XC-01** — End-to-end Native Federation loop: starting from a clean
  state, with `pnpm -F whiteboard start` and `pnpm -F shell start`
  both running, a single user gesture (calendar click on
  "Architecture Review") triggers — in order — host emit of
  `event:selected`, remote `customElements.define` already complete,
  remote's `connectedCallback` fires, remote's `context:request`
  re-prompts the host (via M2's `rebroadcastCurrent`), Excalidraw
  receives `initialData` and renders. A subsequent draw triggers the
  reverse path: producer-side debounced `drawing:changed`,
  `MeetingService.applyDrawingChange` with stale-guard,
  LocalStorage write. A page reload restores the drawing for that
  meeting via the seed → load → `selectMeeting` → bus chain.
  **Touches:** T7, T8.
