# Bug Report Documents

This tooling produces client-facing Word and PDF bug reports without browser/Vite publication infrastructure.

## Flow

```text
canonical Bug Report V2 JSON
→ engine client-document projection
→ DOCX renderer
→ Word-compatible .docx
→ LibreOffice conversion
→ matching PDF
```

DOCX is the single layout source. PDF is converted from that DOCX; there is no separate PDF content renderer.

## Usage

Install the free/open-source document dependency once:

```bash
python -m pip install -r tooling/bug-report-documents/requirements.txt
```

Generate Word + PDF:

```bash
npm run bug-report-doc -- \
  --input workspace/reports/<Map>-v<Version>-BugReport.json \
  --out output/
```

Generate Word only:

```bash
npm run bug-report-doc -- \
  --input workspace/reports/<Map>-v<Version>-BugReport.json \
  --out output/ \
  --docx-only
```

Include fixed issues intentionally:

```bash
npm run bug-report-doc -- \
  --input workspace/reports/<Map>-v<Version>-BugReport.json \
  --out output/ \
  --include-fixed
```

## Dependencies

- Node/tsx already used by the repository;
- Python;
- `python-docx` (free/open-source);
- LibreOffice only when PDF export is requested.

No paid API, SaaS renderer, database, browser server, Google API, or background service is required.

## Reader-first design

The generated document follows `engine/packages/bug-report/DOCUMENT.md`:

- Report overview first;
- compact map/test metrics;
- issue summary only when 2+ issues exist;
- severity guide;
- linear issue details;
- numbered reproduction steps;
- Observed before Expected;
- Recommended Resolution only when supported;
- no internal Bug ID / AI / code details in the client document.

## Adaptive layout

- 0-1 issue: no redundant issue-summary table;
- 2-3 issues: summary table + natural flow;
- 4+ issues: issue details begin on a new page;
- 8+ issues: compact issue rhythm.

## Output naming

```text
<Map Name> v<Map Version> - Bug Report.docx
<Map Name> v<Map Version> - Bug Report.pdf
```

## Ownership

- semantics: `engine/packages/bug-report/`;
- client document model/design: `engine/packages/bug-report/src/document/` + `DOCUMENT.md`;
- file rendering only: `tooling/bug-report-documents/`.

The renderer must not invent, rewrite, or backfill bug facts.
