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

The backend core is the only runtime authority. The future Tauri/Svelte application must call this same core and must not duplicate provider or lifecycle logic.

## V1 purpose

The system manages the test environment. The player remains manually controlled.

```text
start clients
→ open Minecraft Education
→ operator plays/tests manually
→ reset or stop clients as needed
```

Runtime Lab does not automate gameplay and does not decide what gameplay test should be performed.

## Clients

```text
MCE-01  native host client
MCE-02  virtual client
MCE-03  virtual client
MCE-04  virtual client
```

Virtual clients target low graphics and 1280×720 so resources are spent on responsive gameplay rather than visual fidelity.

## Platform target

```text
Windows → VMware Workstation
macOS   → VMware Fusion
```

Other hypervisors are not part of V1.

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

## Current command surface

From `experiments/runtime-lab/backend`:

```text
cargo run --bin runtime-lab -- doctor
cargo run --bin runtime-lab -- status
cargo run --bin runtime-lab -- start <1-4>
cargo run --bin runtime-lab -- open <MCE-01..04>
cargo run --bin runtime-lab -- reset <MCE-02..04>
cargo run --bin runtime-lab -- stop [MCE-01..04]
```

Provider lifecycle operations are being implemented progressively. Unsupported operations must fail explicitly.

Frontend work is intentionally deferred until the Rust backend lifecycle is proven stable.
