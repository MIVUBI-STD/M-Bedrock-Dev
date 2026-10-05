# Runtime Lab Backend

## Canonical architecture

```text
CLI now / Tauri later
        ↓
RuntimeLab
        ↓
Resource Planner + Client Lifecycle
        ↓
Provider
        ↓
VMware Workstation / VMware Fusion
```

Rust owns runtime truth.

## Identity

```text
Native
Base
Virtual-01
Virtual-02
Virtual-03
```

Only Virtual instances are numbered. `start 1..3` and `resources 1..3` always refer to the number of Virtual instances, never total players.

## Ownership

- `runtime.rs` — application lifecycle and operation serialization.
- `resources.rs` — adaptive RAM policy.
- `client.rs` — runtime identities and presentation state.
- `doctor.rs` — host/provider/base readiness and capacity.
- `provider/` — VMware mechanics only.
- CLI — thin operator adapter.

## Resource policy

Provisioning owns clone creation and fixed CPU policy only.

Boot owns RAM sizing:

```text
live available RAM
→ reserve host/native headroom
→ count requested stopped Virtual instances
→ calculate fair allocation
→ clamp floor/ceiling
→ round to 512 MB
→ write VMX
→ boot sequentially
```

Current bounds:

- one Virtual: 4–6 GB;
- two Virtual: 4–5 GB each;
- three Virtual: 4 GB each.

Running instances are never resized.

## Lifecycle

```text
doctor
provision
status
resources <1-3>
start <1-3>
open <instance>
stop [instance]
restart <Virtual>
set-ready <Virtual>
reset <Virtual>
reprovision <Virtual>
```

`reset` restores `QA_READY`; `restart` does not.

## Reliability

- OS-level mutation lock.
- Transactional clone staging.
- Provider command timeout.
- Base must be stopped before clone creation.
- Graceful shutdown before hard fallback.
- Adaptive memory reapplied after snapshot restore.
- Reprovision is destructive only for the selected stopped Virtual instance.
- No parallel runtime-state database.

## Frontend boundary

A future Svelte/Tauri layer must consume this Rust core and must not duplicate resource or provider policy.
