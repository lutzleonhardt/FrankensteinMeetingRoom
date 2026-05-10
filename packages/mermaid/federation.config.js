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
