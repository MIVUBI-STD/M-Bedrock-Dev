# Bug Report UI

Thin Svelte/Vite interface for the canonical M-Bedrock Bug Report V2.

User-facing flow:

```text
AUDIT → REPORT → FIX
```

The UI does not analyze maps or diagnose bugs. ChatGPT performs the audit and produces the report. The UI exists so the selected repair owner can scan the report, avoid missing bugs, and mark each completed bug as `Fixed`.

## Current behavior

- V2 is the current report format.
- V1 can still be imported and is converted to the V2 view.
- One report has one `Repair By` value: `ChatGPT` or `Developer`.
- Each bug has one `Fixed` checkbox.
- Report progress is derived from the bug checkboxes.
- Map Version, Base Version, and Tested Version are shown explicitly.
- A version-difference hint appears when Base Version and Tested Version differ.
- Bugs can be filtered by Fixed state and Severity.
- New exports are V2 JSON.

The canonical vocabulary is owned by `packages/bug-report/README.md`. Frontend wording must not invent alternate meanings for persisted fields.

Commands:

```bash
npm run bug-report-ui:dev
npm run bug-report-ui:build
npm run bug-report-ui:preview
```
