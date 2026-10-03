# Workspace

Workspace has three responsibilities only:

```text
workspace/
├─ projects/<project-id>/  ignored working continuity for each project
├─ project-registry.json   tracked compact current-project registry
├─ reports/                tracked canonical Bug Report V2 state
├─ drive-root.json         tracked Google Drive root binding
└─ ownership.json          workspace ownership contract
```

There is no `local/`, `active/`, or `saved/` lifecycle tree.

Project lifecycle status belongs in project state/metadata. A project does not move folders merely because it becomes approved, saved, resumed, or published.

## Project workspace

Canonical project shape:

```text
workspace/projects/<project-id>/
├─ source/     immutable project input/extracted source representation
├─ design/     map-scoped authoring/reference material
├─ working/    mutable working copy / transaction target
├─ output/     generated packages and non-canonical deliverables
├─ evidence/   project-scoped diagnostics/evidence, not report authority
├─ patches/    explicit patch transactions/history
└─ state/      project/session/audit continuity metadata
   ├─ work-session.json
   ├─ approvals/<snapshot-fingerprint>.json
   └─ publications/<snapshot-fingerprint>.json
```

### Ownership

- `source/` = what the project started from.
- `design/` = map-scoped authoring/reference material.
- `working/` = current mutable work.
- `output/` = generated deliverables.
- `evidence/` = diagnostic evidence supporting work; never canonical bug state.
- `patches/` = explicit mutation history.
- `state/` = resumable project/work-session state.

Do not create project-local `reports/`. Canonical current bug-report state has exactly one owner:

```text
workspace/reports/
```

This avoids two report stores with competing authority.

## Project registry

`workspace/project-registry.json` is the tracked answer to:

- what project is currently being worked on;
- which artifact/version/fingerprint it is bound to;
- current project lifecycle status;
- current Work Session/audit revision and next action;
- canonical Bug Report reference;
- historical issue knowledge references;
- Drive binding and publication fingerprints.

It is intentionally compact. Detailed evidence stays inside the ignored project workspace.

## Canonical report state

`workspace/reports/` stores only repository-tracked canonical Bug Report V2 current state for audited map versions.

It is the persisted bug-report authority. Generated HTML/PDF or project diagnostics belong in project `output/` or `evidence/` and are derived/non-canonical.

## Audit authority

For gameplay audit, the selected current `.mcworld` is the sole current gameplay source of truth.

`workspace/projects/<project-id>/design/game-design.json`, when present, is authoring/reference material. It does not override the selected map artifact during audit.

## Google Drive

Google Drive is the approved human-facing storage for map binaries, source-development files, and approved derived deliverables.

Canonical guidance:

```text
docs/06-system/drive-storage.md
```

Tracked root pointer:

```text
workspace/drive-root.json
```

Per-project exact Drive folder/current-world pointers belong in project state under:

```text
workspace/projects/<project-id>/state/
```

Internal Work Session, caches, audit control state, or engine metadata are not copied to Drive.

## Continuity rule

A project always keeps one identity:

```text
workspace/projects/<project-id>/
```

Its lifecycle changes in state metadata instead of changing directory:

```text
working
→ ready-for-approval
→ approved
→ drive-published
```

Detailed execution progress remains owned by Work Session / selected-map audit state. Project publication lifecycle must not duplicate those stage machines.

## Gameplay Contract rule

Gameplay Contract is derived for the current scope from evidence inside the selected map version.

It is rebuildable and is not a second persisted authority.

If the selected map does not contain enough evidence to ground a material rule, keep that rule unknown. Do not import intent from stale documents or older builds.
