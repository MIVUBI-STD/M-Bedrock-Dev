# Bug Report HTML

This tooling renders client-facing bug reports as a single self-contained HTML file.

## Flow

```text
canonical Bug Report V2 JSON
→ player-impact / severity filtering
→ engine client-document projection
→ self-contained HTML
```

HTML is presentation only. Bug Report V2 JSON remains the source of truth.

## Default behavior

The default client report includes only:

- Blocker;
- Major;
- open issues.

Minor issues remain available in canonical data but are hidden from the default report because they do not materially affect core gameplay.

Use `--include-minor` only when a broader QA view is explicitly needed.

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

Each bug is one compact block:

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
<Map Name> v<Map Version> - Bug Report.html
```

## Ownership

- semantics: `engine/packages/bug-report/`;
- client projection/design: `engine/packages/bug-report/src/document/`;
- HTML file rendering only: `tooling/bug-report-documents/render.ts`.

The renderer must not invent, rewrite, or backfill bug facts.
