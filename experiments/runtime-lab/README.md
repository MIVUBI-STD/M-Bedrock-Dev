# M-Bedrock Runtime Lab

Experimental backend for running multiple interactive Minecraft Education clients on one physical computer.

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

## Backend

```text
CLI now / UI later
        ↓
RuntimeLabBackend
        ↓
ClientRuntime
        ↓
Provider
```

The backend stays small on purpose. There are no scenario definitions, external client profiles, provider registry, automated roles, or bot controls.

## Current commands

```text
lab doctor
lab status
lab start <1-4>
lab open <client>
lab reset <client>
lab stop [client]
```

Provider lifecycle operations are being implemented progressively. Unsupported operations must fail explicitly.

Frontend work is deferred until the backend lifecycle is proven stable.
