# M-Bedrock Runtime Lab

Experimental backend for running multiple interactive Minecraft Education clients on one physical computer.

## Architecture

```text
Rust backend core      ← current phase
        ↓
thin Tauri commands    ← later
        ↓
Svelte frontend        ← later
```

Rust is the only runtime authority. Gameplay remains manually controlled.

## Runtime naming

```text
Native       host client
Base         immutable virtual-machine parent
Virtual-01   virtual client 1
Virtual-02   virtual client 2
Virtual-03   virtual client 3
```

Virtual numbering never includes `Native`.

Therefore:

```text
start 1 → Virtual-01
start 2 → Virtual-01 + Virtual-02
start 3 → Virtual-01 + Virtual-02 + Virtual-03
```

The Native client is opened and controlled separately on the host.

## Platform target

```text
Windows → VMware Workstation
macOS   → VMware Fusion
```

## Base and provisioning

Windows:

```text
%LOCALAPPDATA%\M-Bedrock\RuntimeLab\base\Base\Base.vmx
```

macOS:

```text
~/Library/Application Support/M-Bedrock/RuntimeLab/base/Base.vmwarevm/Base.vmx
```

Provisioning is transactional:

```text
Base
→ staging clone
→ verify
→ apply CPU policy
→ promote to Virtual-01 / Virtual-02 / Virtual-03
```

RAM is intentionally not fixed during provisioning.

## Adaptive memory

RAM is calculated from live host headroom immediately before a stopped virtual client is booted.

```text
1 virtual → 4–5 GB
2 virtual → 4–4.5 GB each
3 virtual → 4 GB each
```

Allocations are rounded to 512 MB. Already-running virtual clients are never resized.

Current capacity guidance:

```text
<12 GB host RAM → Native only
12 GB           → up to 1 Virtual
16 GB           → up to 2 Virtual
24+ GB          → up to 3 Virtual
```

CPU capacity can lower these limits.

Use:

```text
resources <1-3>
```

to preview the live allocation without booting anything.

## QA-ready lifecycle

After a virtual client is manually configured:

```text
stop Virtual-01
set-ready Virtual-01
```

This creates the `QA_READY` snapshot.

```text
restart Virtual-01
= reboot current state

reset Virtual-01
= restore QA_READY and boot again

reprovision Virtual-01
= discard the stopped clone and rebuild it from Base
```

## Commands

```text
doctor
provision
status
resources <1-3>
start <1-3>

open <Native|Virtual-01|Virtual-02|Virtual-03>
stop [Native|Virtual-01|Virtual-02|Virtual-03]

restart <Virtual-01|Virtual-02|Virtual-03>
set-ready <Virtual-01|Virtual-02|Virtual-03>
reset <Virtual-01|Virtual-02|Virtual-03>
reprovision <Virtual-01|Virtual-02|Virtual-03>
```

Mutating operations are serialized, provider commands are bounded, shutdown is graceful-first with bounded hard-stop recovery, and VM state is read from VMware/filesystem rather than duplicated into a runtime database.

Frontend work remains deferred until backend acceptance is proven.
