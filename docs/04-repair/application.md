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

Production mutation must enter through the orchestrator authorized path:

```text
repair admission
→ proof bundle
→ authorizeRepairMutation()
→ applyAuthorizedRepair()
→ validation / rollback
→ repair lifecycle
```

Direct primitive use is limited to implementation-internal code and focused unit tests.
