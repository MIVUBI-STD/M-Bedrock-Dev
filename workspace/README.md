# Workspace

Workspace separates local artifact continuity from tracked audit handoff.

```text
workspace/
├─ local
│  ├─ active/<project-id>/   ignored active project state
│  └─ saved/                 ignored user-selected continuity
└─ handoff
   └─ reports/               tracked canonical Bug Report V2 handoff
```

Physical paths stay short (`active/`, `saved/`, `reports/`); `ownership.json` records their semantic grouping.

Canonical local project shape:

```text
workspace/active/<project-id>/
├─ source/     immutable extracted/source representation
├─ design/     map-scoped Game Design authority (`game-design.json`)
├─ working/    transaction mutation target
├─ output/     packaged outputs
├─ reports/    local diagnostics/evidence
├─ patches/    explicit patch transactions/history
└─ state/      rebuildable derived indexes/cache
```

`workspace/reports/` stores only repository-tracked canonical Bug Report V2 current state for audited map versions. It is the persisted bug-report authority; current-version recording takes priority and missing historical reports are not backfilled for completeness. Private artifacts, extracted maps, caches, local verification output, and working state remain ignored.

Nothing under `workspace/active/` or `workspace/saved/` is repository source authority.


## Map Game Design authority

`workspace/active/<project-id>/design/game-design.json` is the canonical local Game Design for that map/project. Engine schemas and compilers validate/compile it, but engine-global knowledge or contracts must never replace it.



## Drive storage

Google Drive is user-managed storage for map binaries and source-development files.

Canonical guidance:

```text
docs/06-system/drive-storage.md
```

Tracked root pointer:

```text
workspace/drive-root.json
```

Per-project exact map/current-world pointers, when useful, belong only in ignored local state under `workspace/active/<project-id>/state/`.

M-Bedrock does not create Drive-side system folders or store internal engine state in Drive.
