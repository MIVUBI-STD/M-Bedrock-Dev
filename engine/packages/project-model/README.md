# Project Model

`packages/project-model` owns normalized project/workspace state and shared evidence contracts that must remain independent of parser, UI, and orchestration concerns.

## Internal hierarchy

```text
src/
├── project/     artifact-relative project identity, components, source references, workspace inventory
├── contracts/   cross-owner project-level contracts and transform hints
├── evidence/    telemetry, causal/diagnostic/invariant/decision evidence contracts
├── runtime/     normalized runtime observations, probes, state, temporal and verification contracts
├── session/     project/work-session continuity
└── index.ts     sole cross-owner public entrypoint
```

Tests mirror the same hierarchy under `test/`.

## Boundary

- These folders are internal navigation groups, not independent semantic owners.
- Cross-owner consumers import through `src/index.ts`.
- Runtime contracts describe normalized evidence; they do not become runtime proof by existing in this package.
- Parser/analyzer semantics remain under `engine/analyzers/`.
- Runtime emission/instrumentation remains under `packages/telemetry/`.
- Cross-owner workflow composition remains under `packages/orchestrator/`.
- Avoid moving generic shared types here merely to break dependency cycles; every contract must be project/evidence-state related.
