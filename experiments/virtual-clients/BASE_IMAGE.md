# Virtual Clients Base Image

Base is the immutable parent for Virtual-01, Virtual-02, and Virtual-03.

## Required

Base must keep:

- supported Windows installation;
- VMware Tools;
- Virtual Guest Agent;
- working virtual GPU / 3D acceleration;
- keyboard, mouse and controller input;
- networking;
- Microsoft organization sign-in dependencies;
- Minecraft Education;
- normal shutdown/restart/suspend behavior.

## Minecraft installation policy

For managed Windows Base images, prefer the official Minecraft Education desktop installer with automatic updater creation disabled.

Goal:

```text
Native version changes
→ Base is deliberately rebuilt/updated
→ register-base
→ Virtuals are reprovisioned
```

Do not let Virtual-01 / Virtual-02 / Virtual-03 independently auto-update Minecraft Education.

The Base provenance record stores the intended Minecraft version. The Guest Agent later proves the live Virtual version.

## Preparation flow

```text
install supported Windows
→ install VMware Tools
→ install Virtual Guest Agent
→ install Minecraft Education
→ disable independent Minecraft auto-update in the managed Base
→ keep Base free of Microsoft/Minecraft user sessions
→ require AzureAdJoined = NO and WorkplaceJoined = NO
→ apply conservative background cleanup
→ configure guest QA graphics/resolution target
→ verify network + input + rendering
→ shut down Base
→ register-base
→ Base state = REGISTERED
→ boot Base only to run C:\ProgramData\M-Bedrock\VirtualClients\finalize-base.ps1 -ConfirmGeneralize
→ Sysprep /generalize /oobe /mode:vm
→ Base state = FINALIZED
→ shutdown
→ never boot finalized Base again
→ provision Virtuals
→ complete first-boot Windows specialization/OOBE per Virtual
→ start all three
→ verify-identities
```

## Virtual profile

Backend-enforced:

```text
memory ceiling  4096 MB
vCPU            2
3D acceleration enabled
```

Guest QA configuration targets, not backend truth:

```text
resolution      1280x720
graphics        low
render distance QA-appropriate
frame target    ~30 FPS
```

## Per-Virtual preparation

Identity verification happens before account sign-in:

```text
start Virtual-01 + Virtual-02 + Virtual-03
→ live Guest Agent parity must pass
→ verify-identities
→ vmIdentity = UNIQUE for all three
→ windowsIdentity = UNIQUE for all three
→ configure/sign in each Virtual with its own licensed identity
→ confirm the signed-in session survives stop/start
→ stop
→ set-ready
```

`QA_READY` belongs to the Virtual, not Base. It is created only after identity proof and account setup. Daily start/stop/restart/suspend/resume must preserve the guest disk and account state.

## Conservative optimization

Prefer reversible reductions:

- remove unnecessary third-party startup apps;
- avoid browsers/cloud sync inside Base;
- disable unnecessary third-party auto-updaters;
- reduce visual effects where useful;
- keep Minecraft graphics low.

Do not broadly disable Windows services merely to lower idle RAM.

## Disk hygiene

Do not auto-compact linked clones with active snapshots.

If a Virtual delta becomes unhealthy, prefer `reset` to the existing `QA_READY` checkpoint first.

If a full rebuild is required:

```text
stop Virtual
→ reprovision Virtual --destroy-account-state
```

Base remains the immutable parent. Virtuals are reprovisionable, but reprovision intentionally destroys that Virtual's saved guest/account state and QA_READY snapshot.
