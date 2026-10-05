# Runtime Lab Architecture

## Product boundary

Runtime Lab V1 is a local multi-client launcher for Minecraft Education.

The system manages client instances. Gameplay remains manually controlled by the operator.

## Architecture

```text
Rust backend core
        ↓
thin Tauri commands     later
        ↓
Svelte frontend         later
```

Current backend path:

```text
RuntimeLab
   ↓
Client
   ↓
Provider
   ↓
VMware Workstation / VMware Fusion
```

## Platform model

```text
Windows
├── MCE-01 native
├── MCE-02 VMware Workstation
├── MCE-03 VMware Workstation
└── MCE-04 VMware Workstation

macOS
├── MCE-01 native
├── MCE-02 VMware Fusion
├── MCE-03 VMware Fusion
└── MCE-04 VMware Fusion
```

## V1 responsibilities

Backend owns:

- host/provider readiness;
- client identity;
- client lifecycle;
- start/stop/reset/open behavior;
- provisioning state when implemented.

Backend does not own:

- gameplay scenarios;
- bot/player automation;
- scripted movement;
- test-case planning;
- frontend presentation.

## Frontend rule

The future Tauri/Svelte layer must remain thin and call the same Rust `RuntimeLab` core. It must never invoke hypervisor commands directly.
