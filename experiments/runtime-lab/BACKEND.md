# Runtime Lab Backend

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

`hostWorkingSetMb` is best-effort process resident memory, not guest configured memory. `resources` aggregates observed working-set values separately from the 4096 MB guest ceiling.

### Warm state

`suspend` is a first-class lifecycle state:

```text
RUNNING → SUSPENDED → start → RUNNING

`suspend` without an instance applies the same operation to all Virtual instances.
```

This is separate from `STOPPED` and from the `QA_READY` clean checkpoint.

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
- Sequential multi-instance boot.
- Graceful stop with bounded hard fallback.
- Suspend / fast-resume path.
- Clean `QA_READY` reset path.
- Selected-instance reprovision only.
- Identity duplicate detection.
- Actual host-pressure observation.

## Frontend boundary

A future Svelte/Tauri layer must consume this Rust core. It must not duplicate lifecycle, pressure, identity, or provider policy.
