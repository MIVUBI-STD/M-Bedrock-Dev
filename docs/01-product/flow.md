# Product Flow

Canonical gameplay-engineering lifecycle:

```text
Target Identity
→ Game Design
→ Gameplay Contract
→ Actual Behavior
→ Diagnose Contradictions
→ Proposed Bug Set
→ Chat Approval
→ Approved Bug
→ Repair Contract
→ Transactional Repair
→ Verify Defect Removed
→ Verify Game Design Preserved
→ Package
→ Report
```

## Canonical vocabulary

| Term | Meaning |
|---|---|
| Game Design | approved intended gameplay |
| Gameplay Contract | scoped derived view of Game Design |
| Actual Behavior | what current implementation/runtime does |
| Confirmed Defect | evidence proves a gameplay contradiction |
| Approved Bug | user-approved defect allowed into report/repair flow |
| Repair Candidate | technically plausible fix; no mutation authority |
| Repair Contract | Must Change + Must Preserve |
| Authorized Repair | Approved Bug/design change + Repair Contract + proof |

`Confirmed Defect` is not `Approved Bug`. `repair-eligible` in internal diagnostics means only that causal proof is sufficient to consider a repair candidate; it never means mutation is approved.

## Understand

Current approved Game Design must be recovered before gameplay bug discovery. Gameplay Contract is a scoped derived working model, not a second persisted design authority.

Design readiness:

- READY — all material rules for the audited scope are grounded;
- PARTIAL — unresolved rules exist but cannot change the scoped decision;
- BLOCKED — a material unknown or conflict can change bug-vs-feature classification.

BLOCKED stops defect classification for the affected scope.

## Audit

Bug discovery is difference-search:

```text
Grounded Gameplay Contract
≠
Grounded Actual Behavior
→ contradiction candidate
```

A technical anomaly is not a gameplay bug without a grounded contradiction, material player impact, cleared counter-evidence, and a tester-verifiable trigger.

## Approval

Proposed bugs are discussed before canonical report creation. Only explicitly approved Blocker/Major bugs enter the report/publication path.

## Repair

```text
Approved Bug
+ violated Gameplay Contract
→ Repair Contract
   - Must Change
   - Must Preserve
→ smallest target mutation
```

Bug repair must not silently redefine intended gameplay.

## Validate

A repair is not complete merely because the original symptom disappears. The defect must be removed and relevant approved gameplay behavior must remain preserved.

## Principles

- understand design before looking for gameplay defects;
- current approved design and actual implementation are separate authorities;
- unknown design stays unknown;
- historical QA is search/regression evidence, not current truth;
- repairs are explicit and reversible;
- validation strength matches the claim;
- HTML/reporting is downstream of approval and never owns gameplay semantics.