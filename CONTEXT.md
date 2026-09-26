# M-Bedrock-Dev Stable Context

Last verified stable design facts: 2026-09-22

This file owns stable product and architecture facts only.

## Product

M-Bedrock-Dev is a modular Minecraft Bedrock and Minecraft Education content-engineering workspace.

Primary lifecycle:

```text
Inspect
→ Understand
→ Diagnose
→ Repair / Modify
→ Validate
→ Package
→ Report
```

The same deterministic core must support CLI, CI, future MCP, future desktop tooling, and direct library use.

## Repository authority

```text
Local = active development / source authority
main  = stable / release authority
```

## Architecture

```text
Artifact
→ safe ingest/archive boundary
→ physical file inventory
→ normalized project model
→ semantic dependency graph
→ gameplay intent reconstruction
→ analyzers / diagnostics
→ patch transaction
→ working-copy mutation
→ validation
→ deterministic package output
→ evidence report
```

## Repository organization

```text
DEV.cmd        sole repository-level developer entrypoint
apps/          user-facing surfaces only
packages/      reusable deterministic engine owners
adapters/      external/source format adapters
analyzers/     semantic derivation and diagnostics
rules/         versioned Bedrock/Education rules
schemas/       structural/internal schemas
fixtures/      minimized reproducible evidence
knowledge/     machine-readable Bedrock/Education facts and project policy
reliability/   repository-owned reliability catalogs/history data
runtime/       bounded runtime proof harness content
docs/          canonical product/system/operations docs
tooling/       repository-owned developer/build control plane
workspace/     ignored local artifact continuity
Experimental/  bounded research only
```

The root is reserved for repository policy, version/toolchain authority, command entrypoints, and canonical documentation entrypoints.

## Engineering invariants

- one semantic owner per responsibility;
- one primary execution path per behavior;
- one persisted fact has one authority;
- source artifacts are immutable;
- working-copy mutation is transactional and preconditioned;
- analyzers are read-only;
- unknown content is preserved;
- compatibility is a versioned capability concern;
- Bedrock and Education share one core with explicit edition-specific rules;
- artifact graph and semantic graph are different authorities;
- source/static/package/live proof remain separate;
- regression fixtures protect material recurring behavior;
- deletion/reuse/native capability precede new abstractions;
- no background subsystem or persistent registry without a concrete repeated need.

## Toolchain

Canonical supported policy lives in `toolchain.json`.

Current initial implementation lane:

```text
Windows 10/11 x64 primary developer target
Node.js 24 LTS (developer/build pinned to 24.21.0)
npm 11.19.0 + committed lockfile authority; installs use `npm ci`
TypeScript strict mode
Vitest
PowerShell 7-compatible repository tooling
```

Rust, Python, databases, desktop frameworks, and MCP infrastructure are not mandatory dependencies until a proven requirement owns them.

## Semantic owners

```text
artifact identity/fingerprint      → packages/artifact
archive safety/transport           → packages/archive
normalized project state           → packages/project-model
dependency graph                   → packages/graph
diagnostic contracts               → packages/diagnostics
repair transactions                → packages/repair
orchestration                      → packages/orchestrator
Bedrock content parsing            → analyzers/*
format adaptation                  → adapters/*
compatibility/version policy       → rules/* + future packages/compatibility
interface presentation             → apps/*
```

## Current phase

Repository foundation and core source architecture exist.

Current continuation: `docs/07-operations/next-action.md`.
Current proof state: `docs/07-operations/current-validation.md`.
Implementation ownership: `docs/06-system/implementation-map.md`.
