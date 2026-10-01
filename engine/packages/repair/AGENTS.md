# Repair Package Rules

Applies to `engine/packages/repair/`.

## Ownership

This package owns low-level deterministic repair primitives:

- repair authorization receipts for transaction planning;
- PatchTransaction construction;
- preconditions;
- working-copy mutation;
- rollback.

It does **not** own gameplay approval.

## Production boundary

Low-level repair primitives are not sufficient authority for gameplay bug repair.

Production gameplay mutation must enter through the orchestrator repair admission path and carry:

```text
Approved Bug
+ violated Gameplay Contract
+ Repair Contract
  - Must Change
  - Must Preserve
+ current evidence / fingerprint
```

The orchestrator proof bundle binds that workflow authority to the exact transaction before `applyAuthorizedRepair()` may retain a mutation.

Intentional modification is separate from bug repair and requires an explicitly approved design change.

## Rules

- source code or a diagnostic finding alone cannot authorize gameplay mutation;
- a confirmed defect that was not approved is not repair authority;
- a PatchTransaction describes mutation, not gameplay intent;
- original artifacts remain immutable;
- working-copy mutation must remain preconditioned and reversible;
- preservation verification is mandatory for gameplay bug repair;
- direct `applyPatchTransaction()` use is implementation-internal or unit-test only.
