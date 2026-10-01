# Orchestrator

`packages/orchestrator` is the composition layer for cross-owner Bedrock inspection, diagnosis, repair admission, runtime evidence, reporting, reliability workflows, and release-oriented decisions.

It is expected to have higher fan-out than ordinary engine modules because it composes analyzers and deterministic package owners. High fan-out alone is not a reason to create another package, but orchestration is not permission to absorb reusable domain semantics.

## Internal navigation

The public surface is `src/index.ts`, but it now routes through family entrypoints instead of exporting hundreds of flat implementation modules directly.

```text
src/
├── core/index.ts
├── inspection/index.ts
├── arena/index.ts
├── diagnosis/index.ts
├── repair/index.ts
├── reliability/index.ts
├── reporting/index.ts
├── workflow/index.ts
├── release/index.ts
└── index.ts
```

These family barrels are the canonical navigation hierarchy for orchestrator.

Implementation files remain temporarily flat beneath `src/` while CI/local verification is intentionally deferred. This avoids a mass import-path migration without proof. New orchestrator work should enter through the matching family and should not add another uncategorized root export.

The next physical-move phase may relocate implementation files family-by-family once import verification is available; the family boundaries above should remain stable.

### Physical migration status

`arena/`, `inspection/`, `diagnosis/`, `workflow/`, `reliability/`, `reporting/`, and `release/` now have their orchestrator implementations physically inside the hierarchy; matching tests mirror those families where present. Arena-authored static source risk analysis is owned by the Script Analyzer rather than duplicated in orchestrator. Legacy flat source paths remain compatibility re-export stubs while CI/local verification is deferred.


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
