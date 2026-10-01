# Safe Transaction Application

Transactions may mutate only the working copy.

The application boundary enforces:

- target path must remain inside working root;
- target must not overlap immutable source root;
- preconditions are checked before mutation;
- replace-command requires exact line evidence and exact expected command text;
- replace-text rejects ambiguous multiple matches;
- writes use a temporary file and atomic rename;
- previously written files are restored if a later operation fails.

The returned rollback metadata contains prior working-copy text for successfully changed files. Original source artifacts remain untouched.

This is still source-level validation. It does not prove Minecraft runtime behavior.


## Mutation boundary

Low-level mutation primitives are internal implementation details of the repair package.

Do not import or expose `applyPatchTransaction()`, `rollbackAppliedFiles()`, or `atomicWriteText()` through the repair package public API.

Production gameplay mutation must enter through the orchestrator authorized path:

```text
Approved Bug or approved intentional design change
→ violated Gameplay Contract / Repair Contract
→ repair admission
→ preservation readiness
→ proof bundle bound to workflow authority
→ authorizeRepairMutation()
→ applyAuthorizedRepair()
→ validation / rollback
→ preservation verification
→ repair lifecycle
```

For bug repair, a confirmed defect alone is not mutation authority. The bug must be explicitly approved and the Repair Contract must contain both Must Change and Must Preserve invariants.

Direct primitive use is limited to implementation-internal code and focused unit tests.
