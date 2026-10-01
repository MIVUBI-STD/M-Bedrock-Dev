# Bug Report Preview Contract

Canonical Bug Report V2 owns facts. Preview owns readability.

Default ChatGPT presentation is **table-first**. The goal is minimum vertical scroll while preserving the repair signal.

## Default compact preview

Show one report signal line followed by one compact table:

```text
Map · Version · Tested · Repair
Open · Blocker · Major · Minor · Fixed
```

| Severity | Bug | Issue | Action |
|---|---|---|---|

Rules:

- default scope is open bugs only;
- order is Blocker → Major → Minor → Bug ID;
- `Bug` contains ID + short title;
- `Issue` is canonical Problem;
- `Action` is canonical Suggested Fix;
- when Suggested Fix is absent, show `—`;
- do not add Expected, Observed, Reproduction, Technical Analysis, Relevant Code, or Must Preserve to the default table;
- do not create one section per bug in default preview;
- do not dump JSON.

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

## Table density

Keep the table readable:

- no Category column by default;
- no Found By column by default;
- no Status column when only open bugs are shown;
- no separate ID column; combine ID + title in `Bug`;
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
