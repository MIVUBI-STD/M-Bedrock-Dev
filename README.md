# Lazy-Developer

Lazy-Developer is a modular Minecraft Bedrock and Minecraft Education content-engineering system for inspection, gameplay understanding, bug diagnosis, authorized repair/modification, validation, deterministic packaging, and report generation.

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

## Choose one operator flow

These are two entry routes into the **same engine**, not separate copies of the codebase.

| User request | Mode | Route | Result |
|---|---|---|---|
| Improve architecture, detectors, knowledge, UI or repository | **SYSTEM DEVELOPMENT** | `AGENTS.md` → `docs/system/skill-routing.md` → owning development skill → exact canonical source | One bounded, verified source change and logical commit |
| Find or classify defects in one supplied map | **MAP BUG AUDIT** | `AGENTS.md` → `.agents/skills/m-bedrock-map-bug-audit/SKILL.md` → `runSelectedMapAudit()` | One Map Audit Report with complete supported findings and explicit proof gaps |

The audit path does not change engine source. A detected engine gap requires a separate, explicitly authorized development request. Repair and benchmark have dedicated work lanes; they are **not** hidden steps of either mode.

**For ChatGPT:** supply the `Local` repository URL and describe the intended outcome. Repository inspection alone is read-only. Normal repository development uses GitHub directly without `DEV.cmd`, a local checkout, or automatic CI.

## Root files: keep by responsibility

| Root files | Why they stay at root |
|---|---|
| `AGENTS.md`, `GITHUB_RULES.md` | Agent routing and GitHub operating authority |
| `README.md`, `CONTEXT.md`, `CONTRIBUTING.md`, `SECURITY.md` | Human navigation, stable facts, contribution and security rules |
| `package.json`, `package-lock.json`, `tsconfig.json` | Node package and TypeScript project contracts |
| `toolchain.json`, `.node-version`, `VERSION` | Developer toolchain pinning and product version |
| `.editorconfig`, `.gitattributes`, `.gitignore` | Repository/editor behavior |
| `DEV.cmd` | **Optional Windows-local wrapper only**, delegated to `tooling/windows-toolchain/dev.ps1`; not a ChatGPT entrypoint |

Do not split these into competing Development/Audit roots: the mode decision is already owned by `AGENTS.md` and the skills registry. Retire a root file only after its consumers and repository contracts are reconciled.

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
workspace/projects/          map-centric project continuity
  <project>/report/          canonical current Bug Report V2 / Developer Notes
  <project>/output/          derived current HTML + JSON tracker output
  <project>/archive/vX.Y.Z/  intentionally retained historical report/output
  <project>/levels/          level-scoped report/output/archive for multi-level games
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