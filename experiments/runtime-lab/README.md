# M-Bedrock Runtime Lab

Experimental backend for running multiple interactive Minecraft Education clients on one physical computer.

## Simple flow

### Setup once

```text
doctor
provision
start 1
→ manually configure Virtual-01
stop Virtual-01
set-ready Virtual-01
→ repeat for Virtual-02 / Virtual-03
```

### Daily use

```text
resources <1-3>
start <1-3>
status

suspend [Virtual]
→ free active resources while keeping warm state

stop
→ end all Virtual instances
```

### Recovery

```text
reset Virtual-01
→ return one instance to QA_READY

reprovision Virtual-01
→ rebuild only that fully stopped instance from Base
```

The normal workflow does not require direct VMware commands or resource tuning.

## Runtime model

```text
Native       host client
Base         immutable VM parent
Virtual-01   virtual client 1
Virtual-02   virtual client 2
Virtual-03   virtual client 3
```

Virtual numbering never includes `Native`.

```text
start 1 → Virtual-01
start 2 → Virtual-01 + Virtual-02
start 3 → Virtual-01 + Virtual-02 + Virtual-03
```

Gameplay remains manually controlled.

## Emulator architecture

Runtime Lab follows mature emulator/device-farm principles where they fit this product:

```text
immutable Base
→ linked copy-on-write Virtual instances
→ fixed guest memory ceiling
→ host-pressure admission control
→ per-instance runtime telemetry
→ suspend / fast resume
→ clean QA checkpoint
→ destructive reprovision only when requested
```

Rust is the only backend authority.

## Memory model

Each Virtual is configured with a 4 GB guest memory ceiling. This is a guest-visible limit, not a claim that the host permanently consumes 4 GB of resident physical RAM.

Runtime Lab observes host total memory, host available memory, host pressure, configured Virtual memory limit, and best-effort resident working set for each running Virtual. `resources` also reports the total observed working set for the requested Virtual set when process mapping is available.

```text
NORMAL    >= 25% host RAM available
PRESSURE  15–24%
CRITICAL  < 15%
```

New Virtual starts are blocked only at CRITICAL pressure. Existing running Virtual instances are never resized or killed automatically.

## Suspend

`suspend Virtual-02` stores one live VM state to disk and moves it to `SUSPENDED`. Running `suspend` without an instance parks all Virtual instances. A later `start N` resumes requested suspended instances through the same canonical start path.

Suspend is the preferred warm-state path when an instance should stay available without remaining actively resident.

## Base and isolation

Windows Base:

```text
%LOCALAPPDATA%\M-Bedrock\RuntimeLab\base\Base\Base.vmx
```

macOS Base:

```text
~/Library/Application Support/M-Bedrock/RuntimeLab/base/Base.vmwarevm/Base.vmx
```

Provisioning automatically clears abandoned staging output from an interrupted earlier provisioning attempt before creating new clones.

Provisioning:

```text
Base
→ staging linked clone
→ verify staged VMX
→ apply 2 vCPU + 4 GB ceiling
→ promote to Virtual-01 / Virtual-02 / Virtual-03
```

Runtime Lab checks VMware UUID/MAC-derived identity and reports `UNKNOWN`, `UNIQUE`, or `DUPLICATE` for each Virtual.

## Clean-state lifecycle

After manual guest setup:

```text
stop Virtual-01
set-ready Virtual-01
```

This creates the `QA_READY` checkpoint.

```text
restart Virtual-01
= reboot current state

reset Virtual-01
= return to QA_READY and boot

reprovision Virtual-01
= discard the fully stopped clone and rebuild from Base
```

## Commands

```text
doctor
provision
status
resources <1-3>
start <1-3>

open <Native|Virtual-01|Virtual-02|Virtual-03>
suspend [Virtual-01|Virtual-02|Virtual-03]
stop [Native|Virtual-01|Virtual-02|Virtual-03]

restart <Virtual-01|Virtual-02|Virtual-03>
set-ready <Virtual-01|Virtual-02|Virtual-03>
reset <Virtual-01|Virtual-02|Virtual-03>
reprovision <Virtual-01|Virtual-02|Virtual-03>
```

Frontend work remains deferred until backend acceptance is proven.
