# M-Bedrock-Dev Stable Context

Last verified stable facts: 2026-09-22

This file owns stable product and architecture facts only.

## Product

M-Bedrock-Dev is a content-engineering workspace for Minecraft Bedrock and Minecraft Education.

Primary lifecycle:

```text
Inspect
→ Understand
→ Diagnose
→ Repair / Modify
→ Validate
→ Repackage
→ Report
```

The product must support both one-off forensic analysis and repeatable development workflows without coupling core logic to a single AI client.

## Core architecture

```text
Artifact
→ safe extraction / ingest
→ content discovery
→ normalized project model
→ semantic dependency graph
→ analyzers / diagnostics
→ patch transaction
→ validation
→ package output
→ evidence report
```

## Engineering invariants

- one semantic owner per responsibility;
- one primary execution path per behavior;
- original user artifacts are immutable inputs;
- mutation occurs through explicit patch transactions;
- analyzers do not directly mutate source content;
- compatibility is represented as a capability/profile concern;
- Bedrock and Education share one engine with edition-specific profiles;
- AI may select, explain and orchestrate operations, but core mutations should be deterministic;
- source/static proof is distinct from package and live-game proof;
- reusable real-world failures should become regression fixtures;
- new abstractions require a repeated proven responsibility.

## Initial implementation language

Initial core implementation target:

```text
Node.js 24 LTS
TypeScript strict mode
Vitest
JSON Schema where appropriate
```

Additional native languages are added only when measured requirements justify them.

## Repository map

```text
apps/           user-facing command/application surfaces
packages/       canonical reusable engine modules
adapters/       Bedrock file/container format adapters
analyzers/      semantic inspectors and diagnostic analyzers
rules/          versioned Bedrock/Education compatibility and diagnostic rules
schemas/        internal and external schema material
fixtures/       valid, invalid and regression fixtures
workspace/      ignored local active project data
tooling/        repository-owned build/verification tooling
docs/           canonical product/system/operations documentation
```

## Current phase

Foundation/bootstrap only.

Current next action is owned by `docs/07-operations/next-action.md`.
Current proof state is owned by `docs/07-operations/current-validation.md`.
