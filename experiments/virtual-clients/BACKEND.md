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

- `runtime.rs` — observation collection, lifecycle orchestration and mutation serialization.
- `lifecycle_admission.rs` — pure lifecycle eligibility shared by action projection and execution; no provider, filesystem or Guest Agent access.
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

Verified daily boot paths require:

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

`open-base-finalization` is the only app-owned path that intentionally reopens a registered Base. It requires the canonical state to be exactly `REGISTERED`, requires Native/Base parity, starts the VM through the provider, and opens the provider UI. A `FINALIZING` or `FINALIZED` Base is rejected. If provider UI launch fails after start, the backend attempts to stop the Base again.

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

The canonical desktop application lives at `apps/virtual-clients/` and consumes this Rust core through typed Tauri commands. It must not duplicate provider, lifecycle, parity, update, resource, identity, or recovery policy.

`DoctorReport.nextSetupAction` is the sole first-run decision owner. Desktop presentation may classify that action as app-owned, user-guided, client-manager, or blocked for UX purposes, but it must refresh backend truth after every step and must never persist its own setup-completion state.


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


## Operability surface

`snapshot` is the canonical aggregate read-model for operator/frontend inspection.

`support-bundle` creates a diagnostic artifact from existing backend truth. It is not a state database and cannot influence lifecycle decisions. Bundle content excludes credentials, account identifiers, tokens, world content, and absolute runtime paths.


## Engine policy

Product/runtime limits have one read-only owner in `EnginePolicy`. Provider and frontend code must consume this policy rather than duplicate literals for maximum Virtual count, guest memory ceiling, vCPU count, Guest Agent port, or QA_READY snapshot name. Policy exposure does not make these values user-configurable.


## Health issue contract

`DoctorReport.issues` exposes machine-readable observed conditions with a typed code, severity, and optional Virtual client. Issues are diagnostic facts only; `nextSetupAction` remains the single recovery/setup decision owner. Frontend code must never derive a competing recovery flow by interpreting issue strings.


## Operation journal

Mutation operations write a bounded local history of the last 200 operations. Records contain only timestamp, typed operation, non-sensitive target, outcome, typed error code, and retryability. The journal is diagnostic-only: lifecycle decisions never read it, write failures are best-effort, and no error message, credential, token, account identifier, world content, or filesystem path is stored.


## Lifecycle action projection

`actions` exposes the lifecycle state machine as read-only per-Virtual action availability. Frontend controls must consume this projection instead of recreating Start/Suspend/Stop/Open/Restart/Set-ready/Reset/Reprovision state rules. The projection and mutation execution use the same `lifecycle_admission.rs::evaluate_lifecycle_admission` policy over observed `LifecycleFacts`. Facts are collected once per client for action projection and collected again under the operation lock before execution. They are never persisted as a second lifecycle state.

Admission includes power state, runtime schema, Base/client compatibility, saved VM identity, duplicate UUID/MAC detection, recovery-point availability, verified identity provenance, Base finalization for reprovision, and memory admission where applicable. Stop/Suspend do not depend on Minecraft compatibility; recreation can recover a stale client from a healthy finalized/stopped Base.

`ActionAvailability.reason` is an optional additive explanation. Existing `allowed` and `blocker` fields keep their schema-1 shape and enum values. Absence of a reason remains valid. Frontend code displays the explanation and must not interpret it as policy.

Every frontend command response now requires a payload validator in addition to the public envelope/schema check. Required consumed fields, enums, nullability, complete client/action lists, and the allowed/blocker relationship are checked before entering presentation state. Extra backend fields remain compatible.

STOPPED is displayed as Stopped, Native as Managed externally, and completed setup as Setup complete. These labels do not establish Minecraft gameplay readiness. Returning to the visible Clients page refreshes backend truth; no periodic heavyweight diagnostic polling or new persisted state is introduced.


## Naming and module boundary

The admission module is private to the existing crate. It owns power-state
validation and the combined admission decision. Runtime collects
`LifecycleFacts`, calls `require_lifecycle_admission` before mutation, and uses
`evaluate_lifecycle_admission` for the read-only action projection. The requiring
function delegates to that same evaluator; it does not own a second policy.
Eight existing policy regression tests live beside this owner. Runtime tests
continue to cover provider orchestration and rollback.

Presentation uses one term per operation:
- Recreate virtual client: replace the selected client from Base; destructive.
- Save recovery point: save the configured checkpoint after account setup.
- Restore recovery point: revert to that checkpoint, discarding later changes.
- Refresh: retrieve current displayed state, not recreate a client.
- Setup complete: setup milestones finished, not proof of a playable session.
- Pause / Paused / Resume: UI wording for suspend / SUSPENDED / start-resume;
  the guest is not an active multiplayer participant while paused.

Machine-facing schema-1 command names, state enums and QA_READY snapshot identity
remain unchanged. Presentation labels translate those identifiers; no command
aliases or second persisted state are introduced. Backend-origin progress events
and measured lightweight status performance remain separate pending work.

## First-time setup boot and command activity

`start-setup <Virtual-01..03>` is the explicit first-boot operation for a fresh
client. It uses the same operation lock, admission policy, provider startup and
rollback owner as daily startup. It requires a readable client profile with both
identity proofs absent, independently unique VM identity, no recovery point, a
finalized stopped compatible Base, current client lineage, and memory admission.
Partial/unreadable provenance is not treated as a fresh profile.

The operation starts/resumes the selected VM and opens its VMware window. It
returns observed power state with unknown Guest Agent/Minecraft/Windows identity
status, without waiting for OOBE or writing identity proof. Missing Guest Agent
during this explicit setup operation does not trigger the daily 90-second
verification rollback. Actual provider start/open failures still use rollback;
a pre-existing running client remains running on UI-open failure.

`verify-identities` remains the only identity-proof writer and still requires
all three running guests to pass live compatibility and uniqueness checks.
Normal Start/Resume/Restart/Reset verification remains unchanged. The desktop
shows first-time setup from optional `actions.startSetup` availability, prevents
fallback to daily Start when that setup action is blocked, and keeps batch daily
Start out of the identity-setup screen. The host's recommendation is displayed
beside the all-three-running requirement; it is not a capacity guarantee.

Command activity has an optional, per-invocation observer and versioned DTO:
schema 1, phase EXECUTING / SUCCEEDED / FAILED. It reports command dispatch and
serialized result only, not internal VM stages or percentage completion.
The existing CLI entry delegates to the same implementation without an observer.
The Tauri adapter forwards at most two messages through a per-invocation Channel;
channel-send failure cannot fail or retry the operation. The frontend validates
messages, ignores late callbacks after settlement, and keeps busy until normal
result parsing and state reconciliation finish. Invalid telemetry means progress
unavailable, not operation failure. No global event bus or persistent progress
state is introduced. See the [Tauri channel API](https://v2.tauri.app/develop/calling-frontend/).

Source implementation is not build, OOBE, transport-delivery or multiplayer proof.
Detailed internal stages, measured read-performance, and target acceptance remain
pending.
