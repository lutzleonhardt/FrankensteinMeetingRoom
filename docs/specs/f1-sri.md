# F1 — Subresource Integrity (Anti-Tamper für Federation-Artefakte)

Status: Draft
Depends on: V1 demo (SPEC.md, M1–M6) complete and deployed.

A post-MVP hardening feature: cryptographic integrity verification for every artifact the shell loads via Native Federation. Detects byte-level tampering of the federation manifest, every `remoteEntry.json`, and every JS module before execution.

---

## Goal & Non-Goal

**Goal.** Make the federation load path tamper-evident. If any artifact (manifest, remoteEntry, module bundle) is modified between build and execution, the orchestrator refuses to load it.

**Non-Goal.** This is not authentication, code signing, or build provenance. SRI checks bytes against a hash baked into the trusting party. It does not prove *who* produced the bytes — only that they have not changed since the hash was recorded.

**Time budget.** ≤ 1 working day. Two tasks, optionally a third for explicit tamper-regression.

---

## Threat Model

**Protects against:**

- Compromised remote-artifact origin (CDN, object storage)
- Cache poisoning between origin and browser
- MITM attacks during artifact fetch (defense-in-depth on top of HTTPS)
- Deploy mishaps where the wrong file lands at the right URL

**Does NOT protect against:**

