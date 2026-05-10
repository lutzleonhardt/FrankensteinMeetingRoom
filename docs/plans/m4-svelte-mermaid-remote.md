# M4 — Svelte Mermaid Remote (Standalone + Federated)

**Spec:** `specs/SPEC.md`, Milestone M4. Research log: `specs/svelte-nf-research.md`.

**Task numbering.** Continues from M3 (last task = 8). Tasks: 9 → 10 → 11.

**Builds on:** M1–M3. `MODULE_LOADER` `InjectionToken<NativeFederationResult>` in
`app.config.ts`, `WhiteboardSlot` proves the federated-slot pattern in the upper
middle cell, `MeetingService.applyDiagramChange` already wired (M2 Task 6) and
waiting for a real producer.

**Scope.** Stand up the Svelte Mermaid Remote and federate it into the host.
Three discrete deliveries: (T9) `pnpm -F mermaid start` runs a vanilla
Svelte+Mermaid editor on `:4000`; (T10) `pnpm -F mermaid build:federate`
produces a `<mermaid-remote>` Custom Element behind `dist/remoteEntry.json`;
(T11) the host on `:4200` lazy-loads the remote into the lower middle cell,
source edits round-trip via the bus and persist via `MeetingService`.
**Money-Shot recordable at end.**

**Trailblazer status.** Sourcegraph Deep Research (`specs/svelte-nf-research.md`)
confirms there is **no OSS reference** for Svelte 5 + `esbuild-svelte` + Native
Federation v4/RC10. Closest analogs are Svelte 4 + Vite
(`module-federation/module-federation-examples/module-federation-vite-svelte`,
uses deprecated `new Component({ target })` API) and React + esbuild + NF v3
(`module-federation-examples/native-federation-react`, ships its own custom
adapter and a `waitForManifest` polling workaround for a v3 timing bug). Plan
deliberately stays inside the Whiteboard package's proven shape
(`runEsBuildBuilder` + `adapterConfig.plugins`) and notes the unknowns where
they live.

