import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import * as esbuild from 'esbuild';
import sveltePlugin from 'esbuild-svelte';
import { sveltePreprocess } from 'svelte-preprocess';

const args = new Set(process.argv.slice(2));
const isDev = args.has('--dev');

mkdirSync('dist', { recursive: true });

await buildStandalone({ dev: isDev });

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
