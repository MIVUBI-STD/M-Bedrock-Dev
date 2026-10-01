# Bug Tracker UX

## Product surface

The current user-facing surface is intentionally limited to:

```text
APPROVED BUG REPORT → READ / INSPECT / EXPORT
```

Repair state remains canonical data for compatibility, but is not part of the primary audit surface. The tracker begins at **BUG REPORT**. It must not expose internal audit pipelines, proof systems, caches, task graphs, or diagnostic orchestration.

## Reader-first contract

The first screen must answer, without opening technical detail:

1. What is broken?
2. How severe is it?
3. How can a tester trigger it in-game?
4. What supported solution exists?
5. How many open issues remain?

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
Report List → Open Report → Read / Inspect → Export
```

### File

Use when the report is supplied manually.

```text
Import JSON → Read / Inspect → Export
```

Imported files are inspection/export inputs only. They are never promoted to canonical GitHub state by this UI. Canonical creation belongs to the approval-gated engine workflow.

## Workspace hierarchy

The report workspace has four visual levels:

1. **Identity** — map name, Map Version, and exact Minecraft Education Tested Version.
2. **Signal** — Open Issues plus Blocker/Major counts by default.
3. **Bug block** — preview number, severity, title, Issue, Bug Trigger (In-Game), and Solution.
4. **Bug detail** — Expected, Observed, Technical Analysis, Relevant Code, and Must Preserve.

A reader should understand the problem, in-game trigger, and supported solution before opening technical detail.

## List behavior

Default ordering is deterministic:

```text
Blocker → Major → Bug ID
```

Minor is detail-on-demand only when explicitly requested.

Primary audit view shows open bugs only.

Available controls stay intentionally small:

- Severity
- Search

Search covers tester-facing content: Bug title, Issue, Bug Trigger (In-Game), Solution, and Severity.

Do not add Fixed state, Category, Found By, owner, date, confidence, or workflow filters to the audit surface.

## Bug block

The reader-facing scan order is:

```text
# + Severity · Bug title
Issue
Bug Trigger (In-Game)
Solution
```

Bug Trigger must be player-facing and executable entirely inside Minecraft. Category, Found By, code analysis, and internal IDs are secondary and must not compete with this scan path.

## Bug detail

Expanded order is fixed:

```text
Expected
Observed
Technical Analysis
Relevant Code
Must Preserve
```

Bug Trigger (In-Game) stays in the primary scan block rather than being repeated in detail.

Problem/Issue, Bug Trigger (In-Game), and supported Solution belong in the scan layer, not buried in expanded detail.

Fact precedes technical interpretation. Empty sections are omitted.

## Density rules

Do not define separate copy limits in the UI. Use `engine/packages/bug-report/COPY.md`.

UI-specific density rules:

- Solution is shown only when Suggested Fix exists.
- Bug Trigger (In-Game) is always visible for tester-ready bugs.
- Technical detail is subordinate to the tester-facing bug block.
- Fixed bugs are excluded from the current audit surface.

## Compatibility handoff quality

Schema-valid does not automatically mean handoff-ready.

Older, imported, or externally authored reports may be opened when they are structurally valid even if they do not satisfy the current tester-readiness and copy-quality gates.

When handoff-quality issues exist:

- show a compact `Compatibility report — not handoff-ready` warning;
- list the specific readiness and wording gaps;
- keep read and Export JSON available;
- keep canonical GitHub creation unavailable from the file-import path;
- do not mutate or silently rewrite legacy content;
- do not hide missing Bug Trigger or technical-support requirements.

This keeps compatibility separate from promotion quality.

## Persistence

The UI always knows its current source, but source metadata is never written into Bug Report V2.

### File source

Available action:

```text
Export JSON
```

Canonical GitHub creation is intentionally unavailable from imported files because approval belongs to the discussion/review boundary, not the presentation UI.

### GitHub source

Available action:

```text
Export JSON
```

The audit surface does not edit repair ownership or Fixed state, so there is no dormant GitHub Save action.

GitHub authentication must stay server-side or use an approved authenticated integration. Never place a long-lived GitHub token in browser code.

## Keyboard and density

Desktop behavior should prioritize fast scanning:

- `/` focuses search.
- `Esc` clears search or closes the current expanded detail where practical.
- Do not hide severity behind hover or menus.
- Bug Trigger numbered steps must remain readable without horizontal scrolling.

Keyboard support follows the same productivity principle used by mature issue trackers, but only shortcuts with repeated value should be added.

## Visual principles

- Dense, not cramped.
- Dark neutral surface; severity is the strongest color signal.
- Issue and Solution are stronger than metadata.
- Open bugs only on the primary audit surface.
- Blocker must scan before secondary metadata.
- One clear persistence action set per source.
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

The tracker is a focused tester-facing bug handoff surface, not a general project-management product.

## Report list priority signal

GitHub report rows may show the number of unfinished Blocker bugs. This value is derived from report content and is not persisted separately.

Reports with unfinished Blockers scan before ordinary unfinished reports.


