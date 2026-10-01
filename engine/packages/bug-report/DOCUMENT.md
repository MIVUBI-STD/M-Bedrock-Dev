# Bug Report Client Document Contract

This file owns the Word/PDF presentation grammar for client-facing bug reports.

Bug Report V2 owns facts. The document layer owns only how those facts are made easy to scan.

## Reader goal

A client or non-technical reviewer should understand the report in this order:

1. Which map/version was tested?
2. How many open issues exist?
3. Which issues are Blocker / Major / Minor?
4. For each bug: what failed, how to reproduce it, what happened, what should happen, and what resolution is supported?

The reader should not need to understand code, AI analysis, or internal Bug IDs.

## Core principle

```text
information-first
not narrative-first
```

Word/PDF is not ChatGPT. Default presentation is a compact QA table, not a sequence of long headings and paragraphs.

## Authority chain

```text
Bug Report V2
→ projectBugReportClientDocument()
→ reviewBugReportClientDocument()
→ DOCX renderer
→ PDF converted from the same DOCX
```

DOCX and PDF must not independently rewrite bug facts.

## Default document structure

```text
MIVUBI
Map Name
BUG REPORT

Map Version | Tested Version | Open Issues | Severity counts
small severity legend

Bug Table 01
Bug Table 02
Bug Table 03
...
```

A separate Issue Index is shown only for large reports.

Do not add separate sections for Severity Guide or Issue Details in ordinary reports.

## Header

The top of the document should fit in a compact area.

Show only:

- MIVUBI;
- map name;
- Bug Report;
- map version;
- exact tested Minecraft version;
- open issue count;
- Blocker / Major / Minor counts.

Use one short severity legend:

```text
Blocker = stops progression · Major = materially affects gameplay · Minor = limited impact
```

Do not create a full-page or full-section severity explanation.

## Bug table

Each visible bug is one two-column table.

Header:

```text
01 · BLOCKER | Arena cannot start a second match
```

Body:

```text
Issue            | concise gameplay problem + impact
How to Reproduce | numbered in-game steps
Result           | Observed + Expected, clearly labeled
Resolution       | supported Suggested Fix, when available
```

Rules:

- left column is narrow and reserved for stable short labels;
- right column receives most of the width and owns the useful content;
- title and severity remain visible at the top of the same table;
- reproduction numbering restarts from 1 for every bug;
- omit Resolution entirely when no supported Suggested Fix exists;
- do not add empty rows;
- do not repeat the bug title inside Issue;
- keep wording compact enough to scan but do not delete material meaning.

## Large-report index

A separate issue index is useful only when there are 7 or more visible issues.

Index columns:

```text
No. | Severity | Issue
```

For 1–6 bugs, do not duplicate the report with an index.

## Adaptive density

```text
0 issues
→ header + no-open-issues message

1–3 issues
→ standard bug tables

4–6 issues
→ slightly tighter table spacing

7+ issues
→ compact Issue Index + compact bug tables
```

These thresholds affect presentation only. They must never merge, split, invent, or remove bugs.

## Hidden by default

Do not show in client Word/PDF:

- canonical Bug ID;
- Category;
- Found By;
- Repair By;
- AI Analysis;
- Relevant Code;
- semantic keys;
- evidence IDs;
- invariant IDs;
- repair-unit IDs;
- validation/orchestration details.

Those remain internal/developer information.

## Word / DOCX

DOCX is the editable file and single layout source.

Requirements:

- use real Word tables;
- keep row labels short and consistent;
- keep table rows from splitting where practical;
- keep a normal-size bug table together when practical;
- use actual paragraph structure inside reproduction cells;
- keep header/footer minimal;
- use compact page margins;
- use Aptos with common fallbacks;
- do not simulate tables with tabs or spaces.

## PDF

PDF must be converted from the generated DOCX.

There is no independent PDF content renderer.

This guarantees:

```text
same wording
same table structure
same visual hierarchy
```

between Word and PDF.

## Pagination

Preferred behavior:

- never orphan a bug-table header from its body;
- never split a single table row across pages;
- move a normal-size table to the next page rather than leaving only one row behind;
- allow a genuinely long issue table to continue naturally if it cannot fit on one page;
- do not force one bug per page.

The goal is density without losing context.

## Visual language

Use a restrained MIVUBI document system:

- navy = table headers / primary hierarchy;
- blue = row labels and information;
- amber = emphasis;
- green = fixed status when intentionally shown;
- light neutral = label/background support;
- white = reading surface.

Severity must always be written as text. Color is secondary.

## Typography

Recommended:

- map title: about 20 pt;
- bug title: about 10 pt, bold;
- body/value cells: about 9–9.5 pt;
- label cells: about 8–8.5 pt;
- footer/legend: about 7.5–8 pt.

Avoid oversized report titles that consume page space without improving comprehension.

## User-side quality test

Before considering a document good, verify:

### 5-second test

Without reading details, can the reader identify:

- map;
- version;
- issue count;
- highest severity?

### 15-second test

Can the reader scan the bug tables and identify which issues need attention first?

### Single-bug test

Can one bug be understood without reading another bug or any source code?

### Space-efficiency test

Is page area being spent on useful bug information rather than oversized headings, wide label columns, or repeated sections?

### Action test

Can a tester reproduce the bug from the table alone?

### Duplication test

Is the same information repeated in another section without adding navigation value?

If duplication does not improve navigation, remove it.

## Golden reference

Regression references:

```text
fixtures/golden-tester-report-v2.json
fixtures/golden-client-document-v1.json
```

The client fixture is projection/design evidence only. Bug Report V2 remains canonical.

## Non-goals

Do not add:

- HTML renderer;
- Vite publication flow;
- Google API publishing;
- separate PDF renderer;
- multiple themes;
- custom document editor;
- decorative cover pages;
- dashboards;
- technical appendices by default.

The target is a compact professional QA document that a client can understand quickly.
