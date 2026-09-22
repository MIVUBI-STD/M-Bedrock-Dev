# M-Bedrock Content Analysis

Use for manifests, functions, commands, references, semantic graph, diagnostics, and derived topology facts.

## Procedure

1. Start from normalized inventory/project facts.
2. Parse only content relevant to the question.
3. Preserve raw source/evidence.
4. Emit typed semantic nodes/edges/effects.
5. Keep unresolved and ambiguous references explicit.
6. Use `SourceRef` for traceability.
7. Populate graph/reverse indexes only from supported facts.
8. Derive diagnostics from facts; do not mutate source.
9. Use topology as a derived view, never a universal arena assumption.

## Efficiency

Prefer content hashes, selective parsing, and change-scoped invalidation over full rescans.
