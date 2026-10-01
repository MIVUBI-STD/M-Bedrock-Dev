# Google Drive Artifact Store

M-Bedrock uses Google Drive as an external artifact/evidence store while GitHub and the local workspace retain semantic authority.

## Authority split

```text
GitHub
  engine, schemas, rules, tracked Bug Report V2 handoff

workspace/active/<project-id>
  current project/session state and exact Drive binding

Google Drive
  .mcworld, Raw Dev, old binary versions, human docs,
  test/runtime evidence, report projections, release binaries
```

## Root convention

The configured Drive root keeps map folders directly navigable by humans. One reserved folder owns cross-map system artifacts:

```text
_M-Bedrock/
├── Registry/
├── Portfolio QA/
└── Sync/
```

Do not move map folders beneath the system folder.

## Map convention

Provision folders only when needed:

```text
<Map>/
├── <current>.mcworld
├── Raw Dev/
├── Old Version/
├── Docs/
├── QA/
│   ├── Current/
│   ├── Runs/
│   └── Archive/
└── Release/
```

Existing map-specific level/sub-map hierarchy may remain. Do not force every optional folder into every map up front.

## Exact lookup

Hot-path operations must use IDs from `state/drive-binding.json`.

```text
projectId
→ map folderId
→ current artifact fileId
→ revision/fingerprint check
→ fetch exact artifact
```

Filename search is discovery only and must not establish current-artifact identity.

## Artifact update

```text
current Drive artifact
→ verify file ID + fingerprint
→ working copy
→ repair transaction
→ package new artifact
→ upload/publish
→ previous binary to Old Version when applicable
→ update project Drive binding
→ record sync receipt/reference
```

Never silently carry evidence to a different artifact fingerprint.

## QA placement

Canonical Bug Report V2 remains tracked under `workspace/reports/`.

Drive placement is for human-facing projections and evidence:

```text
QA/Current/   latest report projection
QA/Runs/<run-id>/Evidence/<issue-id>/   execution evidence
QA/Archive/   superseded human-facing exports
```

Cross-map dashboards/summaries belong in `_M-Bedrock/Portfolio QA/`, not inside individual map folders.

## ChatGPT-first operation

The integration intentionally has no background daemon and no bidirectional sync engine.

ChatGPT performs explicit connector actions:

1. read root/project binding;
2. fetch exact Drive item by ID;
3. create missing conventional folders lazily;
4. ingest/update workspace state;
5. publish evidence/report/release artifacts;
6. update exact binding/receipt.

This keeps the integration small, observable, and replaceable.
