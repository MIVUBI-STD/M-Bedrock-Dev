# Virtual Clients Desktop

Canonical desktop application source for M-Bedrock Virtual Clients.

## Stack

```text
Tauri 2
Svelte 5
Vite
TypeScript
Tailwind CSS 4
Rust
```

This follows the same desktop architecture as `M-LazyBuilder-Plugin/apps/launcher`.

## Layer boundary

```text
Svelte product surfaces
        ↓
typed runtime facade
        ↓
thin Tauri command adapters
        ↓
Virtual Clients Rust backend
```

Ownership:

```text
src/                         presentation + ephemeral UI state
src/app/bridge/              typed Tauri boundary
src-tauri/src/commands/      thin adapters
src-tauri/src/engine/        desktop-native behavior only
experiments/virtual-clients/backend/
                             VM lifecycle/domain authority
```

There is no localhost HTTP bridge, injected browser-global API, or second VM state authority.

Window arrangement is desktop-native presentation behavior. VM lifecycle eligibility stays in the backend.

## Packaging

The Tauri NSIS package includes the support CLI and Guest Agent as sidecars plus guest/acceptance scripts as resources. `scripts/prepare-sidecars.mjs` builds target-specific sidecars before packaging.

## Commands

```bash
npm ci
npm run dev:app
npm run typecheck
npm run verify:source
npm run build:app
```
