# Workspace Agent Rules

Applies to local artifact continuity and tracked audit handoff under `workspace/`.

## Invariants

- Original artifact/source is immutable.
- Working copies are disposable/rebuildable from source + patch history where possible.
- Output packages never overwrite the original artifact.
- Local reports, patches and state remain separate.
- Derived indexes/caches are not source authority.
- Private user artifacts remain ignored and must not be committed.
- `workspace/reports/` is the only tracked report handoff surface and is governed by its nearest `AGENTS.md`.

Expected local project session layout:

```text
workspace/active/<project-id>/
├── source/
├── design/   # map-scoped Game Design authority
├── working/
├── output/
├── reports/
├── patches/
└── state/
```
