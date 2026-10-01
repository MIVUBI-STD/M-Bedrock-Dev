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

`workspace/reports/` stores only repository-tracked canonical audit handoff reports. Private artifacts, extracted maps, caches, local verification output, and working state remain ignored.

Nothing under `workspace/active/` or `workspace/saved/` is repository source authority.


## Map Game Design authority

`workspace/active/<project-id>/design/game-design.json` is the canonical local Game Design for that map/project. Engine schemas and compilers validate/compile it, but engine-global knowledge or contracts must never replace it.



## Drive source storage

Google Drive remains user-managed storage for map binaries and source-development material.

Tracked root pointer:

```text
workspace/drive-root.json
```

Per-project exact pointer is local and ignored:

```text
workspace/active/<project-id>/state/drive-binding.json
```

The binding may remember only the map folder, current world file, and existing `Raw Dev` / `Old Version` folders. M-Bedrock does not create Drive-side system, QA, report, registry, sync, or release folders.

Canonical Bug Report V2 remains under `workspace/reports/`.
