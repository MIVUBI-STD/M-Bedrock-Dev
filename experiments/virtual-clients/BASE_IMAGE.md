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
→ apply conservative background cleanup
→ low graphics / QA resolution
→ verify network + input + rendering
→ shut down Base
→ register-base
→ provision Virtuals
```

## Virtual profile

```text
resolution      1280x720
graphics        low
render distance QA-appropriate
frame target    ~30 FPS
memory ceiling  4096 MB
vCPU            2
```

## Per-Virtual preparation

```text
start Virtual
→ live Guest Agent parity must pass
→ sign in using that Virtual's own licensed test identity
→ verify multiplayer
→ stop
→ set-ready
```

QA_READY belongs to the Virtual, not Base.

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

If a Virtual delta becomes unhealthy or too large:

```text
stop Virtual
→ reprovision Virtual
```

Base remains the stable parent; Virtuals are disposable.
