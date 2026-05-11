# Frankenstein Meeting Room

> Three frameworks, one workspace. Angular orchestrates. React draws. Svelte diagrams. Native Federation makes it work — without rewriting any of them.

A deliberately small demo of a real enterprise frontend integration pattern: one host application, multiple inherited capabilities from foreign frameworks, one shared business context.

Call it **Frankenstein-Driven Architecture**.

![LabNotebook.png](docs/specs/LabNotebook.png)

> **Remote owns capability. Host owns business context and persistence.**

This is **not a meeting app.** It is not production software. It demonstrates an integration architecture for heterogeneous frontend stacks — the kind of stack you find inside any enterprise after two acquisitions and a framework war.

## TL;DR — Run it

```bash
pnpm install
pnpm -F whiteboard dev   # http://localhost:3000 — React remote
pnpm -F mermaid    dev   # http://localhost:4000 — Svelte remote
pnpm -F shell      start # http://localhost:4200 — Angular host
```

Open `http://localhost:4200`, click **Architecture Review** in the calendar — the [demo flow](#demo-flow) starts there.

Each remote also runs solo on its own port — open `:3000` or `:4000` directly to see the remote without the shell.

## Architecture in One Sketch

```
Angular Host (Frankenstein Meeting Room)
├── Calendar (Schedule-X, native, NOT federated)
├── Event Detail View
│   ├── Whiteboard Slot      ← React Remote  (Excalidraw, Native Federation)
│   └── Mermaid Editor Slot  ← Svelte Remote (Mermaid, Native Federation)
├── Event Bus (host ↔ remotes, framework-agnostic EventTarget)
└── LocalStorage (per meeting)
```

Each remote is a complete app in its own framework, exposed as a Custom Element. Host and remotes communicate exclusively through a typed event bus — no shared component model, no shared reactivity, no leaky framework abstractions. The host is the single broadcast point for business context.

## Tech Stack

| Layer | Choice |
|---|---|
| Host framework | Angular 20+ |
| Calendar | Schedule-X (`@schedule-x/angular`) |
| Whiteboard | Excalidraw (React 18+) |
| Diagram editor | Mermaid + Svelte 5 wrapper |
| Federation runtime | Native Federation v4 + Orchestrator |
| Host build | `@angular-architects/native-federation-v4` |
| Remote build | `@softarc/native-federation-esbuild` |
| Persistence | LocalStorage |
| Workspace | pnpm |

## Repository Layout

```
frankenstein-meeting-room/
├── pnpm-workspace.yaml
├── docs/
│   ├── specs/SPEC.md          ← full architectural spec
│   ├── build-modes.md         ← build scripts, dev/prod, clean
│   ├── plans/                 ← per-milestone task plans
│   └── task-log/              ← per-task implementation logs
└── packages/
    ├── shared/                ← bus.ts, types.ts, seed.ts
    ├── shell/                 ← Angular host
    ├── whiteboard/            ← React remote (Excalidraw)
    └── mermaid/               ← Svelte remote (Mermaid)
```

## Quick Start

```bash
pnpm install
```

Run the host and both remotes in three separate terminals:

```bash
# terminal 1 — React whiteboard remote (federate build + standalone watch)
pnpm -F whiteboard dev          # http://localhost:3000

# terminal 2 — Svelte mermaid remote (federate build + standalone watch)
pnpm -F mermaid dev             # http://localhost:4000

# terminal 3 — Angular host
pnpm -F shell start             # http://localhost:4200
```

Start the remotes before the shell — the shell loads their `remoteEntry.json` at boot.

Sample meetings are placed Mon/Tue/Wed of the current week by `seed.ts`, so a fresh clone always shows a populated calendar.

## Build Modes

The two remotes build along two orthogonal axes — standalone vs. federate, dev vs. prod:

| Script (per remote) | What it produces |
|---|---|
| `dev` | Federate (dev) + standalone dev server. Default for host-integration work. |
| `start:standalone:dev` | Standalone dev server only (no federate output). |
| `build:standalone` | Production standalone bundle in `dist/`. |
| `build:federate` | Production `remoteEntry.json` + chunks in `dist/`. |
| `build:federate:dev` | Same as above, with sourcemaps and `NODE_ENV=development`. |
| `clean` | Wipes `dist/` + cached federation metadata. Run before switching modes. |

The host uses the stock Angular CLI (`start` / `build`) plus its own `clean` that also clears `.angular/cache` and the Native Federation cache. `build` and `build:deploy` go through a small Node wrapper (`packages/shell/scripts/ng-build.mjs`) that exits as soon as the artifacts land, because the `@angular-architects/native-federation-v4` post-step hangs after a successful build — see [`docs/build-modes.md`](docs/build-modes.md#why-build--builddeploy-go-through-a-node-wrapper).

The `clean` scripts exist because Native Federation's caches and `dist/` can carry stale state across `ng build` ↔ `ng serve` transitions and across standalone-vs-federate builds. See [`docs/build-modes.md`](docs/build-modes.md) for the full story (including why `Schedule-X` lives in `devDependencies`).

## Demo Flow

![Money Shot — Architecture Review with both remotes populated](docs/specs/MoneyShot.png)

A 30-second click-through that exercises every integration moment. With all three dev servers running and a cleared LocalStorage:

1. Open `http://localhost:4200`. The calendar shows three meetings this week.
2. Click **Architecture Review**. Excalidraw renders a populated sketch (React remote), Mermaid renders the seeded sequence diagram (Svelte remote). The right column fills in with title, time, attendees, and the **Whiteboard / Mermaid last-changed timestamps**. The Bus Log shows one `event:selected` plus two `context:request` rebroadcasts.
3. Edit the Mermaid source. The Bus Log shows `diagram:changed` rows at ~500 ms cadence; the **Mermaid** row in Meeting Details ticks forward.
4. Draw on the Excalidraw canvas. The Bus Log shows `drawing:changed` rows; the **Whiteboard** row ticks. Resize / scroll / select fire *nothing* — the producer dedups by element version.
5. Open DevTools → Network, reload, filter by `*.js`. Three distinct origins serve their respective bundles: `:4200` (Angular shell), `:3000` (React whiteboard), `:4000` (Svelte mermaid). *Three frameworks, one workspace.*

## Why This Pattern

Heterogeneity in enterprise frontends is permanent. Acquisitions bring new stacks, teams pick what they know, framework tides shift. The rewrite-first approach treats this as a problem to be eliminated; this repo treats it as a constraint to design with.

This pattern is for:

- **Acquired frontend stacks** that must coexist with the parent's stack
- **Long-lived Angular (or React, or Vue) shells** that need to keep shipping
- **Teams that cannot rewrite everything** — and shouldn't have to
- **Capabilities easier to build in another ecosystem** (Excalidraw is React; you don't port it)
- **Migration paths** where old and new must coexist for years, not weeks

Old code keeps shipping. New capabilities arrive as islands. No all-or-nothing rewrite gate.

## Out of Scope (Production Concerns)

This is a demo of an integration architecture, not a production application. Deliberately out of scope:

- Authentication and authorization
- Cross-origin deployment, CSP, SRI hardening
- Backend persistence, server-side rendering
- Multi-user collaboration, optimistic locking, CRDTs
- Contract versioning between host and remotes
- Observability, error boundaries, remote-availability fallback
- Mobile responsive layouts (desktop-only by design)
- Tests

If your reaction is *"but a real production system would need X"*: yes, exactly. The architecture is what's being demonstrated, not a production-ready meeting app.

## Reading Order

1. The [Dev.to series](https://dev.to/lutz_leonhardt/-the-frankenstein-meeting-room-how-to-stitch-angular-react-and-svelte-into-one-app-351g) for the narrative and the *why*.
2. [`docs/specs/SPEC.md`](docs/specs/SPEC.md) for the technical depth.
3. [`docs/build-modes.md`](docs/build-modes.md) for the build / dev-loop details.
4. The code, package by package.

## License

MIT.
