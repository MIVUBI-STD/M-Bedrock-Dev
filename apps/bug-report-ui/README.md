# Bug Report UI

Thin Svelte/Vite client/projection for canonical M-Bedrock Bug Report V2.

Current user-facing surface:

```text
APPROVED BUG REPORT → READ / INSPECT / EXPORT
```

The UI does not analyze maps or diagnose bugs. It presents confirmed bugs so a tester can understand what failed, reproduce the issue in-game, and see the supported solution without reading source code.

## Scope boundary

This UI presents **Bug Report V2**, the approved PROVEN BUG ledger. It is not the complete Map Audit Report.

A Map Audit Report may still contain PROVEN DESIGN_MISMATCH and NEED_VALIDATION findings that are intentionally absent from this UI. Their absence here must not be interpreted as proof that the audit has no unresolved material findings.

## Current behavior

- V2 is the current report format.
- V1 remains import-only compatibility and may be converted for viewing.
- The primary workspace shows open bugs only.
- Header shows Map Version, exact Tested Version, Open Issues, and Blocker/Major counts by default.
- Base Version, Repair By, Fixed progress, internal Bug ID, Category, and Found By are not part of the primary audit surface.
- Each visible bug follows:
  `Bug → Issue → Bug Trigger (In-Game) → Solution`.
- Bug Trigger uses numbered, player-facing steps and must end with an observable wrong result.
- Severity and tester-facing text are searchable.
- Expected, Observed, Technical Analysis, Relevant Code, and Must Preserve remain detail-on-demand.
- Older or externally supplied canonical reports may be opened in compatibility mode.
- Compatibility mode shows tester-readiness and copy-quality issues without mutating the report.
- Compatibility reports may be read and exported.
- A GitHub report is read/export oriented during the audit phase.
- Canonical GitHub persistence lives under each project or level `report/bug-report.json`; UI code uses the shared persistence path contract.
- The UI owns no independent bug database, status history, or bug identity.
- Legacy or external files are read-only review/import inputs. Canonical creation happens only through the approval-gated engine workflow.
- Canonical V2 fields remain unchanged for compatibility with later repair workflows.

Presentation rules are owned by `engine/packages/bug-report/PREVIEW.md`. Wording quality is owned by `engine/packages/bug-report/COPY.md`.


Commands:

```bash
npm run bug-report-ui:dev
npm run bug-report-ui:build
npm run bug-report-ui:preview
```


## Approval boundary

The UI does not approve or publish new bugs. Proposed Bug Set discussion happens outside this projection. Only an already approved canonical Bug Report V2 is a publishable source.

Imported files may be inspected and exported, but the UI must not turn an arbitrary import into canonical GitHub state.
