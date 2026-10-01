# Approved Bug Report Reference

This folder stores the approved client-facing Word/PDF reference generated from the golden Bug Report fixture.

Files:

- `Golden_Table_Bug_Report.docx` — editable Word reference.
- `Golden_Table_Bug_Report.pdf` — PDF snapshot converted from the same DOCX.

These files are **visual/reference artifacts only**.

Canonical bug facts remain:

```text
engine/packages/bug-report/fixtures/golden-tester-report-v2.json
```

Canonical client-document projection remains:

```text
engine/packages/bug-report/fixtures/golden-client-document-v1.json
```

Renderer authority remains:

```text
tooling/bug-report-documents/render_docx.py
engine/packages/bug-report/DOCUMENT.md
```

## Duplication rule

Do not copy and manually replace bug text inside the reference DOCX as the normal production workflow.

Instead:

```text
current Bug Report V2 JSON
→ npm run bug-report-doc
→ new DOCX
→ matching PDF
```

The approved reference exists to make visual regression and future duplication easy, not to become a second report source of truth.
