# Project Lifecycle and Publication

## Purpose

This document defines how M-Bedrock records active work, approval, durable issue history, and Google Drive publication without duplicating authority.

## Authority map

| Concern | Canonical owner |
|---|---|
| What projects currently exist / what is being worked on | `workspace/project-registry.json` |
| Detailed execution progress | project Work Session in `workspace/projects/<project-id>/state/work-session.json` |
| Current approved bug state for one map version | `workspace/reports/*.json` (Bug Report V2) |
| Historical approved issue incidents | `engine/reliability/catalogs/regressions.json` |
| Reusable repeated failure abstractions | `engine/reliability/catalogs/failure-patterns.json` |
| Per-map durable engineering profile | `engine/reliability/catalogs/map-knowledge/` |
| Working files/evidence | `workspace/projects/<project-id>/` |
| Human-facing approved map/source/deliverables | bound Google Drive project folder |

No other issue/project database should be added.

## Project workspace

A project always keeps one path:

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

Status is metadata, not a folder name.

## Tracked Project Registry

`workspace/project-registry.json` is intentionally compact and Git tracked.

It records only durable coordination data:

- project identity/name;
- task class;
- lifecycle status;
- project revision;
- current artifact identity/fingerprint/version;
- Work Session/audit references;
- canonical Bug Report path;
- historical regression/failure-pattern/map-knowledge references;
- Drive project-folder binding;
- current approval/publish fingerprints.

It does not store:
- extracted worlds;
- large evidence;
- semantic graphs;
- model task packets;
- caches;
- binary deliverables.

Those remain in the ignored per-project workspace.

## Lifecycle

Only four project publication statuses exist:

```text
working
→ ready-for-approval
→ approved
→ drive-published
```

Material work after approval returns the project to:

```text
approved / drive-published
→ working
```

Do not add duplicate project-management statuses.

Detailed audit stages remain owned by SelectedMapAuditRun / Work Session and must not be copied into another state machine.

## Audit continuity

Selected-map audit progress is projected into two places:

```text
SelectedMapAuditRun
├─ detailed mirror → project state/work-session.json
└─ compact summary → workspace/project-registry.json
```

The registry records only the current audit revision/stage/next action. It does not become audit-stage authority.

## Approval readiness

A project may enter `ready-for-approval` only through the deterministic completeness gate.

For audit publication, required inputs normally include:

- exact artifact identity/fingerprint;
- valid Work Session and revision;
- completed audit when required;
- canonical Bug Report V2 reference when a bug report is required;
- exact Drive project-folder binding;
- complete deliverable paths/fingerprints;
- no supplied blocking reason.

The completeness gate returns exact missing requirements. Do not mark readiness from model narrative.

## Approval snapshot

Approval freezes exactly one project revision:

```text
ready-for-approval
+ artifact fingerprint
+ audit revision
+ canonical Bug Report reference
+ historical regression references
+ deliverable fingerprints
→ immutable ProjectApprovalSnapshot
→ snapshot fingerprint
```

The snapshot is persisted under:

```text
state/approvals/<snapshot-fingerprint>.json
```

Any material artifact/work/report change invalidates the current approval and returns the project to `working`.

## Durable issue history

Bug Report V2 remains current-version issue authority.

After approval readiness and before the project approval snapshot is frozen:

```text
canonical Bug Report V2
→ historical regression projection
→ merge engine/reliability/catalogs/regressions.json
→ attach regression IDs to project record
→ freeze ProjectApprovalSnapshot
```

Historical records include stable incident ID, map/version, Bug ID, artifact fingerprint, Expected, Observed, reproduction when present, category-derived search tags, and provenance to the canonical Bug Report.

Historical data is search pressure, not proof that another/current map contains the same defect.

Legacy historical records are preserved. New projection must not rewrite or backfill unknown history.

## Failure patterns and map knowledge

Do not automatically promote every regression into a reusable failure pattern.

`failure-patterns.json` is for evidence-backed repeated abstractions, typically after corroboration across multiple incidents/maps.

`map-knowledge/` may reference regression IDs to record historically fragile systems without copying bug narratives.

Project records store only IDs/references to these knowledge owners.

## Drive publication

Drive publication is one-way from an approved snapshot.

```text
approved ProjectApprovalSnapshot
→ ProjectDrivePublishPlan
→ ProjectDriveUploadAdapter
→ upload approved deliverables only
→ executor verifies returned file IDs/fingerprints
→ ProjectDrivePublishReceipt
```

Files outside the approved snapshot are rejected by the canonical plan/receipt path.

A PARTIAL receipt is persisted but does not change project status.

Only a COMPLETE receipt may transition:

```text
approved
→ drive-published
```

Receipts are stored per snapshot:

```text
state/publications/<snapshot-fingerprint>.json
```

PARTIAL → COMPLETE is monotonic. A completed receipt cannot be replaced with conflicting content.

## Google Drive role

Drive stores approved human-facing/project files only.

Internal project registry, Work Session, Audit Obligations, semantic graphs, engine cache, and other control-plane state are not mirrored to Drive.

The exact project Drive folder is bound before approval. The configured global Drive root remains `workspace/drive-root.json`.

## Search/reuse rule

When auditing a future map/version:

```text
current selected artifact
+ historical regression / failure-pattern / map-knowledge search pressure
→ targeted analysis
→ current selected-artifact proof
```

History may prioritize questions and analyzers. It must never directly create a current BUG / DESIGN_MISMATCH.

## Canonical workflow

```text
create/resume project
→ Work Session + project registry update
→ perform work/audit
→ canonical current Bug Report when applicable
→ completeness gate
→ ready-for-approval
→ durable historical issue sync
→ immutable approval snapshot
→ approved
→ Drive publish plan
→ upload/verify approved files
→ COMPLETE Drive receipt
→ drive-published
```
