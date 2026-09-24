# M-Bedrock-Dev

M-Bedrock-Dev is a modular Minecraft Bedrock and Minecraft Education content-engineering workspace for inspection, diagnosis, repair, modification, validation, and deterministic repackaging of worlds, packs, add-ons, structures, commands, and related content.

## Branch authority

```text
Local  → active development / working authority
main   → stable / release authority
```

Routine development uses `Local`. Promotion to `main` is explicit.

## Canonical product flow

```text
Artifact
→ safe ingest
→ physical inventory
→ normalized project model
→ semantic dependency graph
→ analyzers / diagnostics
→ patch plan
→ transactional working-copy mutation
→ validation
→ deterministic package output
→ evidence report
```

## Repository operating model

```text
AGENTS.md                         routing / task class / execution context
GITHUB_RULES.md                   GitHub delivery / proof / retry / STOP rules
CONTEXT.md                        stable product and architecture facts
docs/README.md                    canonical documentation router
docs/06-system/                   ownership / implementation / development operations
docs/07-operations/               current continuation and current proof state
.agents/skills/                   bounded specialist procedures
DEV.cmd                           sole repository-level developer entrypoint
tooling/windows-toolchain/        developer/build/verification routing
toolchain.json                    supported toolchain policy
Experimental/                     bounded research only
```

## Core source ownership

```text
apps/           user-facing command/application surfaces
packages/       reusable deterministic engine modules
adapters/       external/container/format adapters
analyzers/      semantic analysis and derived diagnostics
rules/          versioned Bedrock/Education rules
schemas/        structural/internal schemas
fixtures/       minimized reproducible evidence
knowledge/      machine-readable domain facts and project policy
reliability/    reliability catalogs and history data
runtime/        bounded runtime-proof harness content
workspace/      ignored local artifact continuity
tooling/        repository-owned developer/build control plane
docs/           canonical durable documentation
```

Interfaces must remain thin. Core Bedrock semantics do not belong in CLI, future MCP, or desktop surfaces.

## Developer commands

Normal repository-level development starts from:

```text
DEV.cmd setup
DEV.cmd doctor
DEV.cmd check
DEV.cmd test
DEV.cmd inspect <artifact>
DEV.cmd finalize-local
```

`DEV.cmd` delegates to `tooling/windows-toolchain/dev.ps1`. Do not add parallel root command surfaces.

## Documentation

Start at `docs/README.md`. Read selectively by domain instead of loading the whole tree.

Historical audits, superseded architecture, abandoned experiments, and obsolete continuation belong in Git history or `Experimental/`, not as parallel current-state authorities.
