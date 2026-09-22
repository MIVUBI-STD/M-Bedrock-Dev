# Implementation Map

Use this before broad repository search.

| Responsibility | Canonical owner |
|---|---|
| Artifact kind/identity/fingerprint | `packages/artifact/` |
| ZIP/archive safety, inventory, package transport | `packages/archive/` |
| Workspace/session/file inventory | `packages/project-model/` |
| Semantic dependency graph/invalidation | `packages/graph/` |
| Diagnostic contract/IDs | `packages/diagnostics/` |
| Repair transactions/preconditions/application | `packages/repair/` |
| Cross-owner inspect orchestration | `packages/orchestrator/` |
| File/path discovery | `analyzers/discovery/` |
| Manifest semantics | `analyzers/manifest/` |
| Function source/reference extraction | `analyzers/functions/` |
| Command semantics/effects | `analyzers/commands/` |
| Reference resolution | `analyzers/references/` |
| Derived diagnostics | `analyzers/diagnostics/` |
| Coordinate/topology derivation | `analyzers/topology/` |
| Format-specific future adapters | `adapters/` |
| Versioned Bedrock/Education rules | `rules/` |
| Structural/internal schemas | `schemas/` |
| Thin user interfaces | `apps/` |
| Root developer routing | `DEV.cmd` → `tooling/windows-toolchain/dev.ps1` |
| Stable project facts | `CONTEXT.md` |
| GitHub execution | `GITHUB_RULES.md` |
| Current continuation | `docs/07-operations/next-action.md` |
| Current proof | `docs/07-operations/current-validation.md` |
| Research | `Experimental/` |

## Dependency direction

```text
apps / future interfaces
        ↓
packages/orchestrator
        ↓
canonical packages + analyzers
        ↓
adapters / rules / schemas
```

No interface may become a second owner of Bedrock semantics.
