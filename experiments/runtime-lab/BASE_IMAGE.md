# Runtime Lab Base Image

Base is the immutable parent for Virtual-01, Virtual-02, and Virtual-03.

The goal is not to create a stripped Windows build. The goal is a predictable QA image with low background activity while preserving Minecraft Education, Microsoft sign-in, networking, graphics, input, audio capability, and VMware guest integration.

## Required

Base must keep:

- supported Windows installation;
- current VMware Tools;
- working virtual GPU / 3D acceleration;
- working keyboard, mouse and controller input;
- working network stack;
- Microsoft account / organization sign-in dependencies required by Minecraft Education;
- Minecraft Education;
- Windows security components required by the organization;
- normal shutdown, restart and suspend behavior.

## Reduce background load

Prefer reversible configuration changes:

- remove unnecessary third-party startup applications;
- disable unnecessary third-party auto-updaters during QA sessions;
- close cloud sync applications that are not needed for the test;
- remove consumer applications from startup;
- disable visual animation/transparency where it materially helps;
- use low Minecraft graphics settings;
- use a low render distance appropriate for gameplay testing;
- keep the desktop resolution modest for Virtual instances;
- avoid background browser tabs or launchers inside Base;
- complete Windows/Minecraft updates before capturing the clean checkpoint.

Do not broadly disable Windows services only to lower an idle-memory number.

## Minecraft virtual profile

Target Virtual profile:

```text
resolution      1280x720
graphics        low
render distance low / QA-appropriate
frame target    ~30 FPS
memory ceiling  4096 MB
vCPU            2
```

The profile prioritizes responsive input and gameplay mechanics, not visual fidelity.

## Image preparation flow

```text
install supported Windows
→ install VMware Tools
→ verify graphics/input/network
→ install Minecraft Education
→ apply conservative background cleanup
→ apply low graphics profile
→ update Windows + Minecraft
→ shut down cleanly
→ place VM as Base
→ provision Virtual instances
```

Base is not used as a player instance after provisioning.

## Virtual preparation

Each Virtual is configured separately after clone creation:

```text
start Virtual
→ complete first-boot clone identity
→ sign in with that Virtual's test identity
→ verify Minecraft multiplayer
→ stop
→ set-ready
```

The per-Virtual QA_READY checkpoint belongs to the Virtual instance, not to Base.

## Acceptance

Do not declare an optimization useful because idle RAM is lower.

Accept it only when:

1. Minecraft Education still launches and signs in;
2. multiplayer networking still works;
3. keyboard/mouse/controller input remains responsive;
4. GPU rendering remains usable;
5. suspend/resume remains reliable;
6. working-set or CPU usage improves measurably on the target machine.


## Disk hygiene

Do not use automatic disk shrink/compact on Runtime Lab Virtual instances while they retain `QA_READY` or other snapshot state.

If a Virtual delta grows too large, prefer:

```text
stop Virtual
→ reprovision Virtual
→ prepare the clean instance again
```

Base should remain clean and stable; Virtual instances are the disposable layer.
