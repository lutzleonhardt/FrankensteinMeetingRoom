import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync, readdirSync, copyFileSync } from 'fs';
import { extname, join } from 'path';
import * as esbuild from 'esbuild';
import sveltePlugin from 'esbuild-svelte';
import { sveltePreprocess } from 'svelte-preprocess';
import { runEsBuildBuilder } from '@softarc/native-federation-esbuild';

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
    entryPoints: ['src/standalone-main.svelte.ts'],
    outfile: 'dist/main.js',
    bundle: true,
    format: 'esm',
    target: 'es2022',
    sourcemap: dev,
    minify: !dev,
    plugins: [
      sveltePlugin({
        preprocess: sveltePreprocess(),
        compilerOptions: { dev },
      }),
    ],
    loader: { '.css': 'css' },
    define: { 'process.env.NODE_ENV': dev ? '"development"' : '"production"' },
    logLevel: 'info',
  });

  if (dev) {
    await ctx.watch();
    startDevServer();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    console.log('Mermaid standalone build complete.');
  }
}

async function buildFederate() {
  // Diagnostic mode (--debug): switches the entire NF pipeline to dev — gets
  // sourcemaps + readable output AND has the share chunks referenced in
  // importmap.json/remoteEntry.json (NF emits `<name>-dev.js` filenames in
  // dev mode and the orchestrator picks them up via the manifest). Same
  // diagnostic infra as packages/whiteboard/build.mjs (T8 Decision #4).
  // No fileReplacements: Svelte 5 emits native ESM, so the React jsx-runtime
  // CJS dispatcher bug (T8 Decisions #6/#7) does not apply here.
  const federation = await runEsBuildBuilder('federation.config.js', {
    outputPath: 'dist',
    tsConfig: 'tsconfig.json',
    dev: isDebug,
    watch: false,
    entryPoints: ['src/bootstrap.ts'],
    adapterConfig: {
      plugins: [
        sveltePlugin({
          preprocess: sveltePreprocess(),
          compilerOptions: { dev: isDebug },
        }),
      ],
      define: { 'process.env.NODE_ENV': isDebug ? '"development"' : '"production"' },
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
  const cssSidecar = readdirSync('dist').find((f) => /^Bootstrap-.*\.css$/.test(f));
  if (cssSidecar) {
    copyFileSync(join('dist', cssSidecar), join('dist', 'mermaid-editor.css'));
  }

  console.log('Mermaid federate build complete.');
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
