# Bug Tracker UX

## Product surface

The user-facing workflow is intentionally limited to:

```text
AUDIT → REPORT → FIX
```

The tracker begins at **REPORT**. It must not expose internal audit pipelines, proof systems, caches, task graphs, or diagnostic orchestration.

## Entry

The landing view presents two equal report sources:

```text
Open from GitHub
Import JSON
```

Neither source changes the Bug Report V2 contract.

### GitHub

Use when the report already exists in `bug-reports/`.

```text
Report List → Open Report → Fix → Save
```

### File

Use when the report is supplied manually.

```text
Import JSON → Fix → Export JSON
```

An imported file may later be explicitly saved to GitHub. A GitHub report may always be exported as JSON.

## Workspace hierarchy

The report workspace has four visual levels:

1. **Identity** — map name and versions.
2. **Progress** — fixed count and Repair By.
3. **Bug list** — checkbox, severity, ID, title, secondary metadata.
4. **Bug detail** — problem, expected, observed, reproduction, AI analysis, relevant code, suggested fix, must preserve.

Users should understand the first three levels without opening bug detail.

## List behavior

Default ordering is deterministic:

```text
Blocker → Major → Minor → Bug ID
```

Default view is `Not Fixed` when a report contains unfinished bugs; otherwise `All`.

Available filters stay intentionally small:

- All / Not Fixed / Fixed
- Severity
- Search

Do not add category, Found By, owner, date, confidence, or workflow filters until real report volume proves they are needed.

## Bug row

Collapsed rows show only:

```text
[checkbox]  BUG-ID · Title             Severity
            Category · Found By
```

The checkbox is a progress guard. It is not a workflow status.

## Bug detail

Expanded order is fixed:

```text
Problem
Expected
Observed
Reproduction
AI Analysis
Relevant Code
Suggested Fix
Must Preserve
```

Fact precedes AI interpretation. This reduces anchoring on AI analysis.

## Persistence

The UI always knows its current source, but source is never written into Bug Report V2.

### File source

Primary persistence action:

```text
Export JSON
```

Optional secondary action:

```text
Save to GitHub
```

### GitHub source

Primary persistence action:

```text
Save
```

Secondary action:

```text
Export JSON
```

GitHub authentication must stay server-side or use an approved authenticated integration. Never place a long-lived GitHub token in browser code.

## Save safety

GitHub mode must show only compact persistence feedback:

```text
Saved
Saving…
Save failed
Unsaved changes
```

These are UI persistence states, not bug workflow states and are never persisted in Bug Report V2.

Leaving a dirty report must ask for confirmation.

## Keyboard and density

Desktop behavior should prioritize fast scanning:

- `/` focuses search.
- `Esc` clears search or closes the current expanded detail where practical.
- Checkbox targets must remain large enough to click without opening the detail row.
- Do not hide severity behind hover or menus.
- Do not require a modal for routine Fixed changes.

Keyboard support follows the same productivity principle used by mature issue trackers, but only shortcuts with repeated value should be added.

## Visual principles

- Dense, not cramped.
- Dark neutral surface; severity is the strongest color signal.
- Fixed bugs remain visible but visually reduced.
- Blocker must scan before secondary metadata.
- One primary action per persistence source.
- No dashboard charts unless report volume later demonstrates a real need.

## Explicit non-goals

Do not add:

- workflow boards;
- per-bug assignment;
- comments;
- verification;
- approval;
- repair forms;
- dashboards;
- activity feeds;
- generic custom fields;
- mandatory notes when checking Fixed.

The tracker is a focused repair handoff tool, not a general project-management product.
