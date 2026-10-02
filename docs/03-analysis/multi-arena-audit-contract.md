# Multi Arena Audit Contract

Multi Arena is a core gameplay system. Audit both **isolation** and **capacity**.

## Required audit order

```text
Visible Arena Count
→ Playable Arena Count
→ Concurrent Arena Limit
→ Capacity + 1 Behavior
→ Queue / Admission Behavior
→ Player Feedback
→ Simultaneous Start
→ Shared / Global Resource Contention
→ Session Isolation
→ Player Isolation
→ Wave / Enemy / Score Isolation
→ Cleanup
→ Reuse
```

## Capacity rule

Do not infer that an arena is playable merely because it exists physically or has a join surface.

Record:

- visible arena count;
- actual concurrent arena limit;
- what happens at the limit;
- what happens at limit + 1;
- whether queueing is grounded as intended;
- whether players receive clear feedback.

Existence of queue code is not proof that queueing is intended design.

## Isolation rule

Check that one arena cannot materially affect another through:

- selectors;
- player/session state;
- enemies/projectiles;
- score/reward;
- timers;
- cinematics;
- structures/world mutation;
- gamerules or other global resources;
- cleanup/reset;
- developer/admin actions.

## Simultaneous-start rule

Independent arenas must be reviewed under simultaneous start and overlapping lifecycle transitions. A system that works sequentially but fails when two arenas start together is a gameplay defect candidate.

## Reuse rule

After cleanup, an arena must be reusable without residue from a prior generation. Review at least one second-run path when the artifact supports reuse.

## Classification

A cross-arena or capacity defect requires player-visible impact and selected-artifact evidence.

Do not classify architecture complexity as a bug by itself. Do not dismiss a limitation as designed solely because a hard-coded limit exists.
