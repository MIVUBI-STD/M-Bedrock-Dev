# M-Bedrock Virtual Clients

Experimental backend for running multiple interactive Minecraft Education clients on one physical computer.

## Simple flow

### Setup once

```text
doctor
→ prepare Base with the same Minecraft Education version as Native
register-base
→ Base state = REGISTERED
→ run C:\ProgramData\M-Bedrock\VirtualClients\finalize-base.ps1 -ConfirmGeneralize inside Base
→ Sysprep generalize + shutdown
→ Base state = FINALIZED
provision

If doctor reports `REBUILD_BASE`, Base finalization was interrupted/ambiguous and the Base must be rebuilt rather than reused.

start 3
verify-identities
→ doctor nextSetupAction = CREATE_READY_SNAPSHOTS

start 1
→ configure Virtual-01
→ sign in once with its own test identity
→ confirm Minecraft Education reaches the signed-in menu
stop Virtual-01
set-ready Virtual-01

repeat for Virtual-02 / Virtual-03
→ doctor nextSetupAction = READY

Base must never contain a Microsoft/Minecraft user session. Account state belongs to each provisioned Virtual only.

Do not boot Base again after it reaches `FINALIZED`. A finalized Base is an immutable clone source.
```

### Daily use

```text
resources <1-3>
start <1-3>
status

suspend [Virtual]
stop [Virtual]
```

Normal daily lifecycle preserves the complete guest disk. A Virtual that was signed in during setup must remain signed in across `start`, `stop`, `restart`, `suspend`, resume through `start`, and `open` unless Microsoft/Minecraft itself invalidates the session.

`reset` returns only the selected Virtual to its `QA_READY` snapshot. Therefore `QA_READY` is created after that Virtual's account setup. `reprovision` intentionally destroys and recreates the selected Virtual from Base and therefore destroys that Virtual's saved guest/account session.

### Recovery

```text
reset Virtual-01
reprovision Virtual-01 --destroy-account-state
```

`reset` restores `QA_READY` and boots the selected Virtual immediately, so its resulting lifecycle state is `RUNNING`. `reprovision` is destructive and requires the explicit `--destroy-account-state` confirmation.

Native is host-managed. Virtual Clients never starts, stops, or restarts Native.

## Runtime model

```text
Native       authority / host client
Base         immutable VM parent
Virtual-01   virtual client 1
Virtual-02   virtual client 2
Virtual-03   virtual client 3
```

Virtual numbering never includes Native.

```text
start 1 → Virtual-01
start 2 → Virtual-01 + Virtual-02
start 3 → Virtual-01 + Virtual-02 + Virtual-03
```

Gameplay remains manually controlled.

## Version authority

Native is the compatibility authority.

Virtual Clients compares:

```text
Native Minecraft Education version
↕
registered Base version
↕
live Virtual Minecraft Education version
```

Rules:

- Base must be registered against the currently detected Native Minecraft Education version.
- `provision` and every boot path reject a Native/Base mismatch.
- Each running Virtual must expose the same Minecraft Education version through the read-only Guest Agent.
- Guest Agent version must equal the host backend version.
- A newly started Virtual that fails live parity is stopped and the batch is rolled back.
- A Virtual already running before a command is never silently killed; the mismatch is surfaced in status/error output.

This is required because Minecraft Education multiplayer requires all players to run the same version.

## Guest Agent

`virtual-guest-agent` is read-only.

It exposes only:

```text
agent version
Minecraft Education version
Minecraft installation type
SHA-256 Windows machine-identity fingerprint
```

It does not control gameplay, input, worlds, inventory, or multiplayer actions.

Host discovery uses VMware guest IP information and a bounded local status request.

## Emulator architecture

```text
Native authority
→ immutable Base provenance
→ linked Virtual instances
→ 4 GB guest ceiling / 2 vCPU
→ host-pressure admission
→ per-instance working-set telemetry
→ VMware Tools readiness
→ Guest Agent version proof
→ suspend / fast resume
→ QA_READY checkpoint
→ selected-instance reprovision
```

## Memory model

Each Virtual has a 4096 MB guest ceiling. This is not interpreted as permanently resident physical RAM.

```text
NORMAL    >= 25% host RAM available
PRESSURE  15–24%
CRITICAL  < 15%
```

New starts are blocked only at CRITICAL pressure. Existing running instances are not resized or killed automatically.

Batch pacing is automatic:

```text
NORMAL    2 seconds between starts
PRESSURE  5 seconds between starts
```

## Runtime data

Windows:

```text
%LOCALAPPDATA%\M-Bedrock\VirtualClients
```

macOS:

```text
~/Library/Application Support/M-Bedrock/VirtualClients
```

Base profile:

```text
base/.../base-profile.json
```

The profile is provenance, not a runtime state database.

Microsoft credentials, passwords, access tokens, refresh tokens, and equivalent account secrets are never copied into Virtual Clients runtime data. Sign-in persistence is owned by the guest operating system inside each Virtual's persistent disk.

## Commands

```text
doctor
register-base
provision
status
resources <1-3>
start <1-3>
verify-identities

open <Virtual-01|Virtual-02|Virtual-03>
suspend [Virtual-01|Virtual-02|Virtual-03]
stop [Virtual-01|Virtual-02|Virtual-03]

restart <Virtual-01|Virtual-02|Virtual-03>
set-ready <Virtual-01|Virtual-02|Virtual-03>
reset <Virtual-01|Virtual-02|Virtual-03>
reprovision <Virtual-01|Virtual-02|Virtual-03> --destroy-account-state
```

Frontend remains deferred until backend and real-machine acceptance are complete.


## Acceptance evidence

The Windows installer includes:

```text
acceptance/windows/collect-acceptance.ps1
```

Use it to collect deterministic backend evidence during the real-machine campaign. Pass `-VerifyIdentities` only when Virtual-01, Virtual-02, and Virtual-03 are all running after first-boot Windows setup.
