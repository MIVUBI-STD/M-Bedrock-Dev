# Script API Signature Migration Intelligence

Versioned call-shape rules cover surviving symbols whose accepted arguments change.

Current evidence-backed rules:

- `Entity.applyKnockback`: four numeric parameters in prior 1.x → `VectorXZ` plus vertical strength in 2.0.0+;
- `Dimension.spawnEntity`: two arguments in prior 1.x → optional third options argument in 2.0.0+.

The parser retains argument count, coarse argument kinds, spread presence, source, and canonical receiver. Deterministic mismatches emit `SCRIPT_API_SIGNATURE_INCOMPATIBLE`; spread-based ambiguity remains unknown.
