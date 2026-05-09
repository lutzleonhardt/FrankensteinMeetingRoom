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
