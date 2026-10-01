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

- compact map/test metrics at the top;
- one short severity legend;
- one two-column table per bug;
- stable rows: Issue / How to Reproduce / Observed / Expected / Resolution;
- reproduction numbering restarts for every bug;
- separate Issue Index only for 7+ issues;
- no internal Bug ID / AI / code details in the client document.

## Adaptive layout

- 0 issues: no-open-issues message;
- 1–3 issues: standard compact bug tables;
- 4–6 issues: tighter bug tables;
- 7+ issues: Issue Index + compact bug tables.

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
