# Reliability Implementation Audit

This audit targets false confidence and search efficiency rather than adding new capability.

## High-priority findings fixed

### Interleaving factorial explosion

The initial interleaving explorer canonicalized schedules only after generating full permutations. For many independent operations this still required factorial work before reduction.

The explorer now performs branch-level independence reduction and has a separate `maxExploredNodes` budget.

Duplicate operation IDs are rejected because they make deterministic replay identity ambiguous.

### Coverage-bucket inflation

Invariant coverage buckets previously incorporated semantic state identity. This meant every distinct state could masquerade as distinct coverage even when no coverage signature existed.

Coverage buckets now use explicit semantic coverage features. Missing coverage produces one `coverage: unknown` bucket per map rather than artificial diversity.

### Incomplete historical challenges

Newer mined invariant families were not all challenged against historical failure evidence.

Historical challenges now cover:

- tag → score relations;
- entity arena-tag consistency;
- entity spatial region relations;
- playing-progress transition decreases.

## Remaining evidence limits

- No exact-head CI proof has yet been recorded for the current reliability-search head.
- Runtime/GameTest harness code is source-only until local Minecraft validation occurs.
- Partial-order reduction correctness depends on conservative resource footprints.
- Mutation scores remain detector evidence, not proof of real-game defect coverage.
- Mined invariants remain candidates until reviewed and promoted.
- Repair workspace symlink/hardlink trust-boundary hardening remains separate work.
