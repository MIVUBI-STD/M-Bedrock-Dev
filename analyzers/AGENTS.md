# Analyzers Agent Rules

Applies to semantic analysis under `analyzers/`.

## Boundary

Analyzers are read-only derivation owners.

```text
input source/model
→ semantic facts/effects/references
→ graph/diagnostic evidence
```

They do not mutate working files and do not own package transport.

## Rules

- Preserve source evidence with `SourceRef`.
- Keep unresolved/ambiguous facts explicit.
- Parse only as deeply as needed for a supported semantic claim.
- Unknown/new syntax is preserved rather than guessed.
- Do not silently assume Bedrock version or Education behavior.
- Do not create project-specific concepts as universal primitives.
- Topology/arena/state scope remains derived evidence.
- Prefer incremental/change-scoped analysis over global rescans.
- Keep parser syntax ownership separate from diagnostics policy.

## Domain owners

```text
discovery    → cheap file/path/content candidates
manifest     → manifest normalization
functions    → function source + function-level references
commands     → command effects / coordinate syntax
references   → semantic target resolution
diagnostics  → findings derived from supported facts
topology     → coordinate context / repeated spatial/state topology
```
