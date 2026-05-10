import { initFederation, NativeFederationResult } from '@softarc/native-federation-orchestrator';
import {
  useShimImportMap,
  consoleLogger,
  globalThisStorageEntry,
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
