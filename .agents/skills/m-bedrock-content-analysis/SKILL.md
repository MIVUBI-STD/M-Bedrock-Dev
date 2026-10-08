---
name: m-bedrock-content-analysis
description: >
  Analyze manifests, functions, commands, references, semantic graphs, diagnostics, and topology as a read-only domain specialist. Does not choose the active work lane.
---

# Lazy-Developer Content Analysis

**Role:** DOMAIN SPECIALIST — read-only semantic analysis

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


## Lane boundary

This skill does not decide whether the current job is Map Audit or Detection Development.

- In **Map Bug Audit**, use existing analysis capability only. If required semantics are unsupported, emit `detection-gap` and return to the audit lane.
- In **Detection Development**, this skill defines analyzer semantics/ownership, but development acceptance is owned by `m-bedrock-detection-development`.

Never modify analyzer implementation merely because an operational audit encounters unsupported evidence.
