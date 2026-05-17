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

The deploy build is `pnpm build:deploy` from the repo root — no
manual manifest edit required. The orchestrator generates the
prod-shape `federation.manifest.json` from scratch (relative,
`./`-prefixed URLs, object-shape entries with SRI hashes) and
writes it directly into `dist/deploy/`. The dev-shape manifest
at `packages/shell/public/federation.manifest.json` (with
`http://localhost:*` URLs) is left alone and stays the source of
truth for `ng serve`.

1. **Build from repo root:**

   ```bash
   pnpm build:deploy
   ```

   This runs `clean` on all three packages, builds both remotes
   first (their `remoteEntry.json` hashes seed the prod manifest),
   then builds the shell **twice** so the shell's own
   `remoteEntry.json` hash can be baked into `main.js` (see
   *Subresource Integrity* below). The orchestrator assembles
   everything into `dist/deploy/` matching the layout above.

2. **Upload `dist/deploy/`** to the server at
   `/frankenstein-meeting-room/`. Contents only — the
   `dist/deploy/` directory itself is the root of the deployed
   subtree, not a child of it.

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

## Subresource Integrity

The production build is SRI-hardened end-to-end. Every dynamic
load the shell performs at runtime — the federation manifest, the
shell's own `remoteEntry.json`, each remote's `remoteEntry.json`,
and each remote's chunks — is verified against a SHA-384 hash
computed at build time. A tampered file fails the integrity check
and refuses to execute; SRI does not silently degrade.

The hash chain anchors in `main.js`:

```
main.js  (Trust Root — built into the shell bundle)
  ├── manifestIntegrity              ← hash of federation.manifest.json
  └── hostRemoteEntry.integrity      ← hash of the shell's remoteEntry.json

federation.manifest.json
  ├── whiteboard: { url, integrity } ← hash of whiteboard/remoteEntry.json
  └── mermaid:    { url, integrity } ← hash of mermaid/remoteEntry.json

<remote>/remoteEntry.json
  └── integrity: { "<chunk>.js": "sha384-…" }   ← per-chunk hashes
```

Implementation notes:

- **Production-only.** `pnpm run dev` and `ng serve` stay
  SRI-free — `packages/shell/src/generated/sri-constants.ts` is
  a committed stub with `sriEnabled = false`. Watch-driven
  rebuilds of a single remote do not cascade into a shell rebuild.
- **Two-pass shell build.** The shell's own `remoteEntry.json` is
  produced by the shell build itself, so `build-deploy.mjs` runs
  the shell build twice: pass 1 to emit `remoteEntry.json`, hash
  it, then pass 2 to bake that hash plus the manifest hash into
  `main.js` via a generated `sri-constants.ts`. A sanity check
  asserts pass-2's `remoteEntry.json` is byte-identical to pass 1
  — if it drifts, the build aborts.
- **Build-order constraint.** Remotes must build before the shell
  so their `remoteEntry.json` hashes can be folded into the prod
  manifest, whose hash is then baked into the shell. The
  orchestrator enforces this; do not reorder.
- **Secure-context requirement.** `crypto.subtle.digest` (used by
  the Native Federation orchestrator to verify response bytes)
  only resolves under HTTPS or `localhost`. Plain-HTTP staging
  silently breaks SRI; both the live demo
  (`https://lutzleonhardt.de/…`) and the local smoke recipe
  (`localhost`) satisfy this.
- **Recovery from interrupted builds.** If `build-deploy.mjs` is
  killed mid-run and leaves `sri-constants.ts` in its prod state,
  `git checkout packages/shell/src/generated/sri-constants.ts`
  restores the dev stub.

Further reading:
[Native Federation — Subresource Integrity](https://native-federation.com/docs/orchestrator/security.html#subresource-integrity).

## Server requirements

Plain static file serving. No special configuration:

- No CORS rules — everything is same-origin under the subpath.
- No server-side rewrites or SPA fallback are *required*. The
  shell handles its own routing in-memory; direct deep links to
  `…/whiteboard/` and `…/mermaid/` hit real `index.html` files
  on disk.
- HTTPS or `localhost` is required for SRI to function (see
  *Subresource Integrity* above). Plain-HTTP staging will
  silently fail integrity checks.
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
- **Console: "Failed to find a valid digest in the 'integrity'
  attribute" or "integrity check failed".** SRI rejected a file
  whose bytes don't match the baked hash. Either the deployed
  tree drifted from the build artifacts (re-upload `dist/deploy/`
  as a single unit), the server is rewriting `remoteEntry.json`
  or the manifest (proxy adding whitespace, gzip-on-the-fly
  changing bytes — verify with `curl --compressed`), or the
  shell is being served over plain HTTP without a secure context.

## Operations (out of repo)

This document covers the repo-side workflow. Uploading
`dist/deploy/` to `lutzleonhardt.de/frankenstein-meeting-room/`
is operations work and lives outside the repo — there's no CI/CD
pipeline checked in. Once the upload is in place, the live demo
URL above is the canonical, always-on entry point.
