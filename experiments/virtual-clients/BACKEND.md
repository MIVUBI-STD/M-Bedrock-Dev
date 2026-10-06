# Virtual Clients Backend

## Product boundary

M-Bedrock Virtual Clients is a local multi-instance environment for Minecraft Education.

Player input and gameplay remain manual.

```text
Native
→ authority

VirtualClients
├── Runtime Profile
├── Lifecycle
├── Resource Pressure
├── Runtime Telemetry
├── Identity Health
└── Guest Compatibility
        ↓
     Provider
        ↓
VMware Workstation / VMware Fusion
```

Rust owns runtime truth.

## Ownership

- `runtime.rs` — lifecycle orchestration and mutation serialization.
- `profile.rs` — Native Minecraft detection, Base provenance and version parity.
- `guest.rs` — read-only Guest Agent protocol.
- `resources.rs` — host pressure policy.
- `client.rs` — public instance/status contract.
- `doctor.rs` — provider, Base, capacity and parity readiness.
- `provider/` — VMware mechanics and VMX inspection.
- `virtual-guest-agent` — guest-side read-only runtime probe.
- `virtual-clients` — thin operator CLI.

No parallel runtime state database exists.

## Version invariant

Native is the version authority.

```text
Native Minecraft
= registered Base Minecraft
= live Virtual Minecraft
```

A mismatch is not a warning-only state for boot operations.

Boot paths require:

1. Native version detectable;
2. registered Base profile present;
3. Native/Base versions equal;
4. Guest Agent reachable after boot;
5. Guest Agent version equals backend version;
6. Virtual Minecraft version equals Native.

## Base provenance

The Base has one canonical lifecycle marker in VM configuration:

```text
guestinfo.virtualclients.baseState
REGISTERED → FINALIZING → FINALIZED
```

`register-base` performs live verification while the Base is still reusable, then marks it `REGISTERED`. `finalize-base.ps1 -ConfirmGeneralize` runs Windows Sysprep generalization inside the Base, verifies the marker becomes `FINALIZED`, then shuts Windows down. `provision` and `reprovision` accept only a stopped `FINALIZED` Base. A finalized Base must never be booted for re-registration.

`register-base` records the currently detected Native Minecraft version beside the stopped Base.

That record means:

> this Base was intentionally prepared for this Native version.

It is not live guest proof. Live Virtual proof comes from the Guest Agent after boot.

## Runtime states

```text
NOT_PROVISIONED
STOPPED
SUSPENDED
RUNNING
ERROR

Native:
MANUAL
```

`QA_READY` is a checkpoint, not a lifecycle state.

## Resource policy

Each Virtual:

```text
memory ceiling = 4096 MB
vCPU           = 2
```

Runtime telemetry keeps configured memory separate from observed process resident memory.

Host pressure:

```text
NORMAL
PRESSURE
CRITICAL
```

Virtual Clients never silently kills existing running clients because of host pressure.

## Reliability

- OS-level operation lock.
- Transactional linked-clone staging.
- Cleanup of abandoned staging data.
- Immutable Base requirement.
- Native/Base version parity gate.
- Live Virtual/Native version parity gate.
- Guest Agent/backend version parity gate.
- Unique VM UUID/MAC identity check.
- VM identity and Windows machine-identity proof across all three running Virtual instances.
- Verified identity fingerprints are stored only as client provenance for later QA_READY gating.
- Base Microsoft device-registration preflight rejects Entra/Workplace-joined source images.
- Pressure-aware staggered boot.
- Batch rollback on start failure.
- Rollback failure visibility.
- Graceful stop with bounded hard fallback.
- Long timeout for clone/suspend/resume/snapshot operations.
- Suspend/fast-resume path.
- Clean QA_READY reset.
- Selected-instance reprovision.

## Account persistence invariant

Account state is guest-owned, not backend-owned.

```text
Base       = no Microsoft/Minecraft user session
Virtual-01 = its own persistent guest/account state
Virtual-02 = its own persistent guest/account state
Virtual-03 = its own persistent guest/account state
```

Virtual Clients never stores Microsoft passwords, access tokens, refresh tokens, or equivalent account secrets in runtime/profile data.

Normal lifecycle operations (`start`, `stop`, `restart`, `suspend`, resume through `start`, and `open`) must not revert a snapshot, recreate the VM, or otherwise replace the selected Virtual's persistent guest disk.

`QA_READY` is created only after `verify-identities` has persisted verified VM + Windows identity fingerprints and that Virtual completes one-time account setup. `reset` therefore returns to the configured checkpoint. Microsoft/Minecraft may still invalidate or expire a session independently; that is a real account condition, not backend state.

`reprovision` is destructive to the selected Virtual's guest/account state because it creates a fresh clone from Base. The public runtime contract requires an explicit destructive confirmation, and the CLI requires `--destroy-account-state`. It is recovery/setup, not normal daily lifecycle.

## Disk policy

Do not automatically shrink or compact Virtual disks while snapshot chains exist.

Safe cleanup:

```text
fully stop Virtual
→ reprovision Virtual --destroy-account-state
→ rebuild from Base
```

`reset` is non-destructive to the intended QA baseline: it restores `QA_READY`, boots the selected Virtual, and returns `RUNNING`.

## Emulator feature gate

Do not expose a feature unless a provider primitive can enforce it measurably.

Not exposed today:

- fake Eco mode;
- live RAM resize;
- automatic kill under pressure;
- automatic snapshot-chain disk shrink;
- unverifiable FPS/GPU throttles.

## Frontend boundary

Future Tauri/Svelte code must consume this Rust core. It must not duplicate provider, lifecycle, parity, update, or resource policy.


## Public contract

The backend has one public contract schema for CLI/application-boundary JSON.

Success:

```json
{"schema":1,"data":{...}}
```

Failure:

```json
{"schema":1,"code":"INVALID_INPUT","message":"...","retryable":false}
```

Internal provider, path, schema-storage, guest-wire and persistence modules are not public API. Frontend code must consume the exported root contract only.


## Backend v1 freeze

Public contract schema `1` is frozen before frontend work.

Allowed before real-machine acceptance:

- correctness fixes backed by a failing test or concrete audit finding;
- security hardening;
- deterministic provider simulation;
- persistence/recovery fixes;
- verifier and documentation corrections.

Not allowed without new evidence:

- new runtime state owners;
- alternate lifecycle entrypoints;
- duplicate terminology/aliases;
- speculative provider features;
- automatic account handling;
- frontend-owned policy;
- compatibility shims for contracts that have no real consumer yet.

A public-contract breaking change must increment `PUBLIC_CONTRACT_SCHEMA`. A runtime-data format breaking change must increment `CURRENT_RUNTIME_SCHEMA`. These are separate version domains.
