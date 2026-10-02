# Next Action

## Current lane — Real Map Audit

The reusable audit workflow is implemented and presentation/reporting has been hardened. Do not add another general framework before production evidence shows a repeated gap.

Canonical operational flow:

```text
Selected .mcworld
→ Multi-source Surface Discovery
→ Discovery Closure
→ Gameplay Contract / State / Boundary Reconstruction
→ Gameplay Model Closure
→ Risk-directed Analysis
→ Contradiction + Early Counter-Evidence
→ Exact-work Deduplication / Corroboration
→ Proposed Bug Set
→ Chat Review / Approval
→ Bug Report V2
→ Chat Preview / HTML
→ optional Approved Repair
→ Targeted Verification
```

## Next action

Run the workflow against one real selected map version and measure:

- first-pass known-issue capture;
- false positives / suppressed candidates;
- Detection Gaps;
- time/analysis cost by high/medium/low risk surfaces;
- report readability for tester/client use.

Use production evidence to decide the next change.

## Hard rules

- one selected `.mcworld` = one current gameplay truth;
- Discovery Closure OPEN blocks claims of complete surface inventory;
- Gameplay Model Closure OPEN blocks comprehensive publication;
- known bugs are regression fixtures, never map/object-specific production rules;
- exact duplicate work may be skipped, corroborating evidence must remain;
- no Approved Bug/design change + Must Change + Must Preserve → no mutation;
- runtime-only claims remain targeted validation residue.

## Freeze

Until real-map evidence proves a repeated need, do **not** add:

- a new audit framework;
- a new report schema;
- a new proof layer;
- a new candidate-family framework;
- a new workflow database/state model;
- a parallel semantic owner;
- map/object-specific detectors derived from one regression example.

Prefer calibration, deletion, reuse, or tightening an existing owner.

## Deferred

- CI/current-head verification unless explicitly requested;
- LOCAL_MINECRAFT/LIVE_MINECRAFT execution unless required for a specific unresolved claim;
- broad benchmark expansion until real-map audit evidence exists.
