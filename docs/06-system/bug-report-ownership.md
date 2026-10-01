# Bug Report Ownership

M-Bedrock uses one canonical bug-report authority with multiple consumers and projections.

## Core rule

```text
one bug domain
→ one canonical persisted state
→ multiple read/export surfaces
```

Physical placement does not create ownership. A copy, preview, export, spreadsheet, PDF, or external QA note is not authoritative merely because it contains bug information.

## Authorities

| Concern | Canonical owner |
|---|---|
| Bug-report semantics and lifecycle | `engine/packages/bug-report/` |
| Persisted schema | `engine/schemas/bug-report/v2.schema.json` |
| Current canonical bug-report state | `workspace/reports/*.json` |
| Human/application presentation | `apps/bug-report-ui/` projection only |
| Revision history | Git history |
| Map binary/source artifacts | Google Drive |
| Published human-facing report | derived Drive PDF snapshot |
| Incoming/legacy QA material | import/reference only |

## Current-version-first policy

The active recording lane is the latest/current map version being worked on.

Rules:

1. Create or maintain canonical Bug Report V2 only for the current audited map version.
2. Do not backfill old versions merely to make history look complete.
3. If an older version has no trustworthy bug record, leave it missing.
4. Never infer historical bugs from a newer report.
5. Never copy current bugs backward into old versions.
6. Historical QA files may be read as evidence or migration input only when they materially help current work.
7. Missing historical data is an accepted state, not a repair task.

This is an efficiency and integrity rule: unknown history stays unknown.

## Canonical lifecycle

```text
candidate evidence
→ confirmed defect
→ tester-readiness gate
→ canonical Bug Report V2
→ repair / verification
→ canonical update
→ derived presentation/export
```

Only confirmed, current-version defects are promoted into canonical report state.

## Storage roles

### Canonical JSON

`workspace/reports/<Map>-v<Version>-BugReport.json`

- machine-readable;
- schema validated;
- Git tracked;
- current state authority;
- writable only through the canonical bug-report workflow.

### Bug Report App

The app is a client/projection of canonical Bug Report V2.

It may:
- load canonical reports;
- present derived views;
- submit writes through the engine-owned report contract;
- import compatible external material for review.

It must not:
- own a separate bug database;
- keep independent bug status;
- redefine severity, identity, readiness, or completion semantics;
- treat local UI state as persisted authority.

### Google Drive

Drive stores map artifacts and optional published human-facing bug-report snapshots.

A Drive PDF is:
- derived from canonical JSON;
- a communication snapshot;
- not editable canonical state;
- never imported back as authoritative state.

Do not persist a second canonical JSON copy in Drive.

### Legacy and external QA

Legacy spreadsheets, PDFs, client sheets, chats, screenshots, and tester notes are sources/evidence only.

They may contribute to a current confirmed defect, but they do not update canonical state directly.

Do not maintain old QA spreadsheets as parallel live trackers.

## Identity

Bug identity must be stable within one map lineage.

The canonical engine derives Bug ID from map identity plus semantic defect identity. Adding an unrelated defect must not renumber existing defects.

A bug observed again in a newer build keeps its semantic identity when it is the same defect. A materially different defect receives a different identity.

Do not invent historical identities for legacy records that cannot be grounded reliably.

## Refresh and reconciliation

A repeated audit of the same current map version does not replace canonical state blindly.

```text
existing canonical report
+ refreshed confirmed-defect projection
→ reconcileCanonicalBugReport()
→ canonical current-version report
```

Reconciliation preserves existing completion state, retains omitted known bugs, opens newly discovered bugs, and rejects cross-version merges or obvious stable-ID semantic conflicts.

Absence from a later scan is not proof that a bug never existed or is fixed.

## Completion

`fixed: true` is canonical only through `applyVerifiedBugRetest()` after current passing verification with sufficient evidence. New report creation always starts bugs open, and generic reconciliation preserves existing completion state without creating a new completion decision.

A failed retest with explicit evidence sets the bug back to `fixed: false`. The report does not persist a separate `reopened` status.

Intermediate workflow labels such as "in progress", "ready for retest", or "reopened" are not persisted unless a proven product need later justifies a schema change.

## Publication boundary

```text
canonical JSON
→ validated projection
→ PDF/export
→ Drive
```

Publication is one-way. Drive edits never flow back into canonical state.

## Non-goals

Do not add, without a proven need:

- a second report database;
- event sourcing;
- activity feeds;
- project-management boards;
- duplicate Markdown reports;
- Drive-side JSON mirrors;
- historical backfill jobs;
- speculative bug reconstruction.

The system optimizes for trustworthy current-version recording, low ambiguity, and minimal duplicated state.
