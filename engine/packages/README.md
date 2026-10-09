# Packages

Reusable deterministic engine modules.

Packages stay physically flat at `engine/packages/<module>/` so module import paths remain stable. Architectural hierarchy is **logical and enforced**, not simulated by deeply nested folders.

## Domain groups

```text
foundation/
├─ common
├─ artifact
├─ archive
├─ project-model
├─ dataflow
├─ graph
└─ semantic-ir

understanding/
├─ knowledge
├─ gameplay-intent
├─ behavior-model
├─ compatibility
└─ runtime-profile

diagnosis/
├─ diagnostics
├─ diagnostic-reasoning
├─ logic-solver
├─ analysis-planner
└─ diagnosis-pipeline

repair/
├─ repair
└─ preservation

validation-reliability/
├─ validation
├─ telemetry
├─ runtime-lab
├─ reliability
└─ reliability-search

orchestration/
├─ task-graph
├─ orchestrator
└─ bug-report

design-authority/
└─ game-design-spec
```

Canonical machine-readable ownership is `ownership.json`. Repository verification requires every package directory to belong to exactly one group and rejects stale/duplicate assignments.

## Dependency intent

```text
foundation
   ↓
understanding
   ↓
diagnosis
   ↓
repair
   ↓
validation-reliability

orchestration = composition/routing across canonical owners
```

This is an ownership hierarchy, not permission for arbitrary downward/upward imports. Concrete dependency rules remain enforced by repository boundary checks.

## Boundary

- Packages expose domain APIs and must not depend on presentation surfaces in `apps/`.
- Analyzers provide derived facts; parser/extraction ownership remains under `engine/analyzers/`.
- `task-graph/` is repository-control-plane only and must not become a second Minecraft semantic engine.
- `orchestrator/` composes owners; it must not duplicate canonical parser, diagnosis, or repair semantics.
- New modules require an existing group or an explicit taxonomy change. Do not create `utils`, `misc`, `helpers`, `shared`, or generic manager packages.

Read `AGENTS.md` before changing package ownership.
