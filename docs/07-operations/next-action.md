# Next Action

## Current lane — Single-Source Workflow Hardening

Real-map testing remains deferred.

Canonical flow:

```text
Selected Map Version
→ Gameplay Surface Inventory
→ Gameplay Contract
→ Actual Behavior
→ Coverage Check
→ Confirmed Defect
→ Proposed Bug Set
→ Chat Approval
→ Approved Bug
→ Repair Contract
→ Authorized Repair
→ Verify Defect + Preserve Gameplay
```

## Non-negotiable gates

- one selected `.mcworld` = one current gameplay truth;
- no external/stale document fills missing map intent;
- no gameplay-surface inventory → audit coverage is unknown;
- no matching Gameplay Contract → no candidate discovery;
- every discovered gameplay surface must end as checked, blocked, or not-applicable;
- Confirmed Defect ≠ Approved Bug;
- internal `repair-eligible` ≠ mutation approval;
- no Approved Bug/design change + Must Change + Must Preserve → no mutation;
- report/HTML remains downstream of approval.

## Deferred

- Challenge map audit/retest;
- Minecraft runtime testing;
- benchmark/calibration;
- HTML generation;
- CI expansion.