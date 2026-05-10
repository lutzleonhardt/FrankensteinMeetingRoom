import { createServer } from 'http';
import { copyFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import * as esbuild from 'esbuild';
import { runEsBuildBuilder } from '@softarc/native-federation-esbuild';

// Mirror of NF's @softarc/native-federation-esbuild/utils/react-replacements
// (not in the package's exports field, so we duplicate). Maps the React
// CJS dispatcher entries (`jsx-runtime.js` etc.) to the matching
// production/development build directly.
const reactReplacements = {
  dev: {
    'node_modules/react/index.js': { file: 'node_modules/react/cjs/react.development.js' },
    'node_modules/react/jsx-dev-runtime.js': { file: 'node_modules/react/cjs/react-jsx-dev-runtime.development.js' },
    'node_modules/react/jsx-runtime.js': { file: 'node_modules/react/cjs/react-jsx-runtime.development.js' },
    'node_modules/react-dom/index.js': { file: 'node_modules/react-dom/cjs/react-dom.development.js' },
  },
  prod: {
    'node_modules/react/index.js': { file: 'node_modules/react/cjs/react.production.min.js' },
    'node_modules/react/jsx-dev-runtime.js': { file: 'node_modules/react/cjs/react-jsx-dev-runtime.production.min.js' },
    'node_modules/react/jsx-runtime.js': { file: 'node_modules/react/cjs/react-jsx-runtime.production.min.js' },
    'node_modules/react-dom/index.js': { file: 'node_modules/react-dom/cjs/react-dom.production.min.js' },
  },
};

const args = new Set(process.argv.slice(2));
const isDev = args.has('--dev');
const isFederate = args.has('--federate');
const isDebug = args.has('--debug');

mkdirSync('dist', { recursive: true });

if (isFederate) {
  await buildFederate();
} else {
  await buildStandalone({ dev: isDev });
}

async function buildStandalone({ dev }) {
  const ctx = await esbuild.context({
    entryPoints: ['src/standalone-main.tsx'],
    outfile: 'dist/main.js',
    bundle: true,
    format: 'esm',
    target: 'es2022',
    sourcemap: dev,
    minify: !dev,
    jsx: 'automatic',
    loader: {
      '.css': 'css',
      '.woff': 'file',
      '.woff2': 'file',
      '.ttf': 'file',
      '.otf': 'file',
      '.png': 'file',
      '.svg': 'file',
    },
    assetNames: 'assets/[name]-[hash]',
    define: { 'process.env.NODE_ENV': dev ? '"development"' : '"production"' },
    conditions: dev ? ['development', 'browser'] : ['production', 'browser'],
    logLevel: 'info',
  });

  if (dev) {
    await ctx.watch();
    startDevServer();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    console.log('Whiteboard standalone build complete.');
  }
}

async function buildFederate() {
  // Excalidraw's CSS is exported via package.json `./index.css` with
  // development/production conditions. The federation share map externalizes
  // `@excalidraw/excalidraw/index.css` (subpath of a `keepAll: true` share)
  // but the importmap only resolves JS modules, so the CSS specifier 404s in
  // the browser. Copy the CSS to `dist/`; the Custom Element injects a <link>
  // resolved via `import.meta.url` so both standalone and federated hosts
  // pull it from the remote's own origin.
  copyFileSync('node_modules/@excalidraw/excalidraw/dist/prod/index.css', 'dist/excalidraw.css');

  // Diagnostic mode (--debug): switch the entire NF pipeline to dev. This is
  // the only way to get sourcemaps + readable output AND have the share
  // chunks referenced in importmap.json/remoteEntry.json — NF writes
  // `<name>-dev.js` filenames in dev mode and the orchestrator on the host
  // automatically picks them up via the manifest, no shell-side change
  // needed. Side effects of dev mode: process.env.NODE_ENV="development"
  // and React/Excalidraw resolveConditions=development. That can change the
  // bug surface (React dev typically yields much clearer errors than the
  // production-minified "j is not a function").
  const federation = await runEsBuildBuilder('federation.config.js', {
    outputPath: 'dist',
    tsConfig: 'tsconfig.json',
    dev: isDebug,
    watch: false,
    entryPoints: ['src/bootstrap.tsx'],
    adapterConfig: {
      plugins: [],
      define: { 'process.env.NODE_ENV': isDebug ? '"development"' : '"production"' },
      // Bypass react/jsx-runtime.js's NODE_ENV dispatcher: NF's CJS share
      // bundler wraps modules in a way that the size-3 named-export
      // extraction snippet runs before the wrapped CJS body populates
      // exports — leaving `jsx` undefined in the published share. Pointing
      // the entry directly at the resolved prod (or dev) file avoids the
      // dispatcher entirely. The same applies to react/index.js,
      // react-dom/index.js, jsx-dev-runtime.js.
      fileReplacements: isDebug ? reactReplacements.dev : reactReplacements.prod,
    },
  });
  await federation.close();
  console.log('Whiteboard federate build complete.');
}

function startDevServer() {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.map': 'application/json',
  };
  // Permissive CORS so the host on :4200 can cross-origin fetch
  // remoteEntry.json + the federate JS chunks + excalidraw.css from :3000.
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };
  const server = createServer((req, res) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, corsHeaders);
      res.end();
      return;
    }
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = filePath.split('?')[0];
    const distPath = join('dist', filePath.replace(/^\//, ''));
    const publicPath = join('public', filePath.replace(/^\//, ''));
    let resolvedPath;
    if (existsSync(distPath)) resolvedPath = distPath;
    else if (existsSync(publicPath)) resolvedPath = publicPath;
    else if (existsSync(join('public', 'index.html'))) resolvedPath = join('public', 'index.html');
    if (!resolvedPath) {
      res.writeHead(404, corsHeaders);
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      ...corsHeaders,
      'Content-Type': mimeTypes[extname(resolvedPath)] || 'application/octet-stream',
    });
    res.end(readFileSync(resolvedPath));
  });
  server.listen(3000, () => {
    console.log('Whiteboard dev server: http://localhost:3000');
  });
}
