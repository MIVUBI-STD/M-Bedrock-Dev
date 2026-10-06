# M-Bedrock-Dev Stable Context

Last verified stable design facts: 2026-09-30

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

Repository execution planning is a separate control-plane concern:

```text
changed paths / explicit target
→ task-graph affected closure
→ valid reuse filtering
→ minimum required execution
→ existing semantic owners
```

The Task Graph never upgrades semantic or runtime proof and never owns Minecraft behavior.

## Repository organization

```text
DEV.cmd        sole repository-level developer entrypoint
apps/          user-facing surfaces only
virtual-clients/ durable Virtual Clients non-UI product authority
engine/packages/      reusable deterministic engine/control-plane owners
engine/adapters/      external/source format adapters
engine/analyzers/     semantic derivation and diagnostics
engine/rules/         versioned Bedrock/Education rules
engine/schemas/       structural/internal schemas
engine/fixtures/      minimized reproducible evidence
engine/design/        Game Design schema/compiler system
engine/knowledge/     Minecraft platform/runtime facts
engine/contracts/     Engineering Contracts
engine/reliability/   repository-owned reliability catalogs/history data
engine/runtime/       bounded runtime proof harness content
docs/          canonical product/system/operations docs
tooling/       repository-owned developer/build control plane
workspace/     project working/saved continuity + Map Game Design + tracked report handoff
experiments/   bounded research only
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
- artifact graph, repository task graph, and Minecraft semantic graph remain separate authorities;
- source/static/package/live proof remain separate;
- regression fixtures protect material recurring behavior;
- deletion/reuse/native capability precede new abstractions;
- unknown Task Graph ownership falls back conservatively instead of silently skipping work;
- Task Graph wildcard ownership is limited to one trailing prefix wildcard; no generic glob semantics;
- domain-specific source changes invalidate only their owned domain plus explicit dependents; core parser/model changes expand conservatively;
- proposal-only repair coverage is distinct from missing deterministic realizer coverage;
- AI Context Compiler may consume a valid repository task plan to compress domain context, but unmatched ownership keeps context conservative;
- no background subsystem or persistent registry without a concrete repeated need.

## Toolchain

Canonical supported policy lives in `toolchain.json`.

Current initial implementation lane:

```text
Windows 10/11 x64 primary developer target
Node.js 24 LTS (developer/build pinned to 24.21.0)
npm 11.19.0 + committed lockfile authority; installs use npm ci
TypeScript strict mode
Vitest
PowerShell 7-compatible repository tooling
```

Rust, Python, databases, desktop frameworks, and MCP infrastructure are not mandatory dependencies until a proven requirement owns them.

## Semantic and control-plane owners

```text
artifact identity/fingerprint      → engine/packages/artifact
archive safety/transport           → engine/packages/archive
normalized project state           → engine/packages/project-model
Minecraft dependency graph         → engine/packages/graph
repository affected execution      → engine/packages/task-graph
diagnostic contracts               → engine/packages/diagnostics
repair transactions                → engine/packages/repair
cross-owner composition            → engine/packages/orchestrator
Bedrock content parsing            → engine/analyzers/*
format adaptation                  → engine/adapters/*
compatibility/version rules       → engine/rules/* + engine/packages/compatibility
interface presentation             → apps/*
```

## Current phase

Repository foundation, domain-intelligence layers, repair routing, first-pass gameplay discovery/closure, risk-directed diagnosis, reachability/capability exposure, contradiction consolidation, and production bug-report presentation are implemented. The active operational lane is real-map usage and calibration against selected current map artifacts; new framework work should be driven only by proven Detection Gaps or repeated production bottlenecks.

Current continuation: `docs/07-operations/next-action.md`.
Current proof state: `docs/07-operations/current-validation.md`.
Implementation ownership: `docs/06-system/implementation-map.md`.

## Gameplay bug workflow invariant

```text
current approved Game Design
→ scoped Gameplay Contract
→ design readiness
→ actual behavior contradiction
→ candidate admission
→ Proposed Bug Set
→ chat-approved bug
→ Repair Contract
→ mutation
→ defect + preservation verification
```

Source-derived intent is implementation evidence, not Map Game Design authority. Inspection may derive repair proposals, but production PatchTransaction/mutation authority starts only after approval and preservation binding.

Vital Gameplay Knowledge Closure is a final read-only projection of the canonical selected-map audit. It covers exactly eight vital domains and fails open on RUNTIME_REQUIRED, DETECTION_GAP, or unrouted material residue. It does not introduce a new command, state machine, finding lane, or proof owner.
