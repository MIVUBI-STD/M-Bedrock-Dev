# Topology Repair Planning

Topology inspection may derive a deterministic **repair proposal**. It does not create a production PatchTransaction before workflow approval.

## Initial supported proposal class

Current topology proposal derivation supports:

- strongly evidenced linear topology outlier;
- absolute-coordinate `fill` or `setblock`;
- exact single-line SourceRef;
- replacement preserves command shape and only translates the outlier axis.

Unsupported:

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
→ derive deterministic replacement proposal
→ STOP

Approved Bug / approved intentional modification
→ Repair Contract
→ authorized PatchTransaction
→ source fingerprint + exact source preconditions
→ working-copy mutation
→ executable validation
→ preservation verification
```

Mechanical transformability never substitutes for Game Design understanding or bug approval.