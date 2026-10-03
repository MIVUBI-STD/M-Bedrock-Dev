# Workspace

Workspace separates project working continuity from tracked audit handoff.

```text
workspace/
├─ active/<project-id>/   ignored active project state
├─ saved/                 ignored user-selected continuity
├─ reports/               tracked canonical Bug Report V2 state
├─ drive-root.json
└─ ownership.json
```

Canonical active project shape:

```text
workspace/active/<project-id>/
├─ source/     immutable extracted/source representation
├─ design/     map-scoped Game Design authority (`game-design.json`)
├─ working/    transaction mutation target
├─ output/     packaged outputs
├─ reports/    project diagnostics/evidence
├─ patches/    explicit patch transactions/history
└─ state/      rebuildable derived indexes/cache
```

`workspace/reports/` stores only repository-tracked canonical Bug Report V2 current state for audited map versions. It is the persisted bug-report authority; current-version recording takes priority and missing historical reports are not backfilled for completeness. Private artifacts, extracted maps, caches, local verification output, and working state remain ignored.

Nothing under `workspace/active/` or `workspace/saved/` is repository source authority.

## Audit authority

For gameplay audit, the selected current `.mcworld` is the sole current source of truth.

`workspace/active/<project-id>/design/game-design.json`, when present, is authoring/reference material. It does not override the selected map artifact during audit.



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

Per-project exact map/current-world pointers, when useful, belong only in ignored project state under `workspace/active/<project-id>/state/`.

M-Bedrock does not create Drive-side system folders or store internal engine state in Drive.

## Gameplay Contract rule

Gameplay Contract is derived for the current scope from evidence inside the selected map version.

It is rebuildable and is not a second persisted authority.

If the selected map does not contain enough evidence to ground a material rule, keep that rule unknown. Do not import intent from stale documents or older builds.
