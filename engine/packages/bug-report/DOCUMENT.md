# Bug Report Client HTML Contract

This file owns the HTML presentation grammar for client-facing bug reports.

Bug Report V2 owns facts. HTML owns only how those facts are presented clearly.

## Reader goal

A client or tester should understand, in this order:

1. which map/version is being reviewed;
2. how many gameplay-relevant issues are open;
3. which issues need attention first;
4. what the player experiences;
5. how to reproduce it using a checkable in-game path;
6. what was observed versus expected;
7. what work remains to fix/retest;
8. technical/root-cause detail only when needed.

## Reportability boundary

Default client output is intentionally strict.

```text
grounded design contradiction
+ player-visible gameplay impact
+ tester-verifiable in-game trigger
+ Blocker or Major severity
→ visible in default HTML
```

Do not surface by default:

- designed behavior;
- ambiguous intent;
- technical anomalies with no player-visible consequence;
- cosmetic or limited Minor issues;
- internal metadata mismatches that do not affect play.

Minor issues remain canonical when legitimately recorded and can be included explicitly.

## Issue wording

`Issue` must describe what the player experiences.

Good:

```text
After retry, the enemy flag is missing and the objective cannot be completed.
```

Bad:

```text
A race condition between reset callbacks leaves stale flag state.
```

Technical cause belongs in AI Analysis / developer detail, not the client Issue.

## Severity

### Blocker

Use only when the player cannot normally continue, the objective cannot be completed, the match cannot start, the game crashes/freezes, or recovery requires leaving/restarting outside normal gameplay.

### Major

Use when a core mechanic, important player state, or fairness is materially wrong but the game can still continue or recover through normal play.

### Minor

Use for limited player-visible defects that do not materially affect core gameplay. Hidden from default HTML.

## Structure

```text
Map header
Map Version | Tested Version | Open Issues | Severity

Issue Dashboard (3+ visible issues)
Bug ID | Severity | Category | Issue

Bug 01
Issue
Tester Checklist
Result (Observed + Expected)
Resolution, when supported
Work Checklist
Technical Analysis / Relevant Code / Must Preserve, when available

Bug 02
...
```

Reproduction and work checkboxes are presentation-only aids. They are not canonical bug state.

Each input report represents one map. One generated HTML therefore corresponds to one map and forms a natural printable page/report unit.

## HTML requirements

- self-contained file;
- inline CSS;
- no JavaScript requirement;
- no network assets;
- responsive layout;
- print-safe A4 CSS;
- bug cards should avoid page breaks where practical;
- severity must always be written as text;
- implementation details stay out of the primary Issue/Tester layer;
- engineering details may appear in a separate collapsible/printable Technical Analysis layer when canonical data exists.

## Authority chain

```text
Bug Report V2
→ projectBugReportClientDocument()
→ reviewBugReportClientDocument()
→ HTML renderer
```

HTML never becomes a second source of truth.

## Non-goals

Do not add:

- DOCX generation;
- LibreOffice conversion;
- Python document dependencies;
- Vite publication flow;
- SaaS rendering;
- decorative cover pages;
- project-management dashboards or a second tracking system;
- a second report schema.

Browser Print may be used for an occasional PDF snapshot, but PDF is not a separately generated canonical report format.
