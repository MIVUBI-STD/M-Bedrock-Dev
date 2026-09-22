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
→ exact source line precondition at apply
→ working-copy mutation
→ reparse
→ topology compare
→ rerun diagnostic
```

Planning is not application. A patch transaction can exist without mutating the artifact.

## Source fingerprint

The transaction stores the expected source fingerprint. Application receives the independently observed current source fingerprint from the artifact/session owner. Comparing a transaction to its own stored fingerprint is not valid evidence.
