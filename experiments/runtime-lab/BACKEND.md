# Runtime Lab Backend

## Product boundary

Runtime Lab is a local, interactive multi-instance environment for Minecraft Education. Player input and gameplay remain manual. Runtime Lab owns the Virtual environment around the player; Native remains host-managed.


## Canonical architecture

```text
CLI now / Tauri later
        ↓
RuntimeLab
        ├── Lifecycle
        ├── Resource Pressure
        └── Identity Health
                ↓
             Provider
                ↓
VMware Workstation / VMware Fusion
```

Rust owns runtime truth.

## Emulator principles adopted

### Immutable template + per-instance delta

`Base` is not used as a player instance. Virtual instances are linked clones with their own writable state.

### Stable guest ceiling

Each Virtual has:

```text
memory limit = 4096 MB
vCPU         = 2
```

Runtime Lab does not resize running instances and no longer predicts a different `memsize` before each boot.

### Host-pressure admission

`resources.rs` owns only pressure evaluation:

```text
host total RAM
+ host available RAM
→ NORMAL / PRESSURE / CRITICAL
→ canStartVirtual
```

At CRITICAL pressure, inactive Virtual instances are not started. Runtime Lab never automatically kills or resizes an existing running instance.

### Runtime telemetry

A Virtual status may expose:

```text
memoryLimitMb
hostWorkingSetMb
```

`hostWorkingSetMb` is best-effort process resident memory, not guest configured memory. `resources` aggregates observed working-set values separately from the 4096 MB guest ceiling. `guestToolsReady` reports whether VMware Tools is observable as running; it intentionally does not create a new lifecycle state.

### Warm state

`suspend` is a first-class lifecycle state:

```text
RUNNING → SUSPENDED → start → RUNNING
```

`suspend` without an instance applies the same operation to all Virtual instances.

This is separate from `STOPPED` and from the `QA_READY` clean checkpoint.

### State model

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

### Instance identity

Provider VMX identity is inspected from UUID and generated MAC data. Runtime health classifies each Virtual as `UNKNOWN`, `UNIQUE`, or `DUPLICATE`. Duplicate identity is never silently treated as healthy.

## Ownership

- `runtime.rs` — application lifecycle, pressure admission, identity health.
- `resources.rs` — host-pressure policy only.
- `client.rs` — public runtime identity/state contract.
- `doctor.rs` — host/provider/Base readiness and capacity.
- `provider/` — VMware mechanics and VMX inspection.
- CLI — thin operator adapter.

No parallel state database exists.

## Reliability

- OS-level mutation lock.
- Transactional linked-clone staging.
- Automatic cleanup of abandoned staging data after an interrupted provisioning run.
- Immutable Base requirement.
- Provider command timeout.
- Pressure-aware multi-instance boot: 2s spacing under NORMAL pressure and 5s under PRESSURE.
- Graceful stop with bounded hard fallback.
- Suspend / fast-resume path.
- Clean `QA_READY` reset path.
- Selected-instance reprovision only.
- Identity duplicate detection.
- Actual host-pressure observation.
- Batch-start rollback restores newly started instances to their prior STOPPED/SUSPENDED state when a later start fails.

## Frontend boundary

A future Svelte/Tauri layer must consume this Rust core. It must not duplicate lifecycle, pressure, identity, or provider policy.


## Disk policy

Runtime Lab does not automatically shrink or compact Virtual disks.

Virtual instances are linked clones and also use the `QA_READY` snapshot. VMware disk shrink/cleanup has snapshot-related constraints and interruption risk, so automatic compaction is intentionally outside the normal lifecycle.

The safe cleanup path is:

```text
fully stop Virtual
→ reprovision Virtual
→ rebuild a fresh linked clone from Base
→ configure instance identity/session again
→ set-ready
```

This keeps disk hygiene aligned with the disposable-instance model instead of mutating a live snapshot chain.


## Emulator feature gate

Runtime Lab borrows behavior from mature emulator managers only when the underlying provider can enforce it measurably.

Do not add a user-facing feature unless the backend has a real primitive for it.

Examples intentionally not exposed today:

- fake Eco/Low Power modes without measurable CPU/GPU control;
- live RAM resizing while a Virtual is running;
- automatic killing of running Virtual instances under pressure;
- automatic disk shrink while snapshot chains are present;
- FPS/audio throttles unless the provider can apply and verify them safely.

When a future optimization is added, it must have one owner, one execution path, observable effect, and acceptance proof on the target machine.


## Batch recovery contract

Batch lifecycle operations are best-effort transactional.

If a batch start or suspend fails after changing earlier Virtual instances, Runtime Lab attempts to restore those instances to their previous state.

Rollback failures are never hidden. The returned error names every Virtual instance that could not be restored and instructs the operator to run `status` before taking another action.
