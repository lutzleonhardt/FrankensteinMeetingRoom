import { withNativeFederation, shareAll } from '@softarc/native-federation/config';

export default withNativeFederation({
  name: 'mermaid',
  exposes: { './Bootstrap': './src/bootstrap.ts' },
  shared: {
    ...shareAll(
      { singleton: true, strictVersion: true, requiredVersion: 'auto' },
      {
        overrides: {
          mermaid: { singleton: true, strictVersion: true, requiredVersion: 'auto', includeSecondaries: { keepAll: true } },
        },
      },
    ),
  },
  features: { ignoreUnusedDeps: true },
  // `svelte` is intentionally NOT shared. NF can only externalise
  // package-specifier imports, not relative paths. Svelte's `index-client.js`
  // (the browser entry) re-exports `mount`/`unmount`/`hydrate` from
  // `./internal/client/render.js` via a relative import — that file would be
  // inlined into the main `svelte.*.js` share chunk. But the compiled
  // `MermaidEditor.svelte` imports its reactive runtime from
  // `svelte/internal/client` (resolved by package-specifier), which lands in
  // the separately-shared `svelte_internal_client.*.js` chunk. Result: two
  // copies of the client runtime, two reactive scopes, every `$effect`
  // throws `effect_orphan`. Bundling svelte inline into Bootstrap.js
  // collapses both code paths to one module graph; cost is ~500 kB on top
  // of Bootstrap, dwarfed by Mermaid's own 4 MB chunk. Revisit if a second
  // Svelte remote ever joins the host and runtime de-duplication becomes
  // load-bearing.
  skip: ['esbuild-svelte', 'svelte'],
});
