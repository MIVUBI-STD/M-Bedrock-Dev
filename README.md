# M-Bedrock-Dev

M-Bedrock-Dev is a modular Minecraft Bedrock and Minecraft Education content-engineering system for inspection, gameplay understanding, bug diagnosis, authorized repair/modification, validation, deterministic packaging, and report generation.

## Branch authority

```text
Local → active development / working authority
main  → stable / release authority
```

## Start here

Primary repository workflow is remote GitHub work through the repository policies:

```text
AGENTS.md
→ GITHUB_RULES.md
→ canonical source/docs owner
→ bounded GitHub read/write
→ remote source verification
→ STOP
```

A local checkout is **not required** for normal ChatGPT/GitHub repository work.

`DEV.cmd` and npm scripts are optional local-developer conveniences only. They may provide stronger executable proof when a developer intentionally uses a local checkout, but they are not a completion prerequisite for remote repository work.

Documentation starts at [docs/README.md](docs/README.md).

## Repository map

```text
apps/          user-facing executable/UI surfaces
engine/        Bedrock analysis, reasoning, validation, repair, and machine knowledge
docs/          durable human-facing documentation
planning/      development, operations, and project work intent
workspace/     working artifacts, project continuity, current reports, and derived publication
experiments/   bounded non-authoritative research
tooling/       repository/developer/build/verification tooling
.agents/       bounded agent procedures, permissions, schemas, and evals
```

The repository root is intentionally sparse. New top-level domains require a durable repository-wide responsibility.

## Product flow

```text
Artifact
→ safe ingest
→ normalized project model
→ semantic/gameplay understanding
→ diagnosis
→ authorized repair / modification
→ validation
→ deterministic package/output
→ report / evidence projection
```

Architecture and ownership:
- [Architecture](docs/system/architecture.md)
- [Authority Model](docs/system/authority-model.md)
- [Implementation Map](docs/system/implementation-map.md)
- [Canonical Naming](docs/system/canonical-naming.md)

## Selected-map gameplay audit

Production map audit has one operator flow:

```text
audit <selected.mcworld>
→ TARGET
→ DISCOVERY
→ UNDERSTAND
→ MODEL
→ STRESS
→ PROVE
→ REPORT
```

Canonical owners:
- [Master Selected-Map Audit Workflow](docs/analysis/master-selected-map-audit-workflow.md)
- [Mandatory Gameplay Audit Procedure](docs/analysis/mandatory-audit-procedure.md)
- [Bug-Finding Coverage System](docs/analysis/bug-finding-coverage.md)

The exact selected map artifact is current gameplay authority. Historical evidence and user/client symptoms may guide search but never replace current-artifact proof.

## Project state and planning

```text
planning/                    what should be worked on
workspace/projects/          working/project continuity
workspace/reports/           canonical current Bug Report V2
workspace/developer-notes.json current Developer Note ledger
workspace/publication/       derived human-facing publication output
engine/reliability/history/  historical execution evidence
engine/reliability/corpus/   reusable/frozen evaluation material
```

See [workspace/README.md](workspace/README.md) and [planning/README.md](planning/README.md).

## Core invariants

- one responsibility → one canonical owner;
- original artifacts remain immutable;
- mutations occur through authorized working-copy transactions;
- derived output never becomes a second source of truth;
- static/package/runtime proof remain distinct;
- historical reliability evidence is search pressure, not current gameplay truth;
- interfaces stay thin; Bedrock semantics belong to `engine/`;
- reuse/delete an existing owner before creating a new abstraction.

## Toolchain

Canonical toolchain policy is [toolchain.json](toolchain.json).

Optional local developer/build routing is owned by `tooling/windows-toolchain/`. Remote GitHub work does not depend on this toolchain.

Historical audit/run evidence belongs in `engine/reliability/history/`; reusable evaluation material belongs in `engine/reliability/corpus/`; superseded implementation detail remains in Git history.