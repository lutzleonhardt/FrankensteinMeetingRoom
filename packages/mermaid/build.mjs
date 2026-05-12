import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync, readdirSync, copyFileSync } from 'fs';
import { extname, join } from 'path';
import * as esbuild from 'esbuild';
import sveltePlugin from 'esbuild-svelte';
import { sveltePreprocess } from 'svelte-preprocess';
import { runEsBuildBuilder } from '@softarc/native-federation-esbuild';

// Build-mode mental model is two-dimensional:
//   --federate ? federate output : standalone output
//   --dev      ? dev artifacts (sourcemaps, -dev.js chunks, no minify, NODE_ENV=development)
//              : prod artifacts (minified, NODE_ENV=production)
// `--dev` applies regardless of `--federate` — no separate `--debug` knob.
const args = new Set(process.argv.slice(2));
const isDev = args.has('--dev');
const isFederate = args.has('--federate');

mkdirSync('dist', { recursive: true });

if (isFederate) {
  await buildFederate({ dev: isDev });
} else {
  await buildStandalone({ dev: isDev });
}

async function buildStandalone({ dev }) {
  const ctx = await esbuild.context({
    entryPoints: ['src/standalone-main.svelte.ts'],
    outfile: 'dist/main.js',
    bundle: true,
    format: 'esm',
    target: 'es2022',
    sourcemap: dev,
    minify: !dev,
    plugins: [
      esmEnvPlugin(dev),
      sveltePlugin({
        preprocess: sveltePreprocess(),
        compilerOptions: { dev },
      }),
    ],
    loader: { '.css': 'css' },
    define: { 'process.env.NODE_ENV': dev ? '"development"' : '"production"' },
    conditions: dev ? ['development', 'browser'] : ['production', 'browser'],
    logLevel: 'info',
  });

  if (dev) {
    await ctx.rebuild();
    await ctx.watch();
    startDevServer();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    console.log('Mermaid standalone build complete.');
  }
}

async function buildFederate({ dev }) {
  // Federate-dev mode (--federate --dev) switches the entire NF pipeline to
  // dev — sourcemaps + readable output AND share chunks referenced as
  // `<name>-dev.js` in importmap.json/remoteEntry.json (the orchestrator
  // picks them up via the manifest). Same diagnostic infra as
  // packages/whiteboard/build.mjs (T8 Decision #4). No fileReplacements for
  // CJS dispatchers: Svelte 5 emits native ESM, so the React jsx-runtime
  // bug (T8 Decisions #6/#7) does not apply here.
  const federation = await runEsBuildBuilder('federation.config.js', {
    outputPath: 'dist',
    tsConfig: 'tsconfig.json',
    dev,
    watch: false,
    entryPoints: ['src/bootstrap.ts'],
    adapterConfig: {
      plugins: [
        esmEnvPlugin(dev),
        sveltePlugin({
          preprocess: sveltePreprocess(),
          compilerOptions: { dev },
        }),
      ],
      define: { 'process.env.NODE_ENV': dev ? '"development"' : '"production"' },
      // No Svelte fileReplacements: `svelte` is excluded from the federation
      // share map (see federation.config.js `skip`), so its imports are
      // resolved by plain esbuild with `platform: 'browser'` — which correctly
      // picks `index-client.js` via the `browser` export condition. The
      // explicit esm-env plugin above is still needed: Svelte 5's runtime
      // imports `DEV` from `esm-env/development`, and Softarc's source-code
      // bundler does not forward adapter `conditions` into esbuild.
    },
  });
  await federation.close();

  // Plan-block §Step 3 said "no CSS-copy step", reasoning that Mermaid
  // inlines diagram styles into rendered SVG. Correct for Mermaid's library
  // CSS — but `MermaidEditor.svelte`'s <style> block (grid layout, textarea
  // sizing, error pane) is compiled by esbuild-svelte into a CSS sidecar
  // emitted next to the Bootstrap chunk. JS and CSS file hashes differ, so
  // the CE can't derive the CSS filename from import.meta.url alone. Copy
  // it to a stable name (`mermaid-editor.css`) so the CE wrapper can
  // resolve it via `new URL('./mermaid-editor.css', import.meta.url).href`.
  // T9 log Key Decisions §3 already flagged this as a T10 surface.
  // esbuild emits the entry chunk's CSS as `Bootstrap.css` (no hash); chunked
  // splits would be `Bootstrap-<hash>.css`. Match both so the copy survives
  // either layout.
  const cssSidecar = readdirSync('dist').find((f) => /^Bootstrap(-[^/]+)?\.css$/.test(f));
  if (cssSidecar) {
    copyFileSync(join('dist', cssSidecar), join('dist', 'mermaid-editor.css'));
  }

  console.log('Mermaid federate build complete.');
}

function esmEnvPlugin(dev) {
  const modules = {
    'esm-env/development': dev,
    'esm-env/browser': true,
    'esm-env/node': false,
  };

  return {
    name: 'mermaid-esm-env',
    setup(build) {
      build.onResolve({ filter: /^esm-env\/(?:development|browser|node)$/ }, (args) => ({
        path: args.path,
        namespace: 'mermaid-esm-env',
      }));
      build.onLoad({ filter: /.*/, namespace: 'mermaid-esm-env' }, (args) => ({
        contents: `export default ${modules[args.path] ? 'true' : 'false'};`,
        loader: 'js',
      }));
    },
  };
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
  // remoteEntry.json + chunked JS from :4000 once T10/T11 land. Folded
  // in here for symmetry with packages/whiteboard/build.mjs.
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
  server.listen(4000, () => {
    console.log('Mermaid dev server: http://localhost:4000');
  });
}
