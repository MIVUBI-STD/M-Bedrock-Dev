# Architecture

M-Bedrock-Dev uses semantic ownership and one-way dependency direction.

## High-level flow

```text
apps / future interfaces
        ↓
packages/orchestrator
        ↓
packages/* + analyzers/*
        ↓
adapters / rules / schemas
```

The semantic reasoning path is:

```text
artifact + archive
        ↓
project-model
        ↓
analyzers
        ↓
semantic graph + Semantic IR
        ↓
Behavioral World Model
        ↓
diagnostics / causality / reliability search
        ↓
Runtime Lab evidence
        ↓
repair + preservation verification
        ↓
orchestrator composition
        ↓
apps/interfaces
```

The arrows express semantic flow, not permission for every source module to import every layer.

## Import boundaries

- `apps/` must not import analyzers directly; use orchestrator/core APIs.
- reusable `packages/*` must not import `apps/`.
- only `packages/orchestrator` may directly compose analyzers.
- analyzers must not depend on repair or orchestrator.
- adapters must not depend on presentation, repair policy, or orchestration.
- genuinely shared dependency-neutral primitives belong in `packages/common`, not in a generic utils dumping ground.

These constraints are checked by `tooling/repository/verify-boundaries.mjs`.

## Semantic boundaries

Artifact graph, physical inventory, normalized project model, semantic graph, Semantic IR, Behavioral World Model, diagnostics, patch transactions, and runtime proof are separate authorities.

The semantic graph owns cross-component dependency/reference topology.

Semantic IR owns normalized source-level execution regions, state operations/authority surfaces, and scheduling/temporal relations.

The Behavioral World Model owns executable semantic state, transitions, declared nondeterminism surfaces, and temporal properties.

Do not collapse these representations:

- a reference edge is not automatically an execution fact;
- an execution edge is not automatically a behavioral transition;
- a behavioral transition is not automatically a proven Minecraft engine fact;
- a runtime observation is not automatically a causal rule.

Do not collapse these into one global project state object.

## Behavioral specification

The formal kernel lives in:

```text
packages/behavior-model
```

It must remain independent from Minecraft runtime APIs and analyzers.

Domain-specific mapping into this kernel must preserve whether semantics came from source inference, documented knowledge, designed project policy, or runtime evidence.

Temporal evaluation is deliberately three-valued. Incomplete finite traces must remain `unknown` for open obligations rather than being treated as proof.

See `docs/06-system/behavioral-world-model.md`.

## Interface rule

CLI, future MCP, future desktop, CI, and automation are clients of the same deterministic engine. No interface gets a private implementation of Bedrock semantics.

## Telemetry runtime instrumentation

Telemetry is split deliberately:

```text
packages/project-model
  → canonical TelemetryEvent / TelemetryBatch contracts

packages/telemetry
  → runtime-independent event emitters, sinks, buffering, scope leases, guards

packages/orchestrator
  → telemetry ingestion, RuntimeEvidence adaptation, knowledge/causal reasoning
```

`packages/telemetry` must not import `@minecraft/server`, analyzers, CLI, or orchestrator. Bedrock-specific map code supplies tick/scope providers and a transport sink.

## Module shape

First-level modules under `packages/`, `analyzers/`, and `adapters/` expose `src/index.ts`.
Application modules under `apps/` expose either `src/main.ts` or `src/index.ts`.

Generic first-level module buckets such as `utils`, `helpers`, `misc`, and `shared` are forbidden. Shared code must have a semantic owner; genuinely dependency-neutral primitives belong in `packages/common`.

This shape is checked by `tooling/repository/verify-module-shape.mjs`.

## Dependency graph audit

Repository verification builds a first-level module dependency graph from relative source imports across `apps/`, `packages/`, `analyzers/`, and `adapters/`.

The graph audit fails on:

- unresolved relative source imports;
- dependency cycles between first-level modules.

Fan-in and fan-out are reported as maintenance signals only. They are not threshold-gated until a repository-specific baseline justifies one.

## Orchestrator composition

`packages/orchestrator` is intentionally a high-fan-out composition root. Repository dependency reports may show substantially higher fan-out here than in ordinary modules; this is a maintenance signal, not an automatic violation.

Do not split the orchestrator into additional packages based on line count or fan-out alone. A new semantic owner requires an independently meaningful responsibility and dependency boundary.

## Controlled runtime laboratory

Runtime experiment semantics are split deliberately:

```text
packages/runtime-lab
  → experiment definitions
  → protocol/arm/repetition planning
  → trial identity validation
  → repeatability/intervention qualification
  → evidence provenance

runtime/lab
  → host-specific Minecraft fixtures and adapters
```

The core runtime-lab package does not import `@minecraft/server`.
A host adapter may execute an experiment only at its declared execution context.

Experiment qualification never promotes evidence directly to CAUSAL. Controlled control/treatment contrast is capped at INTERVENTION_SUPPORTED until the causal engine has excluded relevant alternative explanations.
