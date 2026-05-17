// Guard against mixed-mode NF artifact-cache poisoning (prod/dev variants of
// shared `@angular/core` chunks coexist in the cache; the dev-variant define
// for `ngDevMode` isn't applied when a prod-variant chunk is loaded into a
// dev session). Pre-defining the global makes the load survive regardless of
// which variant `importmap.json` resolves to. Pair with `pnpm -F shell clean`
// when switching between `ng build` and `ng serve`.
(globalThis as { ngDevMode?: unknown }).ngDevMode ??= false;

import { initFederation, NativeFederationResult } from '@softarc/native-federation-orchestrator';
import {
  useShimImportMap,
  consoleLogger,
  globalThisStorageEntry,
} from '@softarc/native-federation-orchestrator/options';
import {
  sriEnabled,
  manifestIntegrity,
  hostRemoteEntryIntegrity,
} from './generated/sri-constants';

const hostRemoteEntry = sriEnabled
  ? { url: './remoteEntry.json', integrity: hostRemoteEntryIntegrity }
  : './remoteEntry.json';

initFederation(`federation.manifest.json?t=${Date.now()}`, {
  ...useShimImportMap({ shimMode: true }),
  logger: consoleLogger,
  storage: globalThisStorageEntry,
  hostRemoteEntry,
  ...(sriEnabled ? { manifestIntegrity } : {}),
  logLevel: 'debug',
})
  .then((nf: NativeFederationResult) =>
    import('./bootstrap').then((m) => m.bootstrap(nf)),
  )
  .catch((err) => console.error('[shell] federation init failed', err));
