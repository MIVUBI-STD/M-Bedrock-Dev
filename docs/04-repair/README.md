# Repair

Canonical repair/mutation policy.

Owns:

- patch transaction semantics;
- preconditions;
- working-copy-only mutation;
- atomic/rollback behavior;
- typed coordinate/effect transformation;
- repair revalidation.

Diagnosis precedes mutation. Original artifacts remain immutable.


## Real execution closure

`verify-repair` is a differential before/after inspection gate. A passing differential result means the inspected artifact did not show the targeted regression signals; it does **not** establish release eligibility by itself.

Canonical repair completion is:

```text
authorized repair
→ static/transitive validation
→ runtime verification
→ preservation verification
→ package verification
→ original-defect regression check
→ PostRepairClosureReceipt
→ canonical Bug Report fixed=true
```

The final Bug Report transition uses `completeBugReportFromClosedRepair()`. It requires a fixed closure receipt plus the matching passed preservation receipt. This prevents the CLI differential check from bypassing the full repair lifecycle.
