# Orchestrator

`packages/orchestrator` is the composition layer for cross-owner Bedrock inspection, diagnosis, repair admission, runtime evidence, reporting, reliability workflows, and release-oriented decisions.

It is expected to have higher fan-out than ordinary engine modules because it composes analyzers and deterministic package owners. High fan-out alone is not a reason to create another package, but orchestration is not permission to absorb reusable domain semantics.

## Internal navigation

The public surface is `src/index.ts`. Exports are grouped by responsibility rather than discovery order.

Use these families when locating an orchestration module:

```text
inspection / semantic composition
arena / multiplayer composition
diagnosis / runtime evidence
repair composition
reliability / portfolio
reporting
repository workflow / control plane
release / operational state
```

File prefixes are navigation aids, not new semantic authorities. A module that starts owning reusable policy, persistent domain state, parsing, or mutation semantics must move to the corresponding canonical package/analyzer rather than growing a second owner inside orchestrator.

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

## Extraction gate

Before adding another orchestrator module, ask:

```text
Does this only compose existing owners?
  yes → orchestrator may own it

Does it define reusable semantics/policy/state/mutation?
  yes → move it to the canonical package/analyzer owner

Is it consumer/UI-specific?
  yes → apps/tooling owns it, not orchestrator
```

Keep the source layout shallow when path stability is materially valuable. Introduce a physical subdirectory only for a cohesive family with a stable boundary; do not mass-move files merely for appearance.

## Boundaries

Orchestrator may compose analyzers and core packages. It must not:

- become the canonical parser for Bedrock formats;
- duplicate compatibility, graph, repair, diagnostic, or knowledge semantics;
- hide mutable global state;
- create interface-specific behavior for CLI/MCP/UI;
- treat static/package evidence as runtime proof.

`inspect.ts` should remain readable as a top-to-bottom composition flow. Detailed parsing, derivation, diagnostics, and result projection belong in the nearest bounded stage or their existing semantic owner.

## Projection boundary

New consumers should not use `gameplayWorld` as their primary model.

```text
gameplaySemantic
→ gameplay meaning, subjects, arena structure, authored systems

engineeringAssessment
→ capacity, lifecycle convergence, cleanup, isolation, proof, contract/runtime gaps

gameplayWorld
→ deprecated compatibility composite only
```

This prevents QA state from becoming gameplay meaning and prevents inferred gameplay structure from being treated as engineering proof.
