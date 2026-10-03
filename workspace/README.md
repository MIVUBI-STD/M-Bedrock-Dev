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

Project lifecycle is derived from approval/publication proof references. It is not stored as a parallel status field, and a project never moves folders because of lifecycle changes.

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

`workspace/project-registry.json` is a compact tracked index.

It stores project identity, artifact binding, Work Session pointer, canonical Bug Report pointer, one `DriveProjectBinding`, and active approval/publication proof fingerprints.

It does not copy audit stage/revision/next-action, historical issue IDs, issue narratives, or lifecycle/readiness/completion status.

Derived lifecycle:

```text
no approval proof      → working
approval proof         → approved
approval + publication → drive-published
```

Detailed evidence and execution state stay inside the ignored project workspace.
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

Per-project Drive folder/current-world binding has one owner: `workspace/project-registry.json` through `ProjectRecord.publication.drive`. Project state must not keep a second Drive folder binding.

Internal Work Session, caches, audit control state, or engine metadata are not copied to Drive.

## Continuity rule

A project always keeps one identity/path:

```text
workspace/projects/<project-id>/
```

Work Session owns detailed execution progress. Project Registry stores only the Work Session ID/revision pointer.

Approval readiness, lifecycle status, and Drive completion are derived views, never parallel stored state.
## Gameplay Contract rule

Gameplay Contract is derived for the current scope from evidence inside the selected map version.

It is rebuildable and is not a second persisted authority.

If the selected map does not contain enough evidence to ground a material rule, keep that rule unknown. Do not import intent from stale documents or older builds.
