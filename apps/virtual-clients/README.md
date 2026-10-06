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


## First-run orchestration

`DoctorReport.nextSetupAction` remains the sole setup decision owner. The desktop maps that machine action to one of four presentation owners:

```text
APP      → safe operation can run directly
USER     → Windows/VMware infrastructure step requires a person
CLIENTS  → continue in the client manager
BLOCKED  → stop and route to support
```

The desktop never infers the next setup state from health issues. User-owned steps always finish by refreshing backend truth; there is no UI-completed setup flag.

Base creation and Windows Sysprep remain guided user steps because the backend has no safe primitive that owns those actions yet. The UI must not pretend they are automated.
