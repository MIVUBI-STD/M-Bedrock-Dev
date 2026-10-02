# Bug Report V2 HTML Layout

## Role

Canonical HTML rendering layout for the production report. Report semantics come from `../gameplay-bug-report-v2.md`; this file only defines reader-facing presentation.

## Layout

Client HTML is a projection of approved canonical Bug Report V2 only.

```text
World Bug Report

01 Overview / Metrics
02 Issue Dashboard when useful
03 Severity Guide
04 Confirmed Bug Cards
   - Issue
   - Tester Checklist
   - Observed / Expected
   - Resolution when supported
   - Work Checklist
   - Technical Detail when available
05 Report Scope / Version
```

Needs Validation, Ambiguous, Detection Gaps, and full audit coverage remain upstream in Map Audit Output / chat review and are not rendered as confirmed client bugs.

## Dashboard

Use a compact table:

```text
ID | Gameplay Flow | Severity | Status | Category
```

## Bug card

Each card contains canonical/presentation data that actually exists:

- Bug ID
- Category
- Severity
- Found By as compact metadata
- Issue
- Tester Checklist from Reproduction
- Observed / Expected
- Recommended Resolution when supported
- Work Checklist (presentation-only)
- Technical Analysis when available
- Relevant Code when available
- Must Preserve when available

Do not invent Gameplay Flow, proof ceiling, or audit-only status fields when they are not present in canonical Bug Report V2.

## Coverage section

Show every applicable audit surface as:

- Checked
- Blocked — include reason
- Not Applicable — include reason

Do not imply complete coverage when blocked or Detection Gap surfaces remain.

## Reader rules

- Organize issues by gameplay journey.
- Keep reproduction steps in tester/player language.
- Keep technical evidence separate.
- Do not publish designed behavior as bugs.
- Use clear contrast and compact tables/cards suitable for QA handoff.


## Presentation layers

Render client HTML in three layers:

```text
1. Scan
   severity + Bug ID + title + category

2. Tester
   issue + tester checklist + observed/expected + resolution + work checklist

3. Engineering
   technical analysis + relevant code + must-preserve
```

Engineering detail may be collapsible on screen but must remain printable.

## Checklist rule

Reproduction steps render as unchecked checkboxes so a tester can work through the issue directly.

Each issue also gets a presentation-only work checklist:

- ☐ Reproduce issue
- ☐ Apply or confirm fix
- ☐ Retest expected behavior
- ☐ Confirm no regression

These controls are not persisted bug state and must not imply completion until a user explicitly checks them.

## Dashboard rule

Show a compact issue dashboard for reports with three or more visible issues:

```text
# | Bug ID | Severity | Category | Issue
```

Do not invent Gameplay Flow when canonical flow metadata is absent.

## Technical detail rule

Do not flatten multiline Technical Analysis. Preserve headings, lists, constraints, and verification steps with whitespace-aware rendering.

HTML must expose Bug ID and category on each card. Found-by may appear as compact metadata rather than a primary visual field.
