# Next Action

## Current lane — Simplify Before Real Audit

Real-map testing remains deferred.

Canonical flow:

```text
Selected Map Version
→ Gameplay Surface Inventory
→ Gameplay Contract
→ Actual Behavior
→ Discovered-Surface Accounting
→ Confirmed Defect
→ Chat Approval
→ Approved Bug
→ Repair Contract
→ Authorized Repair
→ Verification
```

## Hard rules

- one selected `.mcworld` = one current gameplay truth;
- no stale/external document fills missing intent;
- discovered-surface accounting does not claim full-map discovery;
- generic contract contradiction is the discovery core;
- candidate families are tags, not a whitelist;
- Confirmed Defect ≠ Approved Bug;
- no Approved Bug/design change + Must Change + Must Preserve → no mutation.

## Freeze

Until real-map evidence shows a repeated need, do **not** add:

- new repair subsystem;
- new proof layer;
- new candidate-family framework;
- new workflow database/state model;
- new documentation owner;
- new orchestrator compatibility alias;
- new dashboard/scorecard.

Prefer deleting, reusing, or tightening an existing owner.

## Deferred

- Challenge map audit/retest;
- Minecraft runtime testing;
- benchmark/calibration;
- HTML generation;
- CI expansion.