# Virtual Clients Desktop

Canonical desktop application source for M-Bedrock Virtual Clients.

## Stack

```text
Tauri 2
Svelte 5
Vite
TypeScript
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

The Tauri NSIS package includes the support CLI and Guest Agent as package-only sidecars plus guest/acceptance scripts as resources. `scripts/prepare-sidecars.mjs` builds target-specific sidecars only for package/release work; normal dev/check/test does not depend on sidecar staging.

## Commands

```bash
npm ci
npm run dev:app
npm run typecheck
npm run verify:source
npm run build:app
```
