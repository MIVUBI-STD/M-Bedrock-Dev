# M-Bedrock Repair Engineering

Use when a reproduced defect or intentional modification requires a source change.

## Procedure

1. Require diagnosis + source evidence.
2. Identify the smallest canonical owner and affected scope.
3. Build an explicit patch transaction.
4. Require source fingerprint and exact source/text preconditions where appropriate.
5. Mutate working copy only.
6. Use typed coordinate/effect transforms rather than blind string replacement.
7. Apply atomically and preserve rollback state.
8. Reparse/rebuild only affected semantic branches.
9. Rerun the diagnostic/topology check that justified the repair.
10. Keep package and Minecraft runtime acceptance separate.

## Fail closed

Stop on stale fingerprint, ambiguous match, workspace escape, unresolved coordinate context, or uncertain semantic target.
