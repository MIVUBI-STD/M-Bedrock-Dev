# M-Bedrock Runtime Lab

Experimental local device-farm harness for interactive Minecraft Education gameplay validation.

## Purpose

The Runtime Lab prepares isolated, playable client instances for runtime proof that cannot be established from source/static inspection alone.

It is intentionally non-authoritative:

- it does not create or classify production findings;
- it does not replace the selected-map audit flow;
- it does not define gameplay truth;
- it may supply runtime evidence back to the canonical audit workflow;
- provider-specific automation remains replaceable.

## Operator model

```text
Scenario
→ allocate required clients
→ restore QA-ready state
→ boot clients
→ health gate
→ open Minecraft Education
→ operator-driven / assisted gameplay
→ evidence capture
→ stop or reset
```

Default topology:

```text
MCE-01  native host client / primary reference
MCE-02  virtual interactive client
MCE-03  virtual interactive client
MCE-04  virtual interactive client
```

Default virtual-client profile: 1280×720, 30 FPS target, low graphics, 6 chunk render distance. Gameplay-relevant HUD, entities, UI, titles, actionbar and scoreboard remain enabled.

## Cross-platform boundary

The core must not depend on a specific hypervisor.

```text
Runtime Lab Core
        ↓
RuntimeProvider
   ┌────┴─────┐
 Windows     macOS
   ↓           ↓
provider     provider
```

Initial provider candidates:

- Windows: VMware Workstation;
- macOS: VMware Fusion;
- optional macOS provider: Parallels;
- later fallback/diagnostic provider: VirtualBox.

No provider is production authority.

## Phase plan

1. Foundation — contracts, profiles, scenarios, health semantics.
2. Provider adapters — capability discovery and lifecycle operations.
3. Client bootstrap — base image, QA-ready snapshot and reset lifecycle.
4. Scenario runner — resource-aware allocation and ordered preparation.
5. Interactive control — focus/layout/input convenience.
6. Evidence bridge — synchronized capture and audit-bound evidence handoff.

Promotion to production owners is allowed only for small, proven, reusable pieces.


## Current executable surface

Phase 2 introduces a host/provider readiness probe:

```bash
node experiments/runtime-lab/src/cli.mjs doctor
node experiments/runtime-lab/src/cli.mjs doctor --json
```

`doctor` currently verifies:

- supported host platform;
- logical CPU and host memory against lab recommendations;
- installed runtime-provider command surfaces;
- provider preference selection.

It deliberately reports virtualization capability and GPU acceleration as `UNKNOWN` until dedicated probes can establish them. `READY FOR PROVISIONING` means the host has no known provisioning blocker; it does not mean Minecraft runtime proof is already valid.

### Provider preference

```text
Windows
VMware Workstation
→ VirtualBox fallback

macOS
VMware Fusion
→ Parallels
→ VirtualBox fallback
```

Provider choice remains replaceable and does not leak into scenario definitions.
