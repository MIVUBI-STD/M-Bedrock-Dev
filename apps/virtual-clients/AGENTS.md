# Virtual Clients Desktop Rules

Applies to `apps/virtual-clients/`.

## Boundary

This is the canonical Tauri 2 + Svelte desktop application for the Virtual Clients Rust backend under `experiments/virtual-clients/backend/`.

## Rules

- Layering is `Svelte surfaces → typed Tauri facade → thin Tauri commands → Rust domain owner`.
- Consume `PUBLIC_CONTRACT_SCHEMA = 1`; never invent a second lifecycle, identity, resource, update, or recovery policy.
- Lifecycle controls consume backend `actions` availability. Presentation code must not infer permission from client state.
- Setup guidance consumes `DoctorReport.nextSetupAction`; health issues are diagnostic facts only.
- `EnginePolicy` is read-only product policy. Do not create desktop-owned configuration for invariant values.
- Desktop-native behavior such as window arrangement belongs under `src-tauri/src/engine/`; VM lifecycle semantics do not.
- Tauri commands are adapters only. They do not duplicate backend business rules.
- No account credentials, Microsoft tokens, Guest Agent tokens, world content, or independent persistent state.
- No fake runtime state in production code. Tauri/backend failures must surface explicitly.
- Presentation-only preferences may remain ephemeral in the owning Svelte surface.
- Every backend response must pass the versioned public contract boundary before entering presentation state.
- Do not reintroduce localhost HTTP transport, browser-global bridge injection, Inno Setup, or another desktop host.
