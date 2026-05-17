import { withNativeFederation, shareAll } from '@angular-architects/native-federation-v4/config';

// Note: `@frankenstein/shared` is intentionally NOT federated.
// It is consumed as TS source by every bundle; the bus is a
// `globalThis` singleton (see `packages/shared/src/bus.ts`), so a
// federated copy would buy nothing at runtime. `shareAll` only
// iterates `dependencies`, and `@frankenstein/shared` lives in the
// shell's `devDependencies` for that reason — keep it there.

export default withNativeFederation({
  name: 'shell',

  shared: {
    ...shareAll(
      { singleton: true, strictVersion: true, requiredVersion: 'auto', build: 'package' },
      {
        overrides: {
          // includeSecondaries is an opt-out of ignoreUnusedDeps, so all of
          // @angular/core is shared to prevent mismatches.
          '@angular/core': {
            singleton: true,
            strictVersion: true,
            requiredVersion: 'auto',
            build: 'package',
            includeSecondaries: { keepAll: true },
          },
        },
      },
    ),
  },

  skip: [
    'rxjs/ajax',
    'rxjs/fetch',
    'rxjs/testing',
    'rxjs/webSocket',
    // Add further packages you don't need at runtime
  ],

  // Please read our FAQ about sharing libs:
  // https://shorturl.at/jmzH0

  features: {
    // ignoreUnusedDeps is enabled by default now
    // ignoreUnusedDeps: true,

    // Opt-in: groups chunks in remoteEntry.json for smaller metadata file
    denseChunking: true,

    // SRI metadata emission (consumed in Task 20). Production-only — dev
    // builds skip the build:federate path, so watch-rebuilds stay hash-free.
    integrityHashes: true,
  },
});
