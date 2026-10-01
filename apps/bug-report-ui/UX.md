# Bug Tracker UX

## Product surface

The user-facing workflow is intentionally limited to:

```text
AUDIT → REPORT → FIX
```

The tracker begins at **REPORT**. It must not expose internal audit pipelines, proof systems, caches, task graphs, or diagnostic orchestration.

## Reader-first contract

The first screen must answer, without opening technical detail:

1. What is broken?
2. How severe is it?
3. What supported action should be taken?
4. How many open issues remain?

Canonical Bug Report V2 owns facts. Presentation owns density and ordering.

Presentation hierarchy is owned by `engine/packages/bug-report/PREVIEW.md`. Wording quality is owned by `engine/packages/bug-report/COPY.md`.

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
2. **Signal** — open count and Blocker/Major/Minor counts.
3. **Bug list** — checkbox, severity, ID, title, short issue/solution signal.
4. **Bug detail** — expected, observed, reproduction, technical analysis, relevant code, must preserve.

A reader should understand the problem and next supported action before opening bug detail.

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

Collapsed rows prioritize the repair signal:

```text
[checkbox]  BLOCKER  BUG-ID · Short title
            Issue summary
            Solution summary, when supported
```

Category and Found By are secondary metadata and must not compete with Issue or Solution.

The checkbox is a progress guard. It is not a workflow status.

## Bug detail

Expanded order is fixed:

```text
Expected
Observed
Reproduction
Technical Analysis
Relevant Code
Must Preserve
```

Problem/Issue and supported Action belong in the scan layer, not buried in expanded detail.

Fact precedes technical interpretation. Empty sections are omitted.

## Density rules

Do not define separate copy limits in the UI. Use `engine/packages/bug-report/COPY.md`.

UI-specific density rules:

- Solution is shown only when Suggested Fix exists.
- Technical detail is subordinate to repair signal.
- Fixed bugs are visually reduced and hidden by default when open bugs exist.

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
- Issue and Solution are stronger than metadata.
- Fixed bugs remain available but visually reduced.
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

## GitHub conflict safety

GitHub persistence uses optimistic concurrency. When a report is opened, its source revision is retained outside Bug Report V2. Save succeeds only if the GitHub report still has the same revision.

If the remote report changed, the UI shows `Changed on GitHub` and must not overwrite the remote report. Local edits remain available for Export JSON. Reloading the GitHub version is explicit.

Source revision is persistence metadata and must never be written into Bug Report V2.

## Report list priority signal

GitHub report rows may show the number of unfinished Blocker bugs. This value is derived from report content and is not persisted separately.

Reports with unfinished Blockers scan before ordinary unfinished reports.
