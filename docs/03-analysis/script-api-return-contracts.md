# Script API Return-Contract Intelligence

Return-contract analysis covers API symbols whose result becomes optional while the symbol remains available.

Current 1.18.0 rules include:

- `Entity.getComponent`;
- `Block.getComponent`;
- `ItemStack.getComponent`;
- `BlockPermutation.getState`.

The analyzer classifies direct and assigned result use, including `dereferenced`, `optional-dereferenced`, `guarded-assigned`, and `unguarded-assigned`.

Bounded local guards are recognized for structurally obvious positive checks and early-exit checks. Reassignment ends the proof. Arbitrary interprocedural/closure flow stays unknown rather than being guessed.
