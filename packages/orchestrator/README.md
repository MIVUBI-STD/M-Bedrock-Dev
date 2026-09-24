# Orchestrator

`packages/orchestrator` is the composition layer for cross-owner Bedrock inspection, diagnosis, repair admission, runtime evidence, and release-oriented workflows.

It is expected to have higher fan-out than ordinary engine modules because it composes analyzers and deterministic package owners. High fan-out alone is not a reason to create another package.

## Inspection pipeline

`inspect.ts` is the public orchestration flow. Detailed work is delegated to bounded stages:

```text
filesystem inventory
→ inspect-packs
→ inspect-source-index
→ inspect-graph-enrichment
→ inspect-script-import-graph
→ inspect-script-compatibility
→ inspect-entity-knowledge-stage
→ inspect-runtime-analysis-stage
→ knowledge runtime composition
→ inspect-education-stage
→ inspect-causality-stage
→ inspect-result
```

Supporting pure helpers:

```text
inspect-identifiers
inspect-runtime-evidence
```

## Stage rule

Create or extract an inspection stage only when all of these are true:

- it owns one coherent transformation or analysis concern;
- its inputs and outputs can be stated explicitly;
- it reduces direct coupling or control-flow noise in `inspect.ts`;
- it does not duplicate an analyzer/package semantic owner;
- it can be validated through the existing integrated inspection tests.

Do not create stages merely to reduce line count.

## Boundaries

Orchestrator may compose analyzers and core packages. It must not:

- become the canonical parser for Bedrock formats;
- duplicate compatibility, graph, repair, diagnostic, or knowledge semantics;
- hide mutable global state;
- create interface-specific behavior for CLI/MCP/UI;
- treat static/package evidence as runtime proof.

`inspect.ts` should remain readable as a top-to-bottom composition flow. Detailed parsing, derivation, diagnostics, and result projection belong in the nearest bounded stage or their existing semantic owner.
