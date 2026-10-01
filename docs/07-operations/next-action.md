# Next Action

## Current lane — Workflow Simplification

Real-map testing remains deferred.

Canonical flow:

```text
Game Design
→ Gameplay Contract
→ Actual Behavior
→ Confirmed Defect
→ Proposed Bug Set
→ Chat Approval
→ Approved Bug
→ Repair Contract
→ Authorized Repair
→ Verify Defect + Preserve Design
```

## Non-negotiable gates

- no authoritative Game Design → no gameplay bug classification;
- no matching Gameplay Contract → no candidate discovery;
- Confirmed Defect ≠ Approved Bug;
- internal `repair-eligible` ≠ mutation approval;
- no Approved Bug/design change + Must Change + Must Preserve → no mutation;
- inspection may produce repair proposals only;
- report/HTML remains downstream of approval.

## Remaining hardening

1. remove stale duplicate terminology or bypass wording;
2. keep one semantic owner per decision;
3. keep operator docs short and reference canonical owners instead of duplicating rules.

## Deferred

- Challenge map audit/retest;
- Minecraft runtime testing;
- benchmark/calibration;
- HTML generation;
- CI expansion.
