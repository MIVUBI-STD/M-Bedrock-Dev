# Workspace Agent Rules

Applies to local artifact continuity under `workspace/`.

## Invariants

- Original artifact/source is immutable.
- Working copies are disposable/rebuildable from source + patch history where possible.
- Output packages never overwrite the original artifact.
- Reports, patches and state remain separate.
- Derived indexes/caches are not source authority.
- Private user artifacts remain ignored and must not be committed.

Expected project session layout:

```text
workspace/active/<project-id>/
├── source/
├── working/
├── output/
├── reports/
├── patches/
└── state/
```