**Architecture facts (carried across all three tasks):**
- **Federation pin discipline (T7 Decision #1).** `@softarc/native-federation`
  `~4.0.0`, esbuild adapter `4.0.0-RC10`, orchestrator `4.0.0`. Each remote owns
  its orchestrator instance; host's `4.1.x` does not bind on the remote.
- **`@frankenstein/shared` MUST be a devDependency** so `shareAll` skips it and
  the `globalThis.frankensteinBus` singleton survives.
- **Custom Element selector `mermaid-remote`** (kebab; matches `<remote>-remote`
  convention).
- **Light DOM only.** Mermaid renders SVG and uses `document.getElementById` to
  find its rendering host — Shadow DOM cuts those queries off. `mount(...)`
  directly into `this`.
- **Svelte 5 mount API.** `import { mount, unmount } from 'svelte'`. The legacy
  `new Component({ target, props })` is deprecated in Svelte 5 — the only
  Svelte+federation OSS example uses it (Svelte 4) and is NOT a template.
- **Svelte MUST be shared as singleton.** Two Svelte runtimes loaded
  side-by-side crash (research finding #5). The federation config's
  `overrides: { svelte: { singleton: true, ... } }` is load-bearing, not
  cosmetic.
- **`skip: ['esbuild-svelte']`** in `federation.config.js` — build-tool, never
  share.
- **No `fileReplacements` needed.** Svelte 5 emits native ESM; the React
  `jsx-runtime` CJS-dispatcher bug (T8 Decisions #6/#7) does not apply.
- **`esbuild` version drift to monitor.** RC10 internally uses esbuild `^0.28`;
  whiteboard pins `^0.25.1` and works. Mirror whiteboard's pin to start; if
  `esbuild-svelte`'s peer-dep complains, bump.
- **`runEsBuildBuilder` over a hand-rolled adapter.** The React example writes
  a custom adapter for fine control; we stay with whiteboard's higher-level
  entry point because (a) it already works, (b) plugins are reachable via
  `adapterConfig.plugins`, (c) inventing a second build pipeline doubles the
  maintenance surface for zero gain on V1.
- **Manifest-timing watchpoint.** NF v3 had a documented
  `federationBuilder.build()` timing bug worked around with explicit
  `waitForManifest` polling. v4 changelog doesn't explicitly mention a fix.
  `runEsBuildBuilder` calls `await federation.close()` which empirically does
  block until `remoteEntry.json` is on disk for the whiteboard build — but if
  T10's federate output appears before `remoteEntry.json` exists, that's the
  bug; mitigation is a post-`close()` `fs.access` poll.
- **Manifest entry name MUST match `federation.config.js#name`** = `'mermaid'`.
- **Standalone never uses the bus** (T7 Decision #4). Mock-host is
  `console.log` in `standalone-main.ts`'s `onChange`. Anything more is M5
  polish.
- **`$state` outside `.svelte` files requires the `.svelte.ts` filename
  suffix.** The Custom Element wrapper that uses `$state({ value: '' })` to
  bridge bus updates into the Svelte tree must be `mermaid-remote.svelte.ts`,
  not `mermaid-remote.ts`.
- **Stale-update guard** in `MeetingService.applyDiagramChange` (M2 Task 6) is
  the invariant that keeps mid-debounce meeting switches from corrupting state.
  T11 finally exercises it with a real producer.

## Flexibility Clause

The executing agent may adjust scope and ordering based on more up-to-date
context discovered during implementation, as long as each task still satisfies
the sizing rules.

When a task is finished (DONE or BLOCKED), close it with the
`/wrap-up N` → `/commit N` pair. `/wrap-up N` writes or extends
`docs/task-log/task-{N}-{slug}.md` and is safe to run multiple times across
sessions — it merges. `/commit N` reads that log, stages code + summary, and
commits them together after showing the plan and waiting for confirmation.
Optionally run `/review` (quick per-task, full before a PR) between wrap-up and
commit; a second `/wrap-up N` can absorb the review findings.

---

## Task 9: Mermaid Remote — vanilla Svelte 5 + Mermaid editor on `:4000`

### Instructions

Create `packages/mermaid/` as a plain Svelte 5 + Mermaid app — no Custom
Element, no federation, no bus. `pnpm -F mermaid start` opens a browser to
`:4000`, the textarea (left) shows a seed `sequenceDiagram`, the right pane
renders the SVG preview, edits log `[standalone] diagram:changed` to console
after a ~500ms debounce. T10 will add the federate path on top.

**Package skeleton:**

```
packages/mermaid/
├── package.json
├── tsconfig.json
├── svelte.config.js          ← editor/IDE tooling
├── build.mjs                 ← --dev only in this task; --federate added in T10
├── public/
│   └── index.html            ← <div id="root"> + main.css/main.js
└── src/
    ├── standalone-main.ts    ← mount(MermaidEditor, { target: #root, props: {...} })
    ├── MermaidEditor.svelte  ← textarea + Mermaid SVG preview + onChange callback
    └── debounce.ts           ← 10-line helper, copy verbatim from packages/whiteboard/src/debounce.ts
```

**`package.json` (federation deps included in T10; T9 stays minimal):**

```json
{
  "name": "mermaid",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node build.mjs --dev",
    "build": "node build.mjs"
  },
  "dependencies": {
    "mermaid": "^11.4.1",
    "svelte": "^5.0.0"
  },
  "devDependencies": {
    "@frankenstein/shared": "workspace:*",
    "esbuild": "^0.25.1",
    "esbuild-svelte": "^0.9.0",
    "svelte-preprocess": "^6.0.0",
    "typescript": "~5.9.2"
  }
}
```

**`build.mjs` (--dev only; T10 extends with --federate).**

Mirror `packages/whiteboard/build.mjs`'s `buildStandalone` shape:
- `esbuild.context({ entryPoints: ['src/standalone-main.ts'], outfile: 'dist/main.js', bundle: true, format: 'esm', target: 'es2022', sourcemap: dev, minify: !dev, plugins: [sveltePlugin({ preprocess: sveltePreprocess(), compilerOptions: { dev } })], loader: { '.css': 'css' }, define: { 'process.env.NODE_ENV': dev ? '"development"' : '"production"' } })`
- `if (dev) { ctx.watch(); startDevServer(); }` else `await ctx.rebuild()`.
- `startDevServer` listens on `:4000` (NOT 3000), permissive CORS + 204 OPTIONS
  short-circuit (carried from whiteboard so T11's host fetch from `:4200`
  works without re-touching this file).
- `mkdirSync('dist', { recursive: true })` at top (T7 Decision #2 NF
  cache-persistence ENOENT bug; harmless for the standalone path but kept for
  symmetry with T10's federate path).

**`src/MermaidEditor.svelte`** — sourceState bridge as a prop, debounced upstream onChange:

```svelte
<script lang="ts">
  import mermaid from 'mermaid';
  import { onMount } from 'svelte';
  import { debounce } from './debounce';

  type Props = { sourceState: { value: string }; onChange: (s: string) => void };
  let { sourceState, onChange }: Props = $props();

  let svg = $state('');
  let renderError = $state<string | null>(null);
  const debouncedEmit = debounce((s: string) => onChange(s), 500);

  onMount(() => {
    mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
  });

  $effect(() => {
    const s = sourceState.value;
    let cancelled = false;
    (async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).slice(2)}`;
        const { svg: rendered } = await mermaid.render(id, s);
        if (!cancelled) { svg = rendered; renderError = null; }
      } catch (err) {
        if (!cancelled) renderError = (err as Error).message;
      }
    })();
    return () => { cancelled = true; };
  });
