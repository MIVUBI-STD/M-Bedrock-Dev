# Virtual Clients Desktop

Canonical product source for M-Bedrock Virtual Clients.

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
runtime-core/
                             VM lifecycle/domain authority
```

There is no localhost HTTP bridge, injected browser-global API, or second VM state authority.

Window arrangement is desktop-native presentation behavior. VM lifecycle eligibility stays in the backend.

## Packaging

The Tauri NSIS package includes the support CLI as the only host sidecar. Guest Agent is a guest payload and is packaged beside the guest preparation scripts under `guest/windows/`. `scripts/prepare-package-binaries.mjs` builds both binaries, stages the CLI as a target-specific sidecar, and stages Guest Agent as a package resource. Normal dev/check/test does not depend on package binary staging.

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

## Complete source checkpoint

From repository root, use `DEV.cmd verify-virtual-clients`. This is the canonical
focused developer entrypoint; package scripts above are app-local implementation
commands. The complete route includes both the root-managed frontend tests and
the canonical backend crate's tests, in addition to the app's Svelte/build/Tauri
checks. App-local `verify:source` alone is not the complete product checkpoint.

Prepare dependencies from their lockfiles in both the repository root and
apps/virtual-clients. Use the pinned Node/npm versions in toolchain.json, the
Rust toolchain used by the Virtual Clients backend workflow (including rustfmt),
and Windows desktop build prerequisites. See
[Development Operations](../../docs/06-system/development-operations.md#virtual-clients-source-verification).

This command does not build/install the distributable or start VMware/Minecraft.
Package and real-machine acceptance remain separate gates.
