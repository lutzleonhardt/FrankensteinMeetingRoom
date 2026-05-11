# Deployment

The Frankenstein Meeting Room deploys as a single fully-static
bundle under a subpath. Shell, React whiteboard remote, and Svelte
mermaid remote co-host in one directory tree; the server needs
nothing beyond plain static file serving. Federation works because
the host's manifest references the remotes by paths relative to
`document.baseURI` — same origin, no CORS.

Live demo:
[`https://lutzleonhardt.de/frankenstein-meeting-room/`](https://lutzleonhardt.de/frankenstein-meeting-room/).

## Target deployment layout

```
/frankenstein-meeting-room/
├── index.html               ← Angular shell
├── *.js, *.css              ← shell bundles
├── federation.manifest.json ← prod manifest (relative paths)
├── whiteboard/
│   ├── index.html           ← standalone whiteboard
│   ├── main.js, main.css    ← standalone bundle
│   ├── remoteEntry.json     ← federated manifest (consumed by shell)
│   ├── Bootstrap-*.js
│   └── excalidraw.css
└── mermaid/
    ├── index.html
    ├── main.js, main.css
    ├── remoteEntry.json
    ├── Bootstrap-*.js
    └── Bootstrap.css
```

Both per-remote subdirectories carry the standalone `index.html`
*and* the federated `remoteEntry.json` side-by-side — that's
already how each remote's `dist/` looks today. Three URLs work
post-deploy:

- `…/frankenstein-meeting-room/` — integrated app (shell + both
  remotes).
- `…/frankenstein-meeting-room/whiteboard/` — standalone React
  whiteboard.
- `…/frankenstein-meeting-room/mermaid/` — standalone Svelte
  mermaid editor.

## Build steps

The deploy build has exactly one manual step: editing the shell's
federation manifest from localhost URLs to relative paths. The
rest is `pnpm build:deploy` from the repo root.

1. **Edit `packages/shell/public/federation.manifest.json`.**
   Replace the localhost URLs with `./`-prefixed relative paths:

   ```json
   {
     "whiteboard": "./whiteboard/remoteEntry.json",
     "mermaid":    "./mermaid/remoteEntry.json"
   }
   ```

   The `./` prefix is load-bearing — see *Why the `./` prefix
   matters* below. The orchestrator prints a pre-flight warning
   if the manifest still references `http://localhost`, but it
   does not abort — the warning is a safety net, not a gate.

2. **Build from repo root:**

   ```bash
   pnpm build:deploy
   ```

   This runs `clean` on all three packages, then `build:deploy`
   on the shell and `build:standalone` + `build:federate` on both
   remotes. The orchestrator assembles everything into
   `dist/deploy/` matching the layout above.

3. **Upload `dist/deploy/`** to the server at
   `/frankenstein-meeting-room/`. Contents only — the
   `dist/deploy/` directory itself is the root of the deployed
   subtree, not a child of it.

4. **Revert the manifest** to the localhost URLs for further dev
   work. `pnpm install` does not touch the manifest, so the
   revert is a manual `git restore packages/shell/public/federation.manifest.json`
   (or an editor edit) — whichever fits your flow.

## Why the `./` prefix matters

A bare-relative manifest value like `"whiteboard/remoteEntry.json"`
fetches correctly (the browser resolves it against the document
base), but Native Federation also uses the same value as the
*prefix* it emits into the page's importmap. Importmap values
are required to be URLs; `es-module-shims` treats a bare-style
string as a bare specifier and refuses to resolve it, so chunk
imports like `whiteboard/Bootstrap-XYZ.js` fail at runtime with
"unable to resolve specifier".

Adding `./` turns the prefix into a relative URL
(`./whiteboard/Bootstrap-XYZ.js`), which resolves correctly
against `<base href="/frankenstein-meeting-room/">` to the
right file. The plan text and earlier task notes occasionally
showed the bare form — the canonical, working shape is the
`./`-prefixed one used in this document.

## Server requirements

Plain static file serving. No special configuration:

- No CORS rules — everything is same-origin under the subpath.
- No server-side rewrites or SPA fallback are *required*. The
  shell handles its own routing in-memory; direct deep links to
  `…/whiteboard/` and `…/mermaid/` hit real `index.html` files
  on disk.
- No HTTPS gymnastics — the host's deployment URL is served by
  the same origin as the parent site.
- MIME types: `.json` must be served as `application/json` (or
  `text/json`); `remoteEntry.json` is fetched and parsed as
  JSON. Most static hosts do this by default.

## Local verification (smoke-test recipe)

Before uploading, you can serve `dist/deploy/` locally under a
faked subpath to confirm the bundle is wired correctly:

```bash
# from repo root, after pnpm build:deploy
mv dist/deploy dist/frankenstein-meeting-room
npx serve dist -l 8088
# open http://localhost:8088/frankenstein-meeting-room/
```

Port 8088 is arbitrary — pick anything free. Reload with
DevTools open and confirm:

- The integrated app renders without console errors.
- Network shows `…/frankenstein-meeting-room/`,
  `…/frankenstein-meeting-room/whiteboard/`, and
  `…/frankenstein-meeting-room/mermaid/` each serving their own
  bundles.
- The demo flow from the [README](../readme.md#demo-flow) runs
  end-to-end on the deployed bundle.

Rename back (`mv dist/frankenstein-meeting-room dist/deploy`)
when done, or just `rm -rf dist/` and rebuild next time.

## Troubleshooting

- **Shell loads but remotes don't (console: "unable to resolve
  specifier `whiteboard/…`").** The manifest is still in dev
  shape, or the manifest values are bare-relative instead of
  `./`-prefixed. Re-check step 1.
- **Remotes load but their assets 404.** The deployed `<base
  href>` doesn't match the actual URL path. The shell's
  `<base>` is set at build time from the `build:deploy` script's
  `--base-href` flag — if the deploy URL changes, the shell
  must be rebuilt.
- **Stale artefacts after a previous deploy build.** Always
  `pnpm build:deploy` from a clean state; the orchestrator runs
  `clean` on all three packages before building, but a manual
  re-stage into a leftover smoke directory can leave older
  hashed chunks behind. When in doubt, `rm -rf dist/` first.
- **Excalidraw fonts 404 under `…/whiteboard/fonts/Assistant/`.**
  Should not happen with current builds — the whiteboard's
  federate build copies the upstream `fonts/` tree alongside
  `excalidraw.css`. If it does, you're on an older revision; pull
  latest.

## Operations (out of repo)

This document covers the repo-side workflow. Uploading
`dist/deploy/` to `lutzleonhardt.de/frankenstein-meeting-room/`
is operations work and lives outside the repo — there's no CI/CD
pipeline checked in. Once the upload is in place, the live demo
URL above is the canonical, always-on entry point.
