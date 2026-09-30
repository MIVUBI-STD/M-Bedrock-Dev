# Workspace

Workspace separates local artifact continuity from tracked audit handoff.

```text
workspace/
├── active/<project-id>/   ignored local active project state
├── saved/                 ignored user-selected continuity
└── reports/               tracked canonical Bug Report V2 handoff
```

Canonical local project shape:

```text
workspace/active/<project-id>/
├── source/     immutable extracted/source representation
├── working/    transaction mutation target
├── output/     packaged outputs
├── reports/    local diagnostics/evidence
├── patches/    explicit patch transactions/history
└── state/      rebuildable derived indexes/cache
```

`workspace/reports/` is intentionally different: it stores only repository-tracked canonical audit handoff reports. Private artifacts, extracted maps, caches, local verification output, and working state remain ignored.

Nothing under `workspace/active/` or `workspace/saved/` is repository source authority.
