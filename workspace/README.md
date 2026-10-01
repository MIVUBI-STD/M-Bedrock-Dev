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


## Drive artifact store

Google Drive is the binary/evidence artifact store, not a second semantic authority.

Tracked root binding:

```text
workspace/drive-root.json
```

Per-project exact Drive binding is local and ignored:

```text
workspace/active/<project-id>/state/drive-binding.json
```

The hot path uses Drive file/folder IDs from the binding. Drive search is discovery/fallback only.

Canonical authority remains:

```text
engine/code/rules/schema            -> GitHub
workspace structured project state -> workspace/active
Bug Report V2 handoff               -> workspace/reports
.mcworld/raw docs/evidence/release  -> Google Drive
```

Map folders are provisioned lazily. When a map first needs a role, ChatGPT creates only the missing conventional folders:

```text
Docs/
QA/
  Current/
  Runs/
  Archive/
Release/
```

Existing `Raw Dev/` and `Old Version/` folders are preserved. Bug Report V2 JSON in Git remains canonical; Drive receives human-facing report projections and run evidence.
