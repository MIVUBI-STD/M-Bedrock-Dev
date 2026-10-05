# Runtime Lab Architecture

## Product boundary

Runtime Lab is a local, interactive multi-instance environment for Minecraft Education. Player input remains manual. Runtime Lab manages the environment around the player.

## Backend

```text
RuntimeLab
├── Lifecycle
│   ├── provision
│   ├── start / resume
│   ├── suspend
│   ├── stop
│   ├── restart
│   ├── reset
│   └── reprovision
├── Resource Pressure
├── Runtime Telemetry
└── Identity Health
        ↓
Provider
├── VMware Workstation
└── VMware Fusion
```

## Instance model

```text
Native
Base
├── Virtual-01
├── Virtual-02
└── Virtual-03
```

Base is immutable during normal operation. Virtual instances use linked-copy state.

## Memory model

Virtual guest ceiling:

```text
4096 MB
```

Runtime Lab does not equate this ceiling with actual host physical use. Host memory pressure is observed independently. Running-instance working set is reported when process mapping is available.

## State model

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

## Future desktop shell

```text
Svelte
  ↓
thin Tauri commands
  ↓
same RuntimeLab Rust core
```

Frontend must not invoke VMware or implement resource policy directly.
