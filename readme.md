# Frankenstein Meeting Room

> Three frameworks, one workspace. Angular orchestrates. React draws. Svelte diagrams. Native Federation makes it work — without rewriting any of them.

A deliberately small demo of a real enterprise frontend integration pattern: one host application, multiple inherited capabilities from foreign frameworks, one shared business context.

Call it **Frankenstein-Driven Architecture**.

![LabNotebook.png](specs/LabNotebook.png)

> **Remote owns capability. Host owns business context and persistence.**

This is **not a meeting app.** It is not production software. It demonstrates an integration architecture for heterogeneous frontend stacks — the kind of stack you find inside any enterprise after two acquisitions and a framework war.

## Status

> **Spec complete, implementation in progress.** This repository currently contains the architecture spec and milestone plan. Runnable code lands milestone by milestone — see *Milestones* below.

- Narrative walkthrough: [Dev.to series](https://dev.to/lutz_leonhardt) — Part 1 published
- Full architectural spec: [`specs/SPEC.md`](specs/SPEC.md)

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
├── specs/
│   └── SPEC.md                  ← full architectural spec
└── packages/
    ├── shared/                  ← bus.ts, types.ts, seed.ts
    ├── shell/                   ← Angular host
    ├── whiteboard/              ← React remote (Excalidraw)
    └── mermaid/                 ← Svelte remote (Mermaid)
```

## Quick Start

```bash
pnpm install
```

Run the host and both remotes in three separate terminals:

```bash
# terminal 1 — Angular host
pnpm --filter shell start          # http://localhost:4200

# terminal 2 — React whiteboard remote
pnpm --filter whiteboard start     # http://localhost:3000

# terminal 3 — Svelte mermaid remote
pnpm --filter mermaid start        # http://localhost:4000
```

Each remote is **also runnable standalone** — open the localhost URL of a remote directly to see it render against a built-in mock host, no shell required. This is how the remotes get developed and debugged in isolation.

## Milestones

- [x] **M1** — Workspace + Host Skeleton + Federation Init
- [ ] **M2** — Host complete: Calendar + State + Layout + Bus Log
- [ ] **M3** — React Whiteboard Remote (standalone + integrated)
- [ ] **M4** — Svelte Mermaid Remote (standalone + integrated)
- [ ] **M5** — Polish + Stretch

Each milestone produces a usable artifact. See [`specs/SPEC.md`](specs/SPEC.md) for done-criteria per milestone.

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

1. The [Dev.to post](https://dev.to/lutz_leonhardt/-the-frankenstein-meeting-room-how-to-stitch-angular-react-and-svelte-into-one-app-351g) for the narrative and the *why*.
2. [`specs/SPEC.md`](specs/SPEC.md) for the technical depth.
3. The code, milestone by milestone.

## License

MIT.