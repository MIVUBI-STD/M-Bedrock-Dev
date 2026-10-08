# Analyzers Agent Rules

Applies to semantic analysis under `engine/analyzers/`.

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

## Analyzer classification authority

`engine/analyzers/ownership.json` is the machine-readable authority for analyzer-group membership.

Its current groups are:

```text
ingest
authored-logic
gameplay
resolution
diagnostics
```

Do not duplicate the complete analyzer inventory here. Use the nearest analyzer package `README.md`/source entrypoint plus `docs/system/implementation-map.md` when exact ownership is needed.
