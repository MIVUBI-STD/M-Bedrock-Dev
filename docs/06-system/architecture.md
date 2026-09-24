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

More precisely:

```text
artifact + archive
        ↓
project-model
        ↓
analyzers
        ↓
graph + diagnostics
        ↓
repair
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

Artifact graph, physical inventory, normalized project model, semantic graph, diagnostics, patch transactions, and runtime proof are separate authorities.

Do not collapse these into one global project state object.

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

The implementation lives in `tooling/repository/verify-dependency-graph.mjs`.
