# Bug Report Client Document Contract

This file owns the client-facing document grammar for Google Docs and PDF.

Bug Report V2 owns facts. This contract owns how those facts are presented to clients and non-technical readers.

## Purpose

The document must let a reader answer, quickly and without source-code knowledge:

1. What map/version was tested?
2. How many confirmed issues are included?
3. Which issues are most severe?
4. What is wrong in gameplay?
5. How can the issue be reproduced in-game?
6. What was observed?
7. What should have happened?
8. What supported resolution is recommended, when available?

The document is not a diagnostic dump and is not a developer implementation report.

## Authority chain

```text
Bug Report V2
→ projectBugReportClientDocument()
→ reviewBugReportClientDocument()
→ Google Docs renderer
→ PDF export
```

Google Docs and PDF consume the same client document projection. They must not independently rewrite, infer, or enrich bug facts.

## Reader

Primary reader:

- client;
- producer;
- QA stakeholder;
- non-technical project reviewer.

Secondary reader:

- developer who needs a fast, gameplay-first handoff.

Technical implementation details remain on-demand and outside the default client document.

## Document order

```text
Report Overview
→ Issue Summary
→ Severity Guide
→ Issue Details
```

Do not insert technical-analysis sections before issue details.

## Report Overview

Show:

- MIVUBI / document identity;
- Bug Report;
- map name;
- map version;
- exact tested Minecraft version;
- short subtitle: “Confirmed gameplay issues and testing summary”;
- visible issue count;
- Blocker / Major / Minor counts.

Use concise explanatory copy. Do not add generic project-management metadata, internal IDs, repair ownership, schema names, or implementation status.

## Issue Summary

Render one compact index row per visible issue:

```text
No. | Severity | Issue
```

Optional Status may be shown only when fixed issues are intentionally included in the published document.

The index is for scanning. Do not repeat full Issue or reproduction text here.

## Severity Guide

Use plain-language meaning:

- Blocker — prevents normal progression or makes the affected gameplay unusable.
- Major — materially affects gameplay, state, fairness, or reliability.
- Minor — limited issue that does not prevent normal gameplay.

Severity must always be communicated with text. Color is supportive only.

## Issue Details

One issue block follows this order:

```text
Number + Severity
Title
Issue
How to Reproduce
Observed
Expected
Recommended Resolution — only when supported
```

### Title

Use the canonical bug title.

It should describe the visible gameplay failure, not the code mechanism.

### Issue

Explain what is wrong and why it matters in gameplay.

### How to Reproduce

Use numbered, player-facing steps.

Each step must stand on its own line.

The final step must make the wrong result observable.

### Observed

State the actual wrong behavior.

### Expected

State the intended behavior.

### Recommended Resolution

Present only canonical Suggested Fix.

If no supported resolution exists, omit the section rather than inventing or displaying filler.

## Hidden by default

Do not show in the client document:

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
- validation plumbing;
- cache/orchestration data.

These remain engine/developer context.

## Adaptive density

The document structure is stable, but issue count is data-driven.

Do not add filler to make the report look larger.

Examples:

```text
1 issue
→ overview + compact summary + one issue block

8 issues
→ overview + issue index + issue blocks

20 issues
→ overview + issue index + severity-organized issue blocks
```

Do not split issues into artificial pages merely to match a sample document.

## Adaptive layout thresholds

The renderer consumes `buildBugReportClientLayoutPlan()`; layout thresholds are not duplicated in adapters.

Current rules:

```text
0 issues
→ no Issue Summary table; show no-open-issues result

1 issue
→ no Issue Summary table; go directly to the issue detail

2–3 issues
→ show Issue Summary table; keep overview and details in natural flow

4–7 issues
→ show Issue Summary table; start issue details on a new page

8+ issues
→ same page separation + compact issue-detail rhythm
```

These are density rules, not semantic rules. Do not add filler or split/merge bugs to satisfy them.

## Golden reference

The canonical client-document regression reference is:

```text
fixtures/golden-client-document-v1.json
```

It is a deterministic projection of:

```text
fixtures/golden-tester-report-v2.json
```

The client-document fixture is design/regression evidence only. Bug Report V2 remains the semantic authority.

## Typography and hierarchy

Recommended defaults for Google Docs/PDF:

- body: 10.5–11 pt;
- body line spacing: approximately 1.4–1.5;
- document title: 26–32 pt;
- section headings: 18–22 pt;
- issue title: 13–15 pt;
- use native semantic heading styles;
- keep line length comfortable and avoid overly wide body text.

Preferred font stack follows the established MIVUBI document language:

```text
Aptos
Segoe UI
Arial fallback
```

## Visual language

Use a restrained professional system derived from the M-PRD-Creator visual language:

- navy — primary hierarchy;
- blue — information/accent;
- amber — emphasis;
- green — verified/fixed when shown;
- neutral gray — supporting metadata;
- white — primary reading surface.

Do not create multiple themes, dark mode, decorative illustration systems, or interactive navigation for the initial document renderer.

## Components

Keep the component vocabulary small:

```text
Cover / Report Header
Metric Summary
Issue Index
Severity Guide
Issue Block
Simple Table
Callout
Footer
```

Do not create new component families unless a real report cannot be represented clearly with these.

## Google Docs rules

Google Docs is the editable client-facing document.

Renderer requirements:

- use semantic Title / Heading 1 / Heading 2 styles;
- use real numbered lists for reproduction steps;
- use real tables only for compact summary/index data;
- avoid large issue-detail tables;
- use page breaks intentionally;
- preserve readable spacing around headings and issue blocks;
- keep headers/footers minimal;
- do not simulate layout with spaces or repeated tabs.

The Google Doc is a projection, not canonical bug state.

## PDF rules

PDF is the published snapshot of the same document.

Prefer export from the generated Google Doc so Docs and PDF do not drift.

Pagination requirements:

- never leave an issue heading alone at the bottom of a page;
- keep issue title and Issue paragraph together when possible;
- keep “How to Reproduce” with at least the first steps;
- avoid splitting short Observed/Expected pairs unnecessarily;
- do not let footers overlap content;
- use text labels in addition to severity colors.

## Accessibility

The structure must remain understandable without color.

Use semantic headings, lists, and tables.

Do not encode meaning through decoration alone.

If images/screenshots are introduced later, they require meaningful alt text or captions and must be evidence-supporting rather than decorative.

## Quality boundary

`reviewBugReportClientDocument()` validates structural readability and projection consistency.

It must not become another copywriting engine.

Canonical wording quality remains owned by `COPY.md` and tester readiness by `report-readiness.ts`.

## Non-goals

Do not add:

- an HTML renderer merely for parity with M-PRD-Creator;
- a second PDF-specific content model;
- per-client themes;
- interactive sidebar/navigation;
- a custom rich-text editor;
- another report database;
- duplicated technical appendices by default.

The target is one clear client document model, one editable Google Doc projection, and one matching PDF snapshot.
