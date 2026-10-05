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

## Base VM and provisioning

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

Provisioning is transactional:

```text
MCE-BASE
→ clone into staging
→ verify staged VMX exists
→ promote atomically into MCE-02 / MCE-03 / MCE-04
```

Failed staging output is discarded and existing clients are not replaced.

## QA-ready lifecycle

After provisioning, each virtual client is configured manually:

```text
start client
→ install / verify Minecraft Education
→ sign in with that client's test account
→ configure low graphics
→ stop client
→ set-ready
```

`set-ready` creates one VMware snapshot named `QA_READY`.

After that:

```text
restart
= reboot current VM state

reset
= stop if needed
→ revert to QA_READY
→ start VM
```

VMware snapshots represent a stored VM/guest state, and reverting discards changes made after that snapshot. The backend therefore exposes reset as an explicit destructive clean-state action.

## Command surface

From `experiments/runtime-lab/backend`:

```text
cargo run --bin runtime-lab -- doctor
cargo run --bin runtime-lab -- provision
cargo run --bin runtime-lab -- status
cargo run --bin runtime-lab -- reprovision <MCE-02..04>
cargo run --bin runtime-lab -- start <1-4>
cargo run --bin runtime-lab -- open <MCE-01..04>
cargo run --bin runtime-lab -- restart <MCE-02..04>
cargo run --bin runtime-lab -- set-ready <MCE-02..04>
cargo run --bin runtime-lab -- reset <MCE-02..04>
cargo run --bin runtime-lab -- stop [MCE-01..04]
```

### Meaning

- `doctor` checks provider, base VM and per-client QA-ready state.
- `provision` creates MCE-02..04 as linked clones.
- `reprovision` replaces one stopped virtual client from the immutable base and clears its previous QA state.
- `start` powers on the requested client count; MCE-01 remains native/manual.
- `open` opens the VM in VMware.
- `restart` reboots the current VM state.
- `set-ready` records the stopped client as its clean QA baseline.
- `reset` restores `QA_READY` and starts the client.
- `stop` performs a soft VM stop.

The backend serializes mutating operations with an OS file lock, uses bounded provider commands, and does not maintain a second VM-state database.

Virtual clients keep a fixed 2 vCPU policy, but RAM is no longer fixed at provisioning time.

RAM is planned immediately before boot from live host headroom:

```text
1 virtual client  → up to 6 GB
2 virtual clients → up to 5 GB each
3 virtual clients → compact 4 GB each
```

These are ceilings, not reservations. The planner leaves host headroom, rounds in 512 MB steps, and refuses to start more stopped VMs than the current machine can support safely. Already-running VMs are not resized mid-session.

Capacity guidance is intentionally more inclusive:

```text
<12 GB host RAM → 1 total client
12 GB           → up to 2 total clients
16 GB           → up to 3 total clients
24+ GB          → up to 4 total clients
```

CPU limits can lower the recommendation further.

Multi-client startup is staggered by 2 seconds to reduce simultaneous CPU/disk spikes.

Shutdown is graceful-first. If a soft guest shutdown does not reach the stopped state within the bounded wait, the provider falls back to a hard power-off as recovery.

Gameplay automation, scenarios and bot control are outside V1.

Frontend work remains deferred until this Rust lifecycle is proven stable.
