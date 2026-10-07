# Bug Report HTML

This tooling renders one self-contained HTML file from either:

- **SelectedMapAuditRun / Map Audit Output V2** → Map Audit Report, using the canonical `mapAuditReport` projection and showing every material `PROVEN` and `NEED_VALIDATION` finding across BUG and DESIGN_MISMATCH;
- **Approved Bug Report V2 + Project Registry + canonical Developer Notes** → Golden Bug Tracker, preserving three parallel lanes: BUGS, DESIGN MISMATCHES, and DEV NOTES.

## Flow

```text
Map Audit Output V2
→ Map Audit Report
→ PROVEN + NEED_VALIDATION remain visible

or

Approved Bug Report V2 JSON
+ Project Registry
+ workspace/developer-notes.json
→ approved-issue + Developer Note projection
→ Golden Bug Tracker HTML
```

HTML is presentation only. It must not invent, promote, hide, or backfill audit facts.

## Default behavior

For **Map Audit Output V2**, all material findings are shown. NEED_VALIDATION findings are labeled **NEED VALIDATION / UNPROVEN**, include the exact missing proof and validation test, and never receive a final severity.

For **Approved Bug Report V2**, the approved-ledger filters remain: open Blocker/Major issues by default; `--include-minor` and `--include-fixed` broaden only that approved gameplay-finding view. Developer Notes are filtered by project identity, have no gameplay severity, and are always presented in their separate DEV NOTES lane.

## Usage

```bash
npm run bug-report-html -- \
  --input workspace/reports/<Map>-v<Version>-BugReport.json \
  --out output/
```

Include fixed issues:

```bash
npm run bug-report-html -- \
  --input workspace/reports/<Map>-v<Version>-BugReport.json \
  --out output/ \
  --include-fixed
```

Include Minor issues intentionally:

```bash
npm run bug-report-html -- \
  --input workspace/reports/<Map>-v<Version>-BugReport.json \
  --out output/ \
  --include-minor
```

`npm run bug-report-doc` remains as a compatibility alias but now produces the same HTML output.

## Dependencies

No Python, LibreOffice, browser server, Vite publication flow, paid API, SaaS renderer, database, or background process is required.

The generated HTML contains its CSS inline and can be opened directly in any modern browser. Browser Print can be used when a PDF snapshot is needed.

## Reader-first design

Each approved issue is one compact block, grouped under **Bugs** or **Design Mismatches**:

```text
Severity + title
Issue          → what the player experiences
How to Trigger → in-game steps
Result         → observed + expected
Resolution     → only when supported
```

Technical causes stay out of the client-facing Issue field.

## Output naming

```text
Map Audit Output V2
→ <Map Name> v<Map Version> - Map Audit Report.html

Approved Bug Report V2
→ <Map Name> v<Map Version> - Bug Report.html
```

## Ownership

- semantics: `engine/packages/bug-report/`;
- client projection/design: `engine/packages/bug-report/src/document/`;
- HTML file rendering only: `tooling/bug-report-documents/render.ts`.

The renderer must not invent, rewrite, promote, suppress, or backfill finding facts.