- Compromised host (the host *is* the trust root — whoever controls the shell's `main.ts` controls the SRI check itself)
- Compromised build pipeline producing malicious bundles that get *valid* hashes
- Runtime manipulation via DevTools, browser extensions, hostile user scripts
- Anything after the bytes have entered the JS realm

This matters because Frankenstein Meeting Room currently deploys all three artifacts under one origin (`lutzleonhardt.de/frankenstein-meeting-room/`). The trust boundary SRI defends is the **delivery path** from disk-on-server to bytes-in-browser, not cross-team or cross-org trust. In this single-origin deployment, SRI's primary value is defense-in-depth against deploy/cache accidents, with the secondary upside that the architecture stays correct if remotes ever move to a separate CDN.

---

## Architecture

Native Federation 4.1+ verifies integrity at three layers. Each layer is opt-in per resource: provide a hash → bytes are verified; omit → fetched as-is.

```
┌────────────────────────────────────────────────────────────┐
│  Shell bootstrap                                           │
│    initFederation('manifest.json', { manifestIntegrity })  │
│      │                                                     │
│      ▼                                                     │
│  Layer 1: manifest.json hash verified by orchestrator      │
│      │                                                     │
│      ▼                                                     │
│  Layer 2: each entry in manifest is { url, integrity }     │
│           → remoteEntry.json bytes verified                │
│      │                                                     │
│      ▼                                                     │
│  Layer 3: integrity map inside each remoteEntry.json       │
│           → injected into import map                       │
│           → es-module-shims verifies each module load      │
└────────────────────────────────────────────────────────────┘
```

**Layer 1 — Manifest.** Hash supplied via `initFederation`'s `manifestIntegrity` option. Computed at shell build time, embedded into `main.ts`. The orchestrator hashes the response bytes of `manifest.json` via `crypto.subtle.digest()` *before* parsing as JSON; on mismatch it throws `NFError`.

**Layer 2 — Remote entries.** Two sub-cases:

- **Federated remotes** — manifest schema changes from `{ "name": "url" }` to mixed form supporting `{ "name": { "url": "...", "integrity": "sha384-..." } }`. Hash computed at shell build time from the deployed `remoteEntry.json` of each remote. Same `crypto.subtle.digest()` verification, same `NFError` on mismatch.
- **Host's own `remoteEntry.json`** — Frankenstein's shell carries its own `remoteEntry.json` as a shared-deps manifest (see SPEC.md *Native Federation Setup*). Pinned via `hostRemoteEntry: { url: './remoteEntry.json', integrity: 'sha384-...' }`. Worth pinning because it sits next to `manifest.json` on the same origin and is fetched on every boot.

**Layer 3 — Modules.** Each remote's `remoteEntry.json` carries a top-level `integrity` object keyed by `outFileName` (e.g. `{ "Bootstrap.mjs": "sha384-...", "chunk-AB12.js": "sha384-..." }`). Produced automatically by `@softarc/native-federation` when `features.integrityHashes: true` is set — covers every exposed module, shared external, and chunk. The orchestrator copies these hashes onto the absolute URLs in the import map it injects (`<script type="importmap">{ ..., integrity: { ... } }</script>`). `es-module-shims` (already in use via `useShimImportMap({ shimMode: true })`) enforces them on each module load — mismatch → fail to load.

**Mixed (partial) pinning is supported.** Any entry without a hash falls through as an unverified fetch — per the SRI spec, mirroring `<script integrity="…">` behavior. We pin everything in prod for consistency, but the runtime does not require an all-or-nothing posture.

**Hash format.** `sha{256|384|512}-{base64-digest}`. SHA-384 throughout — dominant in the official examples, stronger than SHA-256 with negligible overhead.

---

## Build Pipeline Changes

The hash-of-hashes structure creates a build-order dependency: **remotes must build before the shell**, because the shell needs each remote's final `remoteEntry.json` bytes to compute its hash for the manifest.

```
┌───────────────────────┐
│ 1. Build remotes      │  features.integrityHashes: true
│   (whiteboard,        │  → remoteEntry.json with module integrity map
│    mermaid)           │
└──────────┬────────────┘
           ▼
┌───────────────────────┐
│ 2. Compute hashes     │  SHA-384 of each remoteEntry.json
│   from deployed       │  → write into manifest.{env}.json as
│   artifacts           │     { url, integrity }
└──────────┬────────────┘
           ▼
┌───────────────────────┐
│ 3. Compute manifest   │  SHA-384 of the final manifest.json
│   hash                │  → inject into shell's main.ts
└──────────┬────────────┘
           ▼
┌───────────────────────┐
│ 4. Build shell        │  ng build shell — main.ts now contains
│                       │  manifestIntegrity literal
└───────────────────────┘
```

The current build orchestration (task-17) already sequences remotes before shell. SRI extends it with two compute steps between phases 1 and 4.

---

## Runtime Requirements

- **Secure context.** `crypto.subtle.digest()` only resolves under HTTPS or `localhost`. The orchestrator verification path therefore requires a secure context — fine for the existing deploy (`lutzleonhardt.de/frankenstein-meeting-room/`) and for local dev on `localhost:4200`. Plain-HTTP staging URLs would silently break SRI; document this.
- **`es-module-shims` with `shimMode: true` stays mandatory.** Currently configured in `shell/src/main.ts` via `useShimImportMap({ shimMode: true })`. Native browser support for the import-map `integrity` block is rolling out but not yet universally enforced — older or unsupported browsers silently ignore the integrity hashes (matches SRI spec, but means module-level enforcement disappears). Removing or downgrading to `useDefaultImportMap()` would silently demote SRI to "best effort". Do not.
- **No `initRemoteEntry()` use in this app.** The shell loads remotes via the static manifest. Dynamic remote registration via `initRemoteEntry` (which also supports `integrity`) is not used and stays out of scope.

---

## Dev-Mode Decision

In dev, hashes invalidate on every rebuild. Wiring SRI into `npm run dev` would mean rebuilding the shell whenever a remote rebuilds — kills the watch-driven feedback loop.

**Decision: SRI is production-only.** Dev mode runs without `manifestIntegrity` and without entry-level integrity in the manifest. The shell's `main.ts` selects between two `initFederation` calls based on a build-time `process.env.SRI_ENABLED` flag (or similar), produced by the existing build pipeline. This keeps dev fast and prod hardened — the standard trade-off for SRI in any framework.

Document this clearly in `docs/deployment.md`: SRI is part of the production build, not a runtime toggle.

---

## Acceptance Criteria

- **F1-AC-01.** Building any remote with the SRI feature enabled produces a `remoteEntry.json` whose root contains a non-empty top-level `integrity` object mapping each emitted output filename (exposed modules, shared externals, chunks) to a `sha384-` hash.
- **F1-AC-02.** The shell's build pipeline produces `manifest.prod.json` where every federated remote entry is the object shape `{ "url": "...", "integrity": "sha384-..." }` and the integrity value matches a fresh SHA-384 of the corresponding deployed `remoteEntry.json`.
- **F1-AC-03.** The shell's built `main.js` bundle contains the literal SHA-384 of `manifest.prod.json` as the `manifestIntegrity` argument to `initFederation` (verified by inspecting the bundle or by source-map lookup).
- **F1-AC-04.** The shell's built `main.js` passes `hostRemoteEntry: { url: './remoteEntry.json', integrity: 'sha384-...' }` to `initFederation`, with the integrity value matching a fresh SHA-384 of the shell's own deployed `remoteEntry.json`.
- **F1-AC-05.** Tamper regression for `manifest.json` or any `remoteEntry.json` (host or remote): modifying any byte causes the orchestrator to throw `NFError` from the relevant provider (manifest provider or remote-entry provider), shell boot aborts before any module is fetched.
- **F1-AC-06.** Tamper regression for a module chunk: modifying any byte of a deployed remote module file causes `es-module-shims` to fail that module's load. The corresponding remote does not render. The rest of the shell remains functional (i.e. the other remote and the host UI still work).
- **F1-AC-07.** Untampered prod build: shell loads both remotes identically to the current behavior (no functional regression). Network panel shows the same artifact set and load order.
- **F1-AC-08.** Dev mode (`npm run dev` across all packages) continues to work without any SRI involvement and without any hash-related errors. The deployed prod build under `https://lutzleonhardt.de/frankenstein-meeting-room/` continues to work — the secure-context requirement is satisfied.

---

## Open Decisions

1. **Where the manifest-hash injection happens.** Two options:
   - **(a) Build-time string replacement** in `main.ts` via esbuild `define` or a small codegen step. Simplest, deterministic.
   - **(b) Post-build patch** of the emitted bundle.
   
   Pick (a). Cleaner; survives Angular builder updates better than bundle-patching.

2. **Hash algorithm.** SHA-384 is the SRI sweet spot (stronger than SHA-256 with negligible overhead, broader support than SHA-512). Use SHA-384 throughout unless `native-federation` enforces otherwise.

3. **Manifest schema mix.** The orchestrator accepts both `"name": "url"` (string) and `"name": { "url", "integrity" }` (object) within the same manifest. Decision: convert *all* entries to object shape in prod manifests. Consistency over mixed shapes.

---

## Out of Scope

- **Supply-chain provenance** (Sigstore, signed builds, attestations) — answer when raised: *separate concern, this feature only verifies bytes-in-flight*.
- **Browser-native import-map integrity** without `es-module-shims` — track upstream rollout, but stay on shims for now.
- **Manifest signing** (separate signed manifest sidecar fetched at runtime) — adds a request, decouples shell build from remote builds, but premature for a demo.
- **Runtime hash rotation / online integrity update** — manifests are static per deploy.
- **Trusted Types + CSP hardening.** The Native Federation docs pair SRI with Trusted Types: the orchestrator already injects the import map through a TT policy named `nfo`. Enabling enforcement requires a CSP header (`Content-Security-Policy: require-trusted-types-for 'script'; trusted-types nfo`) and is the natural follow-up feature (candidate F4). Mentioned here only as future scope — *not* part of F1.

---

## Notes for `/plan`

This spec should produce a small task plan, target 2 tasks plus an optional third:

- **Task A — Remotes (and host) emit integrity hashes.** Enable `features.integrityHashes: true` in each `federation.config.mjs` (whiteboard, mermaid, *and* the shell — the host carries its own `remoteEntry.json` for shared deps). Verify `remoteEntry.json` shape post-build. No `initFederation` changes yet. AC-01 testable in isolation.
- **Task B — Shell pipeline computes and consumes integrity.** Three build-time hash computations: (1) SHA-384 of each remote's `remoteEntry.json` → inject into the prod manifest as `{ url, integrity }`; (2) SHA-384 of the shell's own `remoteEntry.json` → inject as `hostRemoteEntry.integrity` in `main.ts`; (3) SHA-384 of `manifest.prod.json` → inject as `manifestIntegrity` in `main.ts`. Implement via build-time string replacement (esbuild `define` or a small codegen step in the existing build orchestration). Update `initFederation` call accordingly. AC-02 through AC-04 and AC-07, AC-08 testable.
- **(Optional) Task C — Tamper regression.** A small script that mutates a byte in each artifact class (manifest, remoteEntry, module chunk) and runs the prod build in a headless browser to assert the failure path. AC-05, AC-06 testable.

Task A is independently shippable — it adds integrity metadata to artifacts without changing host behavior. Task B is the cut-over.

Task numbering will be assigned by `/plan` based on the current global counter (continuing from task-18). The plan filename is `docs/plans/f1-sri.md`.
