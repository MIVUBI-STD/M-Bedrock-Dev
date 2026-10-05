# M-Bedrock Runtime Lab

Experimental backend for running multiple interactive Minecraft Education clients on one physical computer.

## Architecture

Runtime Lab follows the same desktop architecture pattern used across MIVUBI tools:

```text
Rust backend core      ← current phase
        ↓
thin Tauri commands    ← later
        ↓
Svelte frontend        ← later
```

The Rust backend is the only runtime authority. Gameplay remains manually controlled by the operator.

## Client model

```text
MCE-01  native host client
MCE-02  virtual client
MCE-03  virtual client
MCE-04  virtual client
```

Virtual clients are intended to run Minecraft Education at low graphics / 1280×720 for responsive gameplay rather than visual fidelity.

## Platform target

```text
Windows → VMware Workstation
macOS   → VMware Fusion
```

V1 intentionally has no alternate provider registry.

## Base VM

Runtime Lab uses one local base VM and creates three linked clones.

Windows base:

```text
%LOCALAPPDATA%\M-Bedrock\RuntimeLab\base\MCE-BASE\MCE-BASE.vmx
```

macOS base:

```text
~/Library/Application Support/M-Bedrock/RuntimeLab/base/MCE-BASE.vmwarevm/MCE-BASE.vmx
```

The base VM must be powered off before provisioning.

Runtime Lab manages clones under the same RuntimeLab data directory:

```text
MCE-02
MCE-03
MCE-04
```

No VM disk or local runtime state is committed to Git.

## Current backend

```text
backend/
├── Cargo.toml
├── src/
│   ├── lib.rs
│   ├── runtime.rs
│   ├── client.rs
│   ├── doctor.rs
│   ├── provider/
│   │   ├── mod.rs
│   │   ├── workstation.rs
│   │   └── fusion.rs
│   └── bin/
│       └── runtime-lab.rs
└── tests/
    └── runtime.rs
```

## Command surface

From `experiments/runtime-lab/backend`:

```text
cargo run --bin runtime-lab -- doctor
cargo run --bin runtime-lab -- provision
cargo run --bin runtime-lab -- status
cargo run --bin runtime-lab -- start <1-4>
cargo run --bin runtime-lab -- open <MCE-01..04>
cargo run --bin runtime-lab -- reset <MCE-02..04>
cargo run --bin runtime-lab -- stop [MCE-01..04]
```

### Meaning

- `doctor` checks provider + base VM readiness.
- `provision` creates MCE-02..04 as linked clones.
- `start` powers on the requested client count; MCE-01 remains the native/manual client.
- `open` opens the VM in the VMware UI.
- `reset` performs a VM restart; it does not restore a snapshot.
- `stop` performs a soft VM stop.

Snapshot restore, gameplay automation and scenarios are intentionally outside V1.

Frontend work remains deferred until this Rust lifecycle is proven stable.