</script>

<div class="editor">
  <textarea
    bind:value={sourceState.value}
    oninput={(e) => debouncedEmit((e.target as HTMLTextAreaElement).value)}
    aria-label="Mermaid source"></textarea>
  <div class="preview">
    {#if renderError}<pre class="error">{renderError}</pre>{:else}{@html svg}{/if}
  </div>
</div>

<style>
  .editor { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; height: 100%; }
  textarea { width: 100%; height: 100%; font-family: monospace; resize: none; box-sizing: border-box; }
  .preview { overflow: auto; padding: 8px; }
  .error { color: #b00020; white-space: pre-wrap; }
</style>
```

**`src/standalone-main.ts`** — vanilla mount, sourceState held locally:

```ts
import { mount } from 'svelte';
import MermaidEditor from './MermaidEditor.svelte';

const sourceState = { value: 'sequenceDiagram\n  Alice->>Bob: Hi' };

mount(MermaidEditor, {
  target: document.getElementById('root')!,
  props: {
    sourceState,
    onChange: (source: string) => console.log('[standalone] diagram:changed', { mermaidSource: source }),
  },
});
```

(Standalone holds `sourceState` as a plain object, not `$state` — there is no
external mutator in standalone, so the textarea's `bind:value` is the only
writer. T10 introduces the `$state`-typed container in the Custom Element.)

**`tsconfig.json`:**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "types": ["node", "svelte"],
    "moduleResolution": "bundler"
  },
  "include": ["src/**/*"]
}
```

**`svelte.config.js`** — minimal, IDE tooling only:

```js
import { sveltePreprocess } from 'svelte-preprocess';
export default { preprocess: sveltePreprocess() };
```

**`public/index.html`:**

```html
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Mermaid Remote (standalone)</title></head>
<body style="margin:0;height:100vh"><div id="root" style="height:100vh"></div>
<script type="module" src="main.js"></script></body></html>
```

### Key Discoveries

- **Svelte 5 mount API.** `mount` / `unmount` from `'svelte'`. The
  Svelte+federation Vite OSS example uses `new app.default({ target })` —
  that's Svelte 4 and deprecated. Don't copy.
- **Mermaid `render(id, source)` is async**, returns
  `{ svg, bindFunctions? }`. `id` must be unique per call (Mermaid uses it
  for internal SVG IDs); collisions cause silent re-renders into stale DOM.
  Per-render `Math.random` is the simple fix.
- **`mermaid.initialize` once per page** in `onMount` is fine for V1.
  Multiple calls override config without harm in current Mermaid versions,
  but defensive: only call from inside the editor's `onMount`.
- **`securityLevel: 'loose'`** allows click handlers in diagrams (no effect
  for our editor, but the demo-friendly default).
- **`$effect` cleanup MUST guard async work.** Without the `cancelled` flag,
  rapid edits cause out-of-order awaited renders to overwrite the latest one.
- **`esbuild-svelte` requires `svelte-preprocess`** when using
  `<script lang="ts">`. Wire via `preprocess: sveltePreprocess()` in the
  plugin options.
- **Standalone CORS already on**, even though T9 doesn't need it. Cheaper to
  put it in once than to revisit `build.mjs` in T11.
- **`mermaid` bundle is heavy** (~2 MB minified, includes d3 + parser).
  Acceptable for V1; if T10's federate bundle balloons, consider
  `mermaid/dist/mermaid.esm.min.mjs` as the entry — don't optimise
  pre-emptively.

### Acceptance

- **T9-AC-01** — `pnpm install` from repo root completes. (Document any
  `--strict-peer-dependencies=false` need; same escape hatch as T7-AC-01.)
- **T9-AC-02** — `pnpm -F mermaid start` boots the dev server on `:4000`,
  file-watcher active, no errors in stdout.
- **T9-AC-03** — Browser to `http://localhost:4000` renders a textarea
  (with the seed `sequenceDiagram` source) on the left and a Mermaid SVG
  preview of the same diagram on the right. The textarea is editable.
- **T9-AC-04** — Editing the source — e.g. add `Bob->>Alice: Hello back` —
  updates the SVG preview within ~50ms (Mermaid render) AND fires exactly
  one `[standalone] diagram:changed` console entry per ~500ms (debounced
  producer-side), with `mermaidSource` containing the current full text.
- **T9-AC-05** — Invalid Mermaid syntax (e.g. `sequenceDiagram\n  Alice ->> Bob`
  followed by garbage) shows the error in the preview pane, doesn't throw to
  the console, and `diagram:changed` still fires on debounce (the host stores
  whatever the user typed; rendering is the editor's concern).
- **T9-AC-06** — DevTools console otherwise clean: no Svelte runtime warnings,
  no Mermaid initialization errors.

### Key Locations

- `packages/mermaid/package.json` (new)
- `packages/mermaid/tsconfig.json` (new)
- `packages/mermaid/svelte.config.js` (new)
- `packages/mermaid/build.mjs` (new — --dev path only)
- `packages/mermaid/public/index.html` (new)
- `packages/mermaid/src/standalone-main.ts` (new)
- `packages/mermaid/src/MermaidEditor.svelte` (new)
- `packages/mermaid/src/debounce.ts` (new — verbatim copy from
  `packages/whiteboard/src/debounce.ts`)

---

## Task 10: Federate-build + `<mermaid-remote>` Custom Element

**Depends on Task 9.** Reuses `MermaidEditor.svelte` and `debounce.ts`
unchanged. Adds the federation-expose layer on top.

### Instructions

Add `federation.config.js`, the federate path in `build.mjs`, the
`<mermaid-remote>` Custom Element wrapper that bridges the bus into the
existing `MermaidEditor`, and the bootstrap entry. After T10,
`pnpm -F mermaid build:federate` produces `dist/remoteEntry.json` exposing
`./Bootstrap`, and `<mermaid-remote>` is globally constructible from any page
that loads the bootstrap chunk.

**Step 1 — Add federation deps + scripts to `package.json`.**

Append to `dependencies`:
```json
"@softarc/native-federation-orchestrator": "4.0.0"
```

Append to `devDependencies`:
```json
"@softarc/native-federation": "~4.0.0",
"@softarc/native-federation-esbuild": "4.0.0-RC10"
```

Append to `scripts`:
```json
"build:federate": "node build.mjs --federate",
"build:federate:debug": "node build.mjs --federate --debug"
```

**Step 2 — `federation.config.js`** (verbatim shape from research, with
`skip` for esbuild-svelte):

```js
import { withNativeFederation, shareAll } from '@softarc/native-federation/config';

export default withNativeFederation({
  name: 'mermaid',
  exposes: { './Bootstrap': './src/bootstrap.ts' },
  shared: {
    ...shareAll(
      { singleton: true, strictVersion: true, requiredVersion: 'auto' },
      {
        overrides: {
          svelte:  { singleton: true, strictVersion: true, requiredVersion: 'auto', includeSecondaries: { keepAll: true } },
          mermaid: { singleton: true, strictVersion: true, requiredVersion: 'auto', includeSecondaries: { keepAll: true } },
        },
      },
    ),
  },
  features: { ignoreUnusedDeps: true },
  skip: ['esbuild-svelte'],
});
```

**Step 3 — Extend `build.mjs` with `--federate` (and `--debug`).**

Add at top:
```js
import sveltePlugin from 'esbuild-svelte';
import { sveltePreprocess } from 'svelte-preprocess';
import { runEsBuildBuilder } from '@softarc/native-federation-esbuild';
```

Add args:
```js
const isFederate = args.has('--federate');
const isDebug = args.has('--debug');
if (isFederate) { await buildFederate(); } else { await buildStandalone({ dev: isDev }); }
```

Add `buildFederate()`:
```js
async function buildFederate() {
  const federation = await runEsBuildBuilder('federation.config.js', {
    outputPath: 'dist',
    tsConfig: 'tsconfig.json',
    dev: isDebug,
    watch: false,
    entryPoints: ['src/bootstrap.ts'],
    adapterConfig: {
      plugins: [sveltePlugin({ preprocess: sveltePreprocess(), compilerOptions: { dev: isDebug } })],
      define: { 'process.env.NODE_ENV': isDebug ? '"development"' : '"production"' },
    },
  });
  await federation.close();
  console.log('Mermaid federate build complete.');
}
```

(No CSS-copy step — Mermaid inlines its styles into the rendered SVG, no
separate `.css` to ship. No `fileReplacements` — Svelte emits native ESM, the
React `jsx-runtime` bug does not apply.)

**Step 4 — `src/mermaid-remote.svelte.ts`** (`.svelte.ts` suffix so `$state`
works in TS):

```ts
import { mount, unmount } from 'svelte';
import { on, emit } from '@frankenstein/shared/bus';
import MermaidEditor from './MermaidEditor.svelte';

export class MermaidRemote extends HTMLElement {
  private app?: ReturnType<typeof mount>;
  private unsubs: Array<() => void> = [];
  private meetingId: string | null = null;
  // External $state container shared with MermaidEditor as its `sourceState` prop.
  // Mutating .value reactively re-renders the editor without unmount/mount.
  private sourceState = $state({ value: '' });

  connectedCallback() {
    this.unsubs.push(
      on('event:selected', (p) => {
        this.meetingId = p.meetingId;
        this.sourceState.value = p.initialData.mermaidSource ?? '';
      }),
    );
    this.app = mount(MermaidEditor, {
      target: this,
      props: {
        sourceState: this.sourceState,
        onChange: (source) => {
          if (!this.meetingId) return;
          emit('diagram:changed', { meetingId: this.meetingId, mermaidSource: source });
        },
      },
    });
    emit('context:request', {});
  }

  disconnectedCallback() {
    for (const u of this.unsubs) u();
    this.unsubs = [];
    if (this.app) { unmount(this.app); this.app = undefined; }
  }
}
```

**Step 5 — `src/bootstrap.ts`** — federation expose entry:

```ts
import { MermaidRemote } from './mermaid-remote.svelte';
customElements.define('mermaid-remote', MermaidRemote);
```

(Note: import path drops the `.ts` suffix per esbuild convention; `.svelte.ts`
files are imported as `.svelte`.)

**Step 6 — Verify the federate build.**

`pnpm -F mermaid build:federate` → inspect `dist/remoteEntry.json`. Expected
shape:
- `name: 'mermaid'`
- `exposes` array contains `{ key: './Bootstrap', outFileName: 'Bootstrap-<hash>.js' }`
- `shared` map covers `svelte`, `svelte/internal/*` (depending on `keepAll`),
  `mermaid`. `@frankenstein/shared` MUST be absent.
- If `remoteEntry.json` is missing immediately after `await federation.close()`
  resolves, that's the v3 timing-bug analog (research finding #3). Mitigation:
  poll `fs.access(dist/remoteEntry.json)` for ≤500ms before declaring success.
  Don't add this pre-emptively; only if observed.

### Key Discoveries

- **`.svelte.ts` filename suffix is mandatory** when using `$state` /
  `$derived` / `$effect` in a `.ts` file. Without it, the Svelte compiler
  doesn't process the file and the runes evaluate as undefined globals at
  runtime.
- **`adapterConfig.plugins` is the seam for `esbuild-svelte`.** The
  research-recommended "custom adapter" approach (from
  `native-federation-react`) gives more control but doubles the maintenance
  surface. We use `runEsBuildBuilder` + `adapterConfig.plugins` for symmetry
  with the working whiteboard package.
- **No `react/jsx-runtime`-style CJS dispatcher bug for Svelte.** Svelte 5
  emits native ESM at build time; there's no runtime
  `module.exports = require(...)` chain for NF's CJS bundler to mishandle.
  Skip the `fileReplacements` plumbing entirely.
- **`skip: ['esbuild-svelte']`** keeps the build tool out of the share map —
  research finding #7. Without it, NF would attempt to share an esbuild plugin
  as a runtime dep, which it isn't.
- **Svelte singleton is load-bearing.** Two Svelte runtimes side-by-side
  crash. The `overrides: { svelte: { singleton: true, strictVersion: true } }`
  is not cosmetic — it's the contract that lets the host's eventual second
  remote-page-instance share Svelte with the first.
- **`includeSecondaries: { keepAll: true }`** for `svelte` because the runtime
  is split across `svelte`, `svelte/internal/client`, etc. — same pattern as
  React in the whiteboard config.
- **Bus payloads are `DeepReadonly`** (T1/T6). `mermaidSource` is a string
  (immutable by nature) so no `structuredClone` needed at the boundary —
  TypeScript readonly applies cleanly without runtime cloning. Confirms with
  the `applyDiagramChange` consumer side in M2.
- **Initial source from bus is plain `string`**, not an object, so the
  `sourceState.value = ...` mutation is a single assignment — no deep-clone
  gymnastics.
- **NF cache invalidation gotcha (T8 Decision #8).** If a federate rebuild
  seems to ignore config changes, clear
  `node_modules/.cache/native-federation/mermaid/` once.
- **Federate build observability.** If anything goes wrong, run
  `pnpm -F mermaid build:federate:debug` — switches `dev: true`, gets
  sourcemaps + readable output. Same diagnostic infra as T8 Decision #4.

### Acceptance

- **T10-AC-01** — `pnpm -F mermaid build:federate` produces
  `dist/remoteEntry.json`. `exposes` lists `./Bootstrap`, `shared` covers
  `svelte` + `mermaid` as singletons, `@frankenstein/shared` is absent.
- **T10-AC-02** — `pnpm -F mermaid start` (still the standalone path) is
  unaffected — T9 acceptance criteria all still pass after T10's additions.
- **T10-AC-03** — Open `:4000` after building federate (`dist/main.js` from
  standalone gone, `dist/Bootstrap-*.js` present). The standalone HTML still
  loads the standalone bundle correctly because `pnpm -F mermaid start`
  rebuilds `dist/main.js` on watcher start. (If `dist/` mixing becomes
  confusing, document a `clean` script — same Open Issue as T7.)
- **T10-AC-04** — Manual customElement smoke from a throwaway HTML page: load
  `dist/Bootstrap-*.js` directly via `<script type="module" src="...">` →
  `customElements.get('mermaid-remote')` returns the class. (Optional — T11
  acceptance is the real proof-of-life. Skip if T11 runs immediately after.)
- **T10-AC-05** — `pnpm -F mermaid build:federate:debug` produces a dev-mode
  federate build (sourcemaps in `dist/*.js.map`, `*-dev.js` chunks referenced
  in `importmap.json`). No runtime bug to chase pre-emptively; this is
  diagnostic infra ready for T11 if needed.

### Key Locations

- `packages/mermaid/package.json` (modified — federation deps + scripts)
- `packages/mermaid/federation.config.js` (new)
- `packages/mermaid/build.mjs` (modified — adds `buildFederate()`,
  `--federate` / `--debug` arg handling)
- `packages/mermaid/src/mermaid-remote.svelte.ts` (new)
- `packages/mermaid/src/bootstrap.ts` (new)

---

## Task 11: Host integrates Mermaid via Native Federation

**Depends on Task 10.** Reuses `MODULE_LOADER` DI seam and `WhiteboardSlot`
template from M3.

### Instructions

Add the `mermaid` manifest entry, create a `MermaidSlot` component as a
near-copy of `WhiteboardSlot`, drop it into the lower middle-column cell, and
seed a sample diagram into "Architecture Review" so the Money-Shot is complete
on first load.

**Step 1 — Add manifest entry.**

`packages/shell/public/federation.manifest.json`:

```json
{
  "whiteboard": "http://localhost:3000/remoteEntry.json",
  "mermaid":    "http://localhost:4000/remoteEntry.json"
}
```

**Step 2 — `MermaidSlot` component** (port of `whiteboard-slot.*`):

`packages/shell/src/app/mermaid-slot.ts`:

```ts
import {
  Component, CUSTOM_ELEMENTS_SCHEMA, computed, inject, signal,
} from '@angular/core';
import { MODULE_LOADER } from './app.config';
import { MeetingService } from './meeting.service';

@Component({
  selector: 'app-mermaid-slot',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './mermaid-slot.html',
  styleUrl: './mermaid-slot.css',
})
export class MermaidSlot {
  private readonly loader = inject(MODULE_LOADER);
  private readonly service = inject(MeetingService);

  readonly remoteReady = signal(false);
  readonly hasMeeting = computed(() => this.service.currentMeeting() !== null);

  constructor() {
    this.loader
      .loadRemoteModule('mermaid', './Bootstrap')
      .then(() => this.remoteReady.set(true))
      .catch((err) => console.error('[shell] mermaid remote failed to load', err));
  }
}
```

`mermaid-slot.html`:
```html
@if (remoteReady() && hasMeeting()) {
  <mermaid-remote class="remote-mount"></mermaid-remote>
} @else if (!remoteReady()) {
  <div class="placeholder">Loading mermaid…</div>
} @else {
  <div class="placeholder">Pick a meeting</div>
}
```

`mermaid-slot.css`: copy `whiteboard-slot.css` verbatim.

**Step 3 — Drop `<app-mermaid-slot>` into the layout.**

Replace the lower middle-cell placeholder in `packages/shell/src/app/app.html`:

```html
<section class="col-mid">
  <app-whiteboard-slot></app-whiteboard-slot>
  <app-mermaid-slot></app-mermaid-slot>
</section>
```

Add `MermaidSlot` to `App`'s `imports` array in `app.ts`.

**Step 4 — Seed Mermaid source into Architecture Review.**

Edit `packages/shared/src/seed.ts`. Add to the Architecture Review entry:

```ts
mermaidSource: 'sequenceDiagram\n  Calendar->>MeetingService: selectMeeting(id)\n  MeetingService-->>Bus: event:selected\n  Bus-->>Whiteboard: render\n  Bus-->>Mermaid: render',
```

(Self-referential — the diagram literally shows the demo's communication flow.
Bonus: makes the Money-Shot self-explanatory.)

**Step 5 — Verify boot flow end-to-end.**

Three terminals: `pnpm -F whiteboard start`, `pnpm -F mermaid start`,
`pnpm -F shell start`. Browse `:4200`, click meetings, exercise the acceptance.

### Key Discoveries

- **Reuse `MODULE_LOADER` token.** No DI changes — T8 already plumbed it. M4
  is the proof that the seam scales to N remotes.
- **Eager-load in constructor** mirrors `WhiteboardSlot` (T8 Decision #2).
  Fetch happens in parallel with the user's first calendar click.
- **`CUSTOM_ELEMENTS_SCHEMA` localised to `MermaidSlot`** (mirror T8). Don't
  lift it to `App`.
- **No two-way bridging.** Slot is a mount + lifecycle gate. `meetingId` and
  `mermaidSource` arrive via `event:selected` on the bus; Angular doesn't pass
  props to `<mermaid-remote>`.
- **`context:request` boot path** exercised again. Late-mount sequence:
  bundle loads → Custom Element constructs → fires `context:request` →
  `MeetingService.rebroadcastCurrent()` re-emits `event:selected` → bridge
  mutates `sourceState.value` → Mermaid rerenders. Same path validated by T8.
- **Stale-update guard on `applyDiagramChange`** finally has a real producer.
- **Layout sizing.** `col-mid` is grid with two equal rows in M3's CSS. Both
  slots need `min-height: 0` to let the inner content (Excalidraw, Mermaid
  editor) actually scroll inside their cells. T8's `whiteboard-slot.css`
  already encodes the recipe.
- **Host has zero `mermaid` or `svelte` package dependency.** All
  Svelte/Mermaid code lives in the remote bundle, fetched at runtime. Host's
  `package.json` stays untouched.
- **CORS already on at `:4000`** (T9). Host on `:4200` cross-fetches
  `:4000/remoteEntry.json` + chunks without re-touching the remote.

### Acceptance

- **T11-AC-01** — `pnpm -F shell build` completes after the wiring. (Catches
  typos in `MermaidSlot` import / template tag name.)
- **T11-AC-02** — `pnpm -F shell start` on `:4200` boots clean. With `:3000`
  and `:4000` both running, DevTools Network tab shows fetches of both
  `:3000/remoteEntry.json` and `:4000/remoteEntry.json` shortly after boot.
- **T11-AC-03** — Before any meeting is clicked, both middle cells show
  "Loading …" briefly then "Pick a meeting".
- **T11-AC-04** — Click "Architecture Review" → Excalidraw renders in the
  upper cell (M3 regression check), Mermaid editor renders in the lower cell
  with the seeded source AND its rendered SVG preview. Bus log shows
  `event:selected`, two `context:request` rows (one per remote), and the
  re-emitted `event:selected`.
- **T11-AC-05** — Edit the Mermaid textarea → bus log shows `diagram:changed`
  rows at ~500ms cadence. DevTools > Application > LocalStorage >
  `frankenstein:meetings` — the entry for `meeting-architecture-review` has
  `mermaidSource` updated AND `mermaidUpdatedAt` set AND `updatedAt` set.
  Whiteboard data on the same meeting is unaffected.
- **T11-AC-06** — Reload `:4200`. Click "Architecture Review" again. Mermaid
  renders with the previously edited source visible.
- **T11-AC-07** — Click "Sprint Retro" with no prior diagram → Mermaid shows
  an empty editor (or the seed's default for that meeting). Click back to
  "Architecture Review" → edited source reappears. Switching meetings does
  NOT bleed `mermaidSource` between them — the in-place `sourceState.value`
  mutation cleanly re-renders without unmount.
- **T11-AC-08** — Stale-guard sanity: with "Architecture Review" selected,
  fire from DevTools `frankensteinBus.dispatchEvent(new CustomEvent('diagram:changed', { detail: { meetingId: 'meeting-sprint-retro', mermaidSource: 'graph TD\nA-->B' } }))`.
  LocalStorage's "Sprint Retro" entry is **not** modified.
- **T11-AC-09** — Stop the mermaid dev server (`:4000`), reload the shell.
  Console shows `[shell] mermaid remote failed to load`; the rest of the host
  (calendar, whiteboard slot, details, bus log) still renders. The lower
  middle cell is stuck on "Loading mermaid…".
- **T11-AC-10** — **Money-Shot check.** With everything running and
  "Architecture Review" selected, DevTools Network can be filtered to show
  three distinct framework bundles loaded: Angular host (`:4200`), React
  remote (`:3000`), Svelte remote (`:4000`). Three frameworks visibly loaded
  for one meeting.

### Key Locations

- `packages/shell/public/federation.manifest.json` (modified)
- `packages/shell/src/app/mermaid-slot.ts` (new)
- `packages/shell/src/app/mermaid-slot.html` (new)
- `packages/shell/src/app/mermaid-slot.css` (new — verbatim copy from
  `whiteboard-slot.css`)
- `packages/shell/src/app/app.html` (modified — replace lower middle cell)
- `packages/shell/src/app/app.ts` (modified — add `MermaidSlot` to imports)
- `packages/shared/src/seed.ts` (modified — add `mermaidSource` to
  Architecture Review)

---

## Cross-Cutting Acceptance

- **XC-01** — End-to-end Native Federation loop for the Svelte path: with
  `pnpm -F mermaid start` and `pnpm -F shell start` running, a single calendar
  click on "Architecture Review" triggers — in order — host emit of
  `event:selected`, remote `customElements.define` already complete, remote's
  `connectedCallback`, remote's `context:request`, host's
  `rebroadcastCurrent` re-emit, `sourceState.value` mutation, Svelte
  `$effect` re-renders the SVG. A subsequent edit triggers the reverse path:
  producer-side debounced `diagram:changed`, `MeetingService.applyDiagramChange`
  with stale-guard, LocalStorage write. Page reload restores the source via
  the seed → load → `selectMeeting` → bus chain.
  **Touches:** T9, T10, T11.

- **XC-02** — Both remotes coexist without cross-talk. With both
  `<whiteboard-remote>` and `<mermaid-remote>` mounted for the same meeting,
  drawing in Excalidraw fires only `drawing:changed` and only updates
  `excalidrawData`; editing Mermaid fires only `diagram:changed` and only
  updates `mermaidSource`. The two `*UpdatedAt` fields are independent. The
  `globalThis.frankensteinBus` singleton is shared exactly once across all
  three bundles (host + 2 remotes) — verifiable by
  `frankensteinBus === window.frankensteinBus` in any console after both
  remotes mount.
  **Touches:** T10, T11.
