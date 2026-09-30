# Packages

Reusable deterministic engine modules.

## Owners

```text
artifact/       source identity, classification, fingerprint
archive/        archive security, transport, deterministic packaging
project-model/  project/session/workspace/file inventory + telemetry contracts
telemetry/      runtime telemetry emitter, sinks, and instrumentation guards
graph/          semantic graph, indexes, invalidation
diagnostics/    finding contract and stable IDs
repair/         patch planning/application/preconditions
task-graph/     repository capability/dependency/affected execution planning
orchestrator/   composition across canonical owners
```

## Boundary

Packages expose domain APIs and must not depend on presentation surfaces in `apps/`.

Analyzers may feed facts into packages such as graph/diagnostics, but parsers and semantic extraction remain under `analyzers/`.

`task-graph/` is deliberately domain-neutral. It may describe owners and dependencies, but Minecraft semantics, diagnosis authority, repair authority, and proof strength stay with their existing owners.

Read `AGENTS.md` in this directory before changing package ownership.
