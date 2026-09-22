# Topology Repair Planning

Automatic repair begins only where the diagnostic can be converted into a deterministic reversible source transform.

## Initial supported class

Current automatic topology planning supports:

- strongly evidenced linear topology outlier;
- original command is absolute-coordinate fill or setblock;
- exact single-line SourceRef exists;
- expected replacement preserves command shape and only translates the outlier axis.

Unsupported automatically:

- relative/local coordinates;
- clone;
- teleport;
- nested execute spatial effects;
- non-linear topology;
- broad state-scope findings;
- ambiguous or multi-line source.

## Pipeline

```text
topology diagnostic
→ identify original typed command effect
→ verify repair eligibility
→ derive replacement
→ PatchTransaction
→ independent source fingerprint precondition
→ exact source line check at apply
→ working-copy mutation
→ executable validation
    ├── reparse exact source
    ├── topology compare at exact source
    └── rerun exact diagnostic at source
→ accepted / rejected
```

Planning, application, and validation are separate stages.
