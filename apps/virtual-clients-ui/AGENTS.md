# Virtual Clients UI Rules

Applies to `apps/virtual-clients-ui/`.

## Boundary

This app is a thin projection/client of the Virtual Clients Rust backend under `experiments/virtual-clients/backend/`.

## Rules

- Consume `PUBLIC_CONTRACT_SCHEMA = 1`; never invent a second lifecycle, identity, resource, update, or recovery policy.
- Lifecycle controls consume backend `actions` availability. UI code must not infer button eligibility from client state.
- Setup guidance consumes `DoctorReport.nextSetupAction`; health issues are diagnostic facts only.
- `EnginePolicy` is read-only product policy. Do not create UI-owned configuration for invariant values.
- No account credentials, Microsoft tokens, Guest Agent tokens, world content, or independent persistent state.
- No fake runtime state in production code. If the desktop/backend bridge is unavailable, surface that state explicitly.
- Presentation-only preferences may remain ephemeral in component state.
- Every backend response must pass the versioned public contract boundary before entering UI state.
