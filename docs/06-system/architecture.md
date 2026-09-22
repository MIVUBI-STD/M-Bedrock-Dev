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
