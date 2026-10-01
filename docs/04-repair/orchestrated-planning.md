# Orchestrated Repair Planning

Integrated inspection may expose **repair proposals**, but inspection does not create a mutation-authorizing PatchTransaction.

## Output states

Each inspection repair item has one status:

- proposal — a deterministic possible change has been derived for later review;
- unsupported — the current repair engine cannot safely represent the transform;
- unavailable — proposal derivation needs evidence not present in the current inspection context.

A proposal is not an Approved Bug, Repair Contract, repair authorization, or mutation transaction.

## Boundary

```text
inspect / diagnose
→ deterministic repair proposal
→ STOP

chat-approved bug / approved design change
→ Repair Contract
  - Must Change
  - Must Preserve
→ create authorized PatchTransaction
→ verify current fingerprint
→ apply to working copy
→ validate defect removal
→ validate gameplay preservation
```

Inspection must never pre-authorize a gameplay repair merely because a source transform is mechanically obvious.

## Fingerprint role

A source fingerprint may make a proposal more precise, but it does not grant mutation authority.

## Execute wrapper safety

A spatial effect nested inside `execute ... run` remains unsupported when replacing the nested command would discard selectors, positioning, conditions, dimension, rotation, or other execution context.

No inspect API implicitly mutates content or creates gameplay repair authority.