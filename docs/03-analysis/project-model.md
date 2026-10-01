# Normalized Project Model

The normalized project model sits between physical files and semantic analysis.

```text
artifact graph
→ file inventory
→ normalized components
→ semantic dependency graph
```

These layers remain distinct.

## Source truth

Actual extracted files are source truth.

Normalized components and semantic graphs are derived truth. Serialized indexes are rebuildable caches and must never become the only authority.

## Component identity

A component identity must be stable across workspace relocation and should be based on semantic scope + identifier rather than absolute filesystem path.

Examples:

```text
function:<pack-scope>:game/start
structure:<pack-scope>:arena/tier1
entity:<namespace-scope>:example:zombie
```

## Source references

Every derived component or graph edge should be traceable to source using `SourceRef`, which can identify:

- artifact;
- relative file path;
- line/column range;
- JSON Pointer.

This enables diagnostics to explain exactly why a relationship or finding exists.


## Package hierarchy

Implementation lives under `engine/packages/project-model/` with one public package entrypoint and five internal navigation groups:

```text
project/    project identity, inventory, source references
contracts/  project-level cross-owner contracts
evidence/   telemetry, causal, diagnostic, invariant and decision evidence
runtime/    normalized runtime evidence/probe/state contracts
session/    durable work/session continuity
```

These groups organize one package; they are not separate semantic authorities.
