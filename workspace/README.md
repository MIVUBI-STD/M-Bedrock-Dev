# Workspace

Ignored local continuity for artifact work.

Canonical runtime shape:

```text
workspace/active/<project-id>/
├── source/     immutable extracted/source representation
├── working/    transaction mutation target
├── output/     packaged outputs
├── reports/    diagnostics/evidence reports
├── patches/    explicit patch transactions/history
└── state/      rebuildable derived indexes/cache
```

`workspace/saved/` may retain user-selected local project continuity.

Nothing under normal artifact workspace paths is repository source authority.
