# M-Bedrock-Dev Stable Context

Last verified stable design facts: 2026-10-05

This file contains only stable repository/product facts. It does not own current work, current proof state, implementation-path detail, or project execution state.

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

The deterministic core is shared by CLI, CI, future integrations, and direct library use.

## Branch authority

```text
Local → active development / source authority
main  → stable / release authority
```

## Repository domains

```text
apps/          user-facing executable/UI surfaces
engine/        product implementation and executable semantics
docs/          durable human-facing documentation
planning/      development / operations / project work intent
workspace/     working artifacts, project continuity, and current report handoff
experiments/   bounded non-authoritative research
tooling/       repository/build/developer verification tooling
.agents/       bounded agent procedures, permissions, routing, and evals
```

Historical execution evidence belongs in `engine/reliability/history/`.
Reusable evaluation material belongs in `engine/reliability/corpus/`.

## Stable architecture

```text
Artifact
→ safe ingest / archive boundary
→ normalized project model
→ semantic / gameplay understanding
→ diagnosis
→ authorized transactional mutation
→ validation
→ deterministic output
→ report / evidence projection
```

Repository task planning is a separate control-plane concern. It may select affected work and reuse valid results, but it never upgrades semantic/runtime proof or owns Minecraft behavior.

## Engineering invariants

- one semantic owner per responsibility;
- one primary execution path per behavior;
- one persisted fact has one authority;
- original source artifacts are immutable;
- mutations are explicit, transactional, and preconditioned;
- analyzers are read-only;
- unknown content is preserved;
- compatibility/version applicability is explicit;
- Bedrock and Education share one core with edition-specific rules;
- artifact graph, repository task graph, and Minecraft semantic graph remain separate;
- source/static/package/runtime proof levels remain separate;
- historical reliability evidence is search pressure, not current-artifact truth;
- derived projections do not become second state authorities;
- deletion/reuse of an existing owner precedes adding a new abstraction;
- no persistent registry, manager, cache, or state store without a concrete repeated need.

## Selected-map audit invariant

Production audit has one selected artifact and one ordered flow:

```text
runSelectedMapAudit()
→ TARGET
→ DISCOVERY
→ UNDERSTAND
→ MODEL
→ STRESS
→ PROVE
→ REPORT
```

The selected current map artifact is the sole current gameplay authority.

Historical reports, older versions, reliability data, user symptoms, and external references may raise search pressure but cannot independently define current Expected/Actual behavior or prove a current defect.

Unresolved work remains explicit as Audit Obligations or bounded runtime proof requirements. Vital Gameplay Knowledge Closure is a read-only projection and never a second workflow or finding owner.

## Toolchain

Canonical toolchain policy lives in `toolchain.json`.

Root developer entrypoint:

```text
DEV.cmd
```

## Canonical routing

```text
documentation router        → docs/README.md
repository/domain naming    → docs/06-system/canonical-naming.md
architecture                → docs/06-system/architecture.md
semantic authority          → docs/06-system/authority-model.md
implementation ownership    → docs/06-system/implementation-map.md
development discipline      → docs/06-system/development-discipline.md
developer operations        → docs/06-system/development-operations.md
skill routing               → docs/06-system/skill-routing.md
minimum-sufficient execution→ docs/06-system/zero-waste-execution.md
current work intent         → planning/
working/project state       → workspace/
historical evidence         → engine/reliability/history/
research                    → experiments/
```

If a detail is owned elsewhere, link to that owner rather than duplicating it here.
