# Planning

Repository planning lives here. This directory answers **what should be worked on**, not how the product works and not where working artifacts are stored.

## Scope

- `development.md` — M-Bedrock-Dev product, engine, architecture, tooling, detection, and technical-debt work.
- `operations.md` — human-readable cross-project operational intent and policy.
- `operations-audit-queue.json` — machine-readable active audit/revalidation queue only.
- `projects.md` — compact project-specific continuation pointers. Detailed project files and execution state remain under `workspace/projects/<project-id>/`.

## Boundaries

```text
planning/   future/current work intent
workspace/  working artifacts and project execution data
docs/       durable guides, architecture, reference, specifications
engine/     executable product semantics
experiments/ non-authoritative research
```

Planning is not a source of gameplay truth, proof, audit state, report authority, or implementation semantics.

## Growth rule

Keep planning flat while each scope remains small. Machine-readable queue files are allowed only when they have one explicit owner and are referenced by the matching planning document. Create a subdirectory only when a scope has enough durable independent entries that a single document becomes difficult to navigate.

Do not create `misc`, `latest`, `final`, `temp`, or duplicate todo stores.