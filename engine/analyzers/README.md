# Analyzers

Read-only semantic derivation from Bedrock/Education content.

Analyzer modules remain at `engine/analyzers/<module>/`; hierarchy is recorded in `ownership.json` and enforced by repository verification.

## Analysis pipeline

```text
ingest
├─ discovery
└─ manifest
      ↓
authored-logic
├─ functions
├─ commands
├─ scripts
└─ dialogue
      ↓
gameplay
├─ entities
├─ blocks
├─ resource-pack
└─ gameplay-intent
      ↓
resolution
├─ references
├─ topology
└─ world-db
      ↓
diagnostics
└─ diagnostics
```

This is a semantic routing hierarchy, not a requirement that every map executes every stage.

## Boundary

- Analyzers are read-only.
- Preserve source evidence and uncertainty.
- Version-dependent facts route through compatibility/rule authority.
- `diagnostics/` derives findings from supported evidence; it does not mutate artifacts.
- New analyzers must have one explicit group in `ownership.json`.
