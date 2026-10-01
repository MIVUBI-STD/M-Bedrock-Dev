# Bug Report Preview Contract

Canonical Bug Report V2 owns facts. Preview owns readability.

Default ChatGPT presentation is **table-first**. The goal is minimum vertical scroll while preserving the audit signal.

## Default compact preview

Show a compact audit header followed by one compact table:

```text
Map Name — Bug Report
Map Version: <map version>
Tested Version: Minecraft Education <exact tested version> (Latest)

Open Issues: <count>
Blocker: <count> · Major: <count> · Minor: <count>
```

The normal bug-finding preview MUST NOT show repair ownership or fixed-progress metadata. Those belong to a later repair workflow, not the audit preview.

| No. | Severity | Bug | Issue | Action |
|---:|---|---|---|---|

Rules:

- default scope is newly found/open bugs only;
- show `Open Issues` on its own line before the severity breakdown;
- do not show `Repair By`, repair ownership, or `Fixed` progress in normal bug-finding preview;
- always show the exact Minecraft Education version from canonical `testedVersion`;
- format a verified-current audit as `Tested Version: Minecraft Education <version> (Latest)`;
- never display `Latest` without an exact version number;
- `Latest` is a freshness claim: use it only when the audit workflow has verified the official current Minecraft Education version at audit time;
- if freshness cannot be verified, show `Tested Version: Minecraft Education <version>` without `(Latest)`;
- order is Blocker → Major → Minor → Bug ID;
- `No.` is a simple preview row number (`#1`, `#2`, ...);
- `Bug` contains only the short human-readable title;
- canonical Bug ID stays internal in default preview and is shown only in detail/full mode;
- `Issue` is canonical Problem and must answer **what is wrong + impact**;
- `Action` is canonical Suggested Fix and must answer **what should be changed**;
- when Suggested Fix is absent, show `—`;
- do not add Expected, Observed, Reproduction, Technical Analysis, Relevant Code, or Must Preserve to the default table;
- do not create one section per bug in default preview;
- do not dump JSON.

## Tested-version truth

`testedVersion` is the exact Minecraft Education build used for the audit.

For a new audit intended to run on the latest Education release:

1. verify the current version from an official Minecraft Education source;
2. run the audit on that exact build;
3. store that exact number in `map.testedVersion`;
4. show `(Latest)` only when steps 1–3 are true.

Do not hardcode a version number or a floating `Latest Education` label in presentation code.

## Audit-phase boundary

Normal preview represents **bug finding**, not repair execution.

Do not surface these by default:

- Repair By;
- repair owner;
- fixed count;
- repair workflow status;
- implementation progress.

Suggested Fix may still populate the table's Action column when the confirmed report already contains supported repair direction, but it is not workflow ownership or repair status.

## Detail on demand

Only expand a bug when the user asks for a specific bug, root cause, reproduction, fix implementation, or full detail.

For one selected bug, use this order:

```text
Severity + ID + Title
Issue
Action when supported
Expected
Observed
Reproduction
Technical Analysis
Relevant Code
Must Preserve
```

Omit empty fields.

## Modes

### summary

Compact table with:

- Severity
- Bug
- Issue
- Action

### standard — default

Same compact table as summary.

The standard mode intentionally does not expand evidence fields. This keeps normal ChatGPT previews short and scannable.

### full

Use only on explicit request.

Full mode may include the compact table first, then expanded details for the requested bug set.

## Ordering

Visible bugs are deterministic:

```text
Blocker → Major → Minor → Bug ID
```

Open bugs are the default scope. Fixed bugs appear only when explicitly requested or when historical context is required.

## Reader test

A reader should be able to cover the Issue and Action columns only and still understand the bug and the supported next action.

Good:

| No. | Severity | Bug | Issue | Action |
|---:|---|---|---|---|
| #1 | BLOCKER | Match cannot restart | Arena keeps the previous session ownership after match end, so a new match cannot start. | Clear arena session ownership during cleanup so the arena becomes available again. |

Bad:

| No. | Severity | Bug | Issue | Action |
|---:|---|---|---|---|
| #1 | BLOCKER | Match issue | There may be an issue with cleanup. | Investigate and fix the issue. |

If the Issue or Action requires Technical Analysis to understand its basic meaning, the copy is not ready for the default preview.

## Table density

Keep the table readable:

- no Category column by default;
- no Found By column by default;
- no Status column when only open bugs are shown;
- do not expose canonical Bug ID in the default table;
- use a simple `No.` column for quick reference within the current preview;
- no duplicated text between Bug, Issue, and Action;
- use `—` for unavailable Action;
- never infer or rewrite canonical facts.

If a report is unusually large, still preserve one-row-per-bug rather than expanding cards.

## Wording dependency

Preview does not rewrite canonical bug copy.

All new-report wording rules and density limits are owned by `COPY.md` and enforced by `copy-quality.ts`. Presentation code may normalize whitespace for display, but must not paraphrase or repair report facts.

## Hidden internals

Normal preview must not show:

- schema IDs;
- semantic keys;
- evidence graph IDs;
- repair-unit IDs;
- proof routing;
- diagnostic orchestration;
- cache state.

## Ownership

- Bug Report V2: source of truth.
- `COPY.md`: wording quality.
- `projectBugReportPreview()`: structured projection.
- `renderBugReportPreviewMarkdown()`: compact table rendering.
- ChatGPT / CLI / UI may consume the projection.
- Preview output is never persisted as a second report format.
