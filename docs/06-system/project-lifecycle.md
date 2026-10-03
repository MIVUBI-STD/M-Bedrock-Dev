# Project Lifecycle and Publication

## Purpose

This document defines one-source project continuity, approval, durable issue history, and Google Drive publication.

## Authority map

| Concern | Canonical owner |
|---|---|
| Project identity / artifact binding / Work Session reference / current Bug Report reference / Drive binding / publication proof pointers | `workspace/project-registry.json` |
| Detailed execution progress | `workspace/projects/<project-id>/state/work-session.json` |
| Current-version bug truth | `workspace/reports/*.json` |
| Historical approved issue incidents | `engine/reliability/catalogs/regressions.json` |
| Reusable cross-incident failure abstractions | `engine/reliability/catalogs/failure-patterns.json` |
| Per-map engineering profile | `engine/reliability/catalogs/map-knowledge/` |
| Working files / evidence | `workspace/projects/<project-id>/` |
| Approved human-facing deliverables | bound Google Drive folders |

No second project database, issue database, approval status field, or Drive-folder-id copy should be added.

## Project workspace

A project keeps one path:

```text
workspace/projects/<project-id>/
├─ source/
├─ design/
├─ working/
├─ output/
├─ evidence/
├─ patches/
└─ state/
   ├─ work-session.json
   ├─ approvals/<snapshot-fingerprint>.json
   └─ publications/<snapshot-fingerprint>.json
```

Folder location never represents lifecycle state.

## Tracked Project Registry

`workspace/project-registry.json` is compact and Git tracked.

It stores only durable coordination pointers:

- project identity/name;
- canonical repository task class;
- project revision;
- current artifact identity/fingerprint/version;
- Work Session ID/revision;
- canonical current Bug Report path when applicable;
- one `DriveProjectBinding`;
- current approval snapshot fingerprint, when approved;
- current Drive publication receipt fingerprint, when fully published.

It does **not** store:

- audit stage / next action (owned by Work Session / SelectedMapAuditRun);
- lifecycle status;
- approval readiness;
- historical regression IDs;
- failure-pattern IDs;
- map-knowledge IDs;
- issue narratives;
- evidence / semantic graphs / model packets;
- file inventories or binaries.

## Derived lifecycle view

Lifecycle state is not persisted.

It is derived from publication proof pointers:

```text
no approval fingerprint
→ working

approval snapshot fingerprint
→ approved

approval snapshot fingerprint
+ complete Drive receipt fingerprint
→ drive-published
```

`ready-for-approval` is also not persisted. It is a computed result of `assessProjectApprovalReadiness()`.

This removes stale combinations such as:

```text
status = approved
approvalSnapshotFingerprint = missing
```

## Audit continuity

Selected-map audit state has one detailed owner:

```text
SelectedMapAuditRun
→ Work Session
```

The project registry stores only the Work Session ID/revision as a pointer. It does not copy audit stage, next action, findings, or evidence.

## Approval readiness

Approval readiness is calculated on demand from current owners.

Typical requirements:

- project is currently derived as `working`;
- Work Session ID/revision exists;
- canonical Bug Report reference exists when required;
- one canonical `DriveProjectBinding` exists;
- every deliverable has a path, fingerprint, semantic Drive destination role;
- no supplied blocking reason.

For audit approval, `approveAuditProjectAndPersist()` additionally requires the canonical `SelectedMapAuditRun` at `COMPLETE` and exact artifact fingerprint match.

No readiness field or intermediate lifecycle status is written.

## Approval snapshot

After explicit user approval, freeze the current project revision:

```text
project revision
+ artifact fingerprint
+ audit revision when applicable
+ canonical Bug Report reference
+ canonical deliverable list/fingerprints/destination roles
→ ProjectApprovalSnapshot
→ snapshotFingerprint
```

Snapshot path:

```text
state/approvals/<snapshot-fingerprint>.json
```

The snapshot is immutable.

Project Registry is updated with `approvalSnapshotFingerprint` only after required durable approval work succeeds.

Any material project change clears publication proof pointers and the derived lifecycle returns to `working`.

## Historical issue knowledge

Current-version bug truth remains only in Bug Report V2.

For an audit project:

```text
working project
→ readiness derived
→ user approves
→ immutable approval snapshot created/saved
→ in-memory project derives approved
→ canonical Bug Report projected to regressions.json
→ Project Registry commit written last
```

The reliability regression catalog itself owns historical linkage through provenance:

- projectId;
- report path;
- map/version;
- Bug ID;
- artifact fingerprint.

Project Registry does not copy historical regression IDs.

Historical knowledge is search pressure only. A future/current selected artifact must prove its own defect.

## Failure patterns and map knowledge

Do not promote every historical incident automatically.

`failure-patterns.json` is for corroborated reusable abstractions.
`map-knowledge/` is for durable per-map engineering knowledge.

Neither is copied into Project Registry.

## Single Drive binding

Project Drive destinations have one owner:

```text
ProjectRecord.publication.drive
→ DriveProjectBinding
```

`workspace/drive-root.json` owns only the global root.

Do not store project folder IDs separately in state or lifecycle fields.

`DriveProjectBinding` may contain:

- project root/map folder;
- Development/Source folder;
- Development/Versions folder;
- Technical Docs folder;
- current-world reference when known.

## Deliverable destination roles

Approved deliverables use semantic roles:

```text
project-root
development-source
development-version
technical-docs
```

The Drive publish planner resolves the role through the single `DriveProjectBinding`.

Deliverables never carry a second persistent destination folder ID.

## Drive publication

```text
approved snapshot
→ ProjectDrivePublishPlan
→ destination role resolved from DriveProjectBinding
→ ProjectDriveUploadAdapter
→ uploaded file ID + fingerprint verification
→ ProjectDrivePublishReceipt
```

Receipt completion is not stored as a separate PARTIAL/COMPLETE status.

It is derived:

```text
snapshot.deliverables
vs
receipt.files
→ complete / incomplete
```

Receipt path:

```text
state/publications/<snapshot-fingerprint>.json
```

An incomplete receipt may be extended monotonically with additional verified files.

Only a complete receipt is allowed to write `drivePublishReceiptFingerprint` into Project Registry.

The registry write is the final durable commit marker.

## Commit-last rule

For multi-owner publication operations:

1. validate all current inputs;
2. derive snapshot/plan/knowledge;
3. write immutable/detail proof artifacts;
4. write derived historical knowledge when applicable;
5. write Project Registry **last**.

This avoids introducing a transaction manager while preserving a clear committed/not-committed boundary.

## Canonical workflow

```text
create/resume project
→ Work Session persisted
→ compact Project Registry pointer update
→ work/audit
→ current Bug Report V2 when applicable
→ derive readiness
→ show approval candidate
→ explicit user approval
→ immutable approval snapshot
→ historical issue ingestion (audit only)
→ registry approval fingerprint commit
→ Drive publish plan
→ verified uploads / receipt
→ registry publication fingerprint commit when complete
```

Every durable fact has one owner. Other layers store only pointers or derived views.
