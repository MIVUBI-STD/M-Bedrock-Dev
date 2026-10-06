# Virtual Clients Backend

## Product boundary

M-Bedrock Virtual Clients is a local multi-instance environment for Minecraft Education.

Player input and gameplay remain manual.

```text
Native
→ authority

VirtualClients
├── Runtime Profile
├── Lifecycle
├── Resource Pressure
├── Runtime Telemetry
├── Identity Health
└── Guest Compatibility
        ↓
     Provider
        ↓
VMware Workstation / VMware Fusion
```

Rust owns runtime truth.

## Ownership

- `runtime.rs` — lifecycle orchestration and mutation serialization.
- `profile.rs` — Native Minecraft detection, Base provenance and version parity.
- `guest.rs` — read-only Guest Agent protocol.
- `resources.rs` — host pressure policy.
- `client.rs` — public instance/status contract.
- `doctor.rs` — provider, Base, capacity and parity readiness.
- `provider/` — VMware mechanics and VMX inspection.
- `virtual-guest-agent` — guest-side read-only runtime probe.
- `virtual-clients` — thin operator CLI.

No parallel runtime state database exists.

## Version invariant

Native is the version authority.

```text
Native Minecraft
= registered Base Minecraft
= live Virtual Minecraft
```

A mismatch is not a warning-only state for boot operations.

Boot paths require:

1. Native version detectable;
2. registered Base profile present;
3. Native/Base versions equal;
4. Guest Agent reachable after boot;
5. Guest Agent version equals backend version;
6. Virtual Minecraft version equals Native.

## Base provenance

`register-base` records the currently detected Native Minecraft version beside the stopped Base.

That record means:

> this Base was intentionally prepared for this Native version.

It is not live guest proof. Live Virtual proof comes from the Guest Agent after boot.

## Runtime states

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

## Resource policy

Each Virtual:

```text
memory ceiling = 4096 MB
vCPU           = 2
```

Runtime telemetry keeps configured memory separate from observed process resident memory.

Host pressure:

```text
NORMAL
PRESSURE
CRITICAL
```

Virtual Clients never silently kills existing running clients because of host pressure.

## Reliability

- OS-level operation lock.
- Transactional linked-clone staging.
- Cleanup of abandoned staging data.
- Immutable Base requirement.
- Native/Base version parity gate.
- Live Virtual/Native version parity gate.
- Guest Agent/backend version parity gate.
- Unique VM UUID/MAC identity check.
- Pressure-aware staggered boot.
- Batch rollback on start failure.
- Rollback failure visibility.
- Graceful stop with bounded hard fallback.
- Long timeout for clone/suspend/resume/snapshot operations.
- Suspend/fast-resume path.
- Clean QA_READY reset.
- Selected-instance reprovision.

## Disk policy

Do not automatically shrink or compact Virtual disks while snapshot chains exist.

Safe cleanup:

```text
fully stop Virtual
→ reprovision Virtual
→ rebuild from Base
```

## Emulator feature gate

Do not expose a feature unless a provider primitive can enforce it measurably.

Not exposed today:

- fake Eco mode;
- live RAM resize;
- automatic kill under pressure;
- automatic snapshot-chain disk shrink;
- unverifiable FPS/GPU throttles.

## Frontend boundary

Future Tauri/Svelte code must consume this Rust core. It must not duplicate provider, lifecycle, parity, update, or resource policy.
