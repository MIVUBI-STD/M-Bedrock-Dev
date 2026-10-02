# Bug Report V2 HTML Layout

## Role

Canonical HTML rendering layout for the production report. Report semantics come from `../gameplay-bug-report-v2.md`; this file only defines reader-facing presentation.

## Layout

```text
World Bug Report

01 Overview
02 Gameplay Flow
03 Game Design Reference
04 Bug Dashboard
05 Confirmed Bugs
06 Needs Validation
07 Ambiguous
08 Detection Gaps
09 Reproduction Guide
10 Audit Coverage
```

## Dashboard

Use a compact table:

```text
ID | Gameplay Flow | Severity | Status | Category
```

## Bug card

Each card contains:

- Bug ID
- Category
- Gameplay Flow
- Severity when Confirmed
- Status
- Issue
- Player Impact
- How To Reproduce
- Expected Behavior
- Actual Behavior
- Evidence
- Proof Ceiling

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
