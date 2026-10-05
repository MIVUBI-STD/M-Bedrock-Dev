# Repair

Canonical repair/mutation policy.

Owns:

- patch transaction semantics;
- preconditions;
- working-copy-only mutation;
- atomic/rollback behavior;
- typed coordinate/effect transformation;
- repair revalidation.

Approved Bug and a Repair Contract precede bug mutation. Original artifacts remain immutable.

## Canonical detail owners

- [Repair Transactions](./transactions.md) — PatchTransaction semantics, authorized application boundary, filesystem safety, atomic writes, and rollback.
- [Repair Planning](./repair-planning.md) — deterministic proposal derivation, typed repair inputs, topology transforms, and the no-preauthorization boundary.


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

## Gameplay preservation boundary

Bug repair consumes the selected-version Gameplay Contract; it does not invent new gameplay meaning.

```text
Approved Bug
+ violated Gameplay Contract
→ Repair Contract
   ├─ Must Change
   └─ Must Preserve
→ mutation
→ defect verification
→ preservation verification
```

Must Change describes the proven defect outcome that must no longer occur.

Must Preserve describes relevant approved gameplay behavior that must remain true after the fix.

If intended gameplay itself is changing, treat it as an explicit modification request, not as bug repair.