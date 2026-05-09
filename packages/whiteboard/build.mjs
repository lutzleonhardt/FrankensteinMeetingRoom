import { createServer } from 'http';
import { copyFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import * as esbuild from 'esbuild';
import { runEsBuildBuilder } from '@softarc/native-federation-esbuild';

const args = new Set(process.argv.slice(2));
const isDev = args.has('--dev');
const isFederate = args.has('--federate');

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

  const federation = await runEsBuildBuilder('federation.config.js', {
    outputPath: 'dist',
    tsConfig: 'tsconfig.json',
    dev: false,
    watch: false,
    entryPoints: ['src/bootstrap.tsx'],
    adapterConfig: {
      plugins: [],
      define: { 'process.env.NODE_ENV': '"production"' },
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
  const server = createServer((req, res) => {
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = filePath.split('?')[0];
    const distPath = join('dist', filePath.replace(/^\//, ''));
    const publicPath = join('public', filePath.replace(/^\//, ''));
    let resolvedPath;
    if (existsSync(distPath)) resolvedPath = distPath;
    else if (existsSync(publicPath)) resolvedPath = publicPath;
    else if (existsSync(join('public', 'index.html'))) resolvedPath = join('public', 'index.html');
    if (!resolvedPath) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': mimeTypes[extname(resolvedPath)] || 'application/octet-stream',
    });
    res.end(readFileSync(resolvedPath));
  });
  server.listen(3000, () => {
    console.log('Whiteboard dev server: http://localhost:3000');
  });
}
