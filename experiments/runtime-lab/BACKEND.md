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

Rust owns runtime truth.

The future Svelte UI will be presentation only. Tauri commands will remain thin adapters over the same `RuntimeLab` core.

## Ownership

- `backend/src/runtime.rs` — single application backend owner.
- `backend/src/client.rs` — client identity and lifecycle state.
- `backend/src/doctor.rs` — host/provider readiness.
- `backend/src/provider/` — provider mechanics only.
- `backend/src/bin/runtime-lab.rs` — thin development/operator CLI.

There is no second backend process and no Node runtime backend.

## V1 commands

```text
doctor
status
start <1-4>
open <client>
reset <client>
stop [client]
```

Gameplay remains manually controlled by the operator.

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
