# Bug Report UI

Thin Svelte/Vite client/projection for canonical M-Bedrock Bug Report V2.

Current user-facing surface:

```text
AUDIT → BUG REPORT
```

The UI does not analyze maps or diagnose bugs. It presents confirmed bugs so a tester can understand what failed, reproduce the issue in-game, and see the supported solution without reading source code.

## Current behavior

- V2 is the current report format.
- V1 remains import-only compatibility and may be converted for viewing.
- The primary workspace shows open bugs only.
- Header shows Map Version, exact Tested Version, Open Issues, and Blocker/Major/Minor counts.
- Base Version, Repair By, Fixed progress, internal Bug ID, Category, and Found By are not part of the primary audit surface.
- Each visible bug follows:
  `Bug → Issue → Bug Trigger (In-Game) → Solution`.
- Bug Trigger uses numbered, player-facing steps and must end with an observable wrong result.
- Severity and tester-facing text are searchable.
- Expected, Observed, Technical Analysis, Relevant Code, and Must Preserve remain detail-on-demand.
- Older or externally supplied canonical reports may be opened in compatibility mode.
- Compatibility mode shows tester-readiness and copy-quality issues without mutating the report.
- Compatibility reports may be read and exported.
- A file report can be created on GitHub only after all handoff-quality issues are resolved.
- A GitHub report is read/export oriented during the audit phase.
- Canonical GitHub persistence lives under `workspace/reports/`; UI code must build paths through the shared engine persistence helpers.
- The UI owns no independent bug database, status history, or bug identity.
- Legacy or external files are review/import inputs only; they do not become canonical until promoted through the engine-owned V2 workflow.
- Canonical V2 fields remain unchanged for compatibility with later repair workflows.

Presentation rules are owned by `engine/packages/bug-report/PREVIEW.md`. Wording quality is owned by `engine/packages/bug-report/COPY.md`.


Commands:

```bash
npm run bug-report-ui:dev
npm run bug-report-ui:build
npm run bug-report-ui:preview
```
