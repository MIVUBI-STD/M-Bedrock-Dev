# Bug Tracker Projection Pipeline

This directory is the deterministic bridge between canonical Bug Report data and the frozen Golden Bug Tracker presentation.

## Authority

```text
Bug Report V2        → approved BUG / DESIGN_MISMATCH facts
Developer Notes       → canonical DEV_NOTE facts
project workspace      → artifact/version/Drive binding
Golden UI             → presentation
Tester Workspace      → local comments/images/fixed state only
```

No layer may duplicate another layer's authority.

The Golden Tracker has three presentation lanes:
- **BUGS** — gameplay BUG findings from approved Bug Report V2;
- **DESIGN MISMATCHES** — approved DESIGN_MISMATCH findings;
- **DEV NOTES** — canonical developer/release notes from the matching project/level `report/developer-notes.json`.

DEV NOTE is a parallel reference lane, not an issue type, not a severity, and not a fallback for NEED_VALIDATION. Its admission semantics are owned by `docs/analysis/developer-note-coverage.md`.

## Flow

```text
BugReportClientDocument
+ matching project/level report/developer-notes.json
+ matching project.json Drive binding
→ authority validation
→ projectClientDocumentToTracker()
→ BugTrackerDocument
→ validateBugTrackerDocument()
→ Golden HTML renderer
→ exportBugTracker()
→ bug-tracker.json
→ bug-tracker.html
```

The output JSON and HTML must contain exactly the same canonical IDs. Missing, duplicated, or renderer-invented IDs fail export.

## Files

- `model.ts` — small presentation projection model.
- `project.ts` — binds issue facts to the exact project workspace source.
- `validate.ts` — hard pre-render gate.
- `export.ts` — deterministic JSON/HTML parity and output.
- `../golden/` — frozen visual contract and zero-data template.

## Validation

Generation fails on:
- duplicate issue ID;
- missing Drive Folder;
- missing World File;
- missing world filename;
- missing artifact fingerprint;
- missing reproduction;
- missing Observed/Expected;
- forbidden internal/prompt language in tester-facing fields;
- malformed or duplicate Developer Note authority records;
- inconsistent project workspace artifact/current-world binding;
- HTML/JSON canonical-ID mismatch in either direction.

## Deliberate boundaries

This lane does not replace Bug Report V2.

It does not write tester state back into canonical issue facts.

It does not own audit discovery, proof, severity, or classification.

It does not introduce a UI framework or a second Drive registry.

## Integration status

The migration is complete for Approved Bug Report V2 presentation.

- Approved Bug Report V2 has one presentation path: Golden Tracker.
- Map Audit Output V2 retains its separate Map Audit renderer.
- project workspace remains the only source-binding authority.
- Golden UI remains the only Approved Bug Report presentation authority.
- Legacy Approved Bug Report HTML helpers were removed from the entrypoint.






## Remote-GitHub operating mode

This project is maintained through ChatGPT + Remote GitHub on branch `Local`.

Local execution and CI are not workflow gates for this lane.

Readiness is established by repository-source review and deterministic contracts:
- authority separation remains intact;
- project workspace is the only source-binding owner;
- Golden UI remains the only tracker presentation contract;
- validation fails closed on malformed tracker data;
- real approved-report fixtures remain committed as regression specifications;
- Approved Bug Report presentation has completed cutover to the Golden Tracker; Map Audit remains a separate renderer.

Test files may remain as executable specifications for any future environment that runs them, but the normal ChatGPT/Remote-GitHub workflow does not wait on local execution.


## Default renderer cutover

Golden Tracker is now the default presentation path for Approved Bug Report V2 input handled by `tooling/bug-report-documents/render.ts`.

The entrypoint now has two intentionally separate lanes:

```text
Map Audit Output V2
→ existing Map Audit renderer

Approved Bug Report V2
→ existing parser + client quality gate
→ project workspace binding
→ Bug Tracker projection
→ tracker validation
→ Golden renderer
→ bug-tracker.html
→ bug-tracker.json
```

Golden Tracker is unconditional for Approved Bug Report V2; there is no presentation feature flag.

The old Approved Bug Report HTML presentation helpers were removed from `render.ts`; Map Audit presentation was retained because it is a separate report surface and authority.

Do not reintroduce a second Approved Bug Report renderer.


## Workspace export contract

The standalone Golden Tracker supports tester workspace state without mutating canonical issue facts.

Per issue:
- Tester Notes;
- Mark Fixed;
- evidence image paste / drag-drop / browse;
- optional attachment caption;
- image preview;
- attachment removal.

Browser workspace state is stored separately from the embedded canonical report.

`Export JSON` produces:

```json
{
  "canonical": { "...": "complete BugTrackerDocument" },
  "testerState": { "...": "notes, fixed state, attachments" }
}
```

`Export HTML Snapshot` embeds the current tester state into the standalone exported HTML so the report can be moved or archived as one file.

`Import JSON` restores tester state. `Reset Tester Data` clears only tester workspace state; canonical issue facts remain unchanged.
