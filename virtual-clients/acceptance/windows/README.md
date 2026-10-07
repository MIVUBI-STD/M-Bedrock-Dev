# Virtual Clients Windows Acceptance Campaign

This campaign is evidence collection, not simulation. A stage stays `NOT_RUN` until the required target-machine action has actually been performed.

## Stages

| Stage | Purpose | Evidence owner |
| --- | --- | --- |
| HOST | Record Windows, VMware, CPU, memory, GPU, hypervisor/VBS and Native Minecraft facts | collector |
| SINGLE_VM | Prove one Virtual lifecycle on the target provider | operator + collector |
| GUEST | Prove VMware Tools, Guest Agent and interactive launcher progression | collector |
| MINECRAFT | Prove Minecraft launches in the intended interactive session without duplicate launch | operator + collector |
| ACCOUNT | Prove one licensed account can sign in and persist through the intended recovery workflow | operator |
| THREE_VMS | Prove Virtual-01/02/03 coexist with unique identities | operator + collector |
| FOUR_MINECRAFT | Prove Native + three Virtual Minecraft clients coexist and remain interactive | operator + collector |
| FOUR_ACCOUNTS | Prove four distinct licensed sessions remain isolated | operator |
| MULTIPLAYER | Prove required Native↔Virtual and Virtual↔Virtual join paths | operator |
| RECOVERY | Prove stop/start, suspend/resume, reset and host reboot behavior | operator + collector |
| SOAK | Record long-run stability and repeated lifecycle cycles | operator + collector |

## Result vocabulary

Use only:

- `NOT_RUN` — target-machine action has not been performed.
- `OBSERVED` — evidence was collected, but the stage does not have enough evidence for pass/fail.
- `PASS` — every required assertion for that stage was actually exercised and supported by evidence.
- `FAIL` — at least one exercised required assertion failed.
- `BLOCKED` — the stage could not be exercised because an earlier dependency failed.

Do not infer `PASS` from source tests, CI, documentation, configured NAT, process existence, or a successful collector run.

## Campaign order

Run stages in table order. Stop escalation when a stage fails. Diagnose the first wrong owner before attempting later concurrency, account or multiplayer stages.

Use `collect-acceptance.ps1` before and after meaningful runtime transitions. Preserve each output as evidence for the campaign rather than overwriting previous captures.


## Performance evidence

Use `performance-contract.json` during target-machine performance acceptance. Record measurements as observations, not conclusions.

The purpose is to calibrate the single automatic performance policy with real Native + Virtual-01/02/03 evidence. Do not change configured RAM, vCPU, GPU policy or startup thresholds from an incomplete run. Missing measurements remain unknown; they are never treated as zero or PASS.

At minimum, capture the host baseline, each Virtual VM start duration, Guest Agent readiness duration, Minecraft readiness duration, observed host working set, 3D-graphics observation, resolution, peak host CPU during sequential startup, concurrent Minecraft count and operator responsiveness.

Performance acceptance must distinguish:
- capacity: what the hardware should reasonably support;
- pressure: whether another client should start now;
- experience: whether Native and the running Virtual clients remain usable together.

The benchmark harness does not automatically declare a performance PASS. Threshold calibration is a separate evidence review after representative target machines have been measured.
