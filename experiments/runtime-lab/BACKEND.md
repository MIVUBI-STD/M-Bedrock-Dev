# Runtime Lab Backend

Runtime Lab V1 is a manual multi-client launcher for Minecraft Education.

## Canonical architecture

```text
CLI now / Tauri commands later
            ↓
        RuntimeLab
            ↓
          Client
            ↓
         Provider
            ↓
VMware Workstation / VMware Fusion
```

Rust owns runtime truth. VMware/filesystem state is observed directly; there is no parallel runtime-state database.

## Ownership

- `backend/src/runtime.rs` — single application backend owner and operation serialization.
- `backend/src/client.rs` — client identity and lifecycle presentation state.
- `backend/src/doctor.rs` — host/base/client readiness projection.
- `backend/src/provider/` — VMware mechanics only.
- `backend/src/bin/runtime-lab.rs` — thin development/operator CLI.

There is no second backend process and no Node runtime backend.

## Lifecycle

```text
doctor
provision
status
reprovision <client>
start <1-4>
open <client>
restart <client>
set-ready <client>
reset <client>
stop [client]
```

`restart` and `reset` are intentionally different:

- restart = reboot current VM state;
- reset = revert to the client's `QA_READY` snapshot and start it.

`set-ready` requires the client to be stopped and refuses to overwrite an existing `QA_READY` snapshot.

## Reliability

Mutating Runtime Lab operations are serialized with an OS-level file lock.

Provisioning uses staging and promotion instead of cloning directly into final client directories.

Provider commands are time-bounded and return their actual stderr/stdout on failure.

Virtual clones receive a fixed 2 vCPU policy, while RAM is assigned adaptively at boot.

The resource planner owns RAM allocation:

```text
available host RAM
→ reserve host headroom
→ count only requested virtual clients that are still stopped
→ apply per-VM floor/ceiling
→ round to 512 MB
→ write VMX memory
→ boot sequentially
```

Current V1 memory bounds:

- 1 virtual client: 4–6 GB;
- 2 virtual clients: 4–5 GB each;
- 3 virtual clients: 4 GB each.

Running VMs are never resized in place. Provisioning does not own RAM sizing.

Multi-client boot remains staggered to avoid unnecessary startup spikes.

Stop is graceful-first: request soft guest shutdown, wait for the VM to leave the running set, then use hard stop only as a bounded recovery fallback.

`reprovision` is destructive and only operates on a stopped virtual client. It discards that client's VM container and rebuilds it from the base VM.

The base VM must exist and be powered off before linked-clone provisioning.

## Non-goals

V1 does not include:

- scenario planning;
- role assignment;
- bot control;
- automated movement/gameplay;
- generic provider registry;
- external configuration framework;
- frontend logic.

## Frontend boundary

Frontend work begins only after lifecycle and provisioning are stable.

When that phase starts:

```text
Svelte
  ↓
thin Tauri command
  ↓
RuntimeLab Rust core
```

No VMware/Fusion command or lifecycle state may be reimplemented in the frontend.
