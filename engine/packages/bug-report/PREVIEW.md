# Bug Report Preview Contract

Canonical Bug Report V2 owns facts. Preview owns readability.

Default ChatGPT presentation is **table-first**. The goal is minimum vertical scroll while preserving the audit signal.

## Default compact preview

Show a compact audit header:

```text
Map Name — Bug Report
Map Version: <map version>
Tested Version: Minecraft Education <exact tested version> (Latest)

Open Issues: <count>
Blocker: <count> · Major: <count> · Minor: <count>
```

Then render **one compact two-column table per bug**:

| #1 · BLOCKER | Match cannot restart |
|---|---|
| **Issue** | Arena keeps the previous session ownership after match end, so a new match cannot start. |
| **Bug Trigger (In-Game)** | 1. Join the arena with 2 players.<br>2. Finish the match normally.<br>3. Return to the lobby.<br>4. Start the same arena again.<br>5. Confirm the new match does not start. |
| **Solution** | Clear arena session ownership during cleanup so the arena becomes available again. |

Rules:

- default scope is newly found/open bugs only;
- order is Blocker → Major → Minor → canonical Bug ID;
- preview number is simple and local: `#1`, `#2`, ...;
- canonical Bug ID stays hidden in normal preview;
- keep each bug in one local two-column table;
- `Issue` must answer **what is wrong + gameplay impact**;
- `Bug Trigger (In-Game)` must answer **exactly what the tester does in Minecraft + what wrong result to observe**;
- render each trigger step on its own numbered line; never join steps with arrows or long inline chains;
- `Solution` must answer **what should be changed to resolve the issue**;
- when Suggested Fix is absent, show `—`;
- do not show Category, Found By, Repair By, Fixed progress, Expected, Observed, Technical Analysis, Relevant Code, or Must Preserve in normal preview;
- do not dump JSON;
- do not use wide multi-column tables for the normal ChatGPT preview.

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

Suggested Fix may still populate the table's Solution column when the confirmed report already contains supported repair direction, but it is not workflow ownership or repair status.

## Detail on demand

Only expand a bug when the user asks for a specific bug, root cause, reproduction, fix implementation, or full detail.

For one selected bug, use this order:

```text
Severity + ID + Title
Issue
Bug Trigger (In-Game)
Solution when supported
Expected
Observed
Technical Analysis
Relevant Code
Must Preserve
```

Omit empty fields.

## Modes

### summary

Use the same two-column bug blocks. Bug Trigger (In-Game) remains visible because tester verification is part of the bug-finding handoff. Solution may be omitted when the user asks only for issue discovery.

### standard — default

Use the full two-column bug block:

```text
# + Severity | Bug
Issue | ...
Bug Trigger (In-Game) | ...
Solution | ...
```

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

A tester should understand one bug without reading code or jumping to another section.

A ready bug block must answer:

1. **Bug** — what failed?
2. **Issue** — what is wrong in gameplay and what does it affect?
3. **Bug Trigger (In-Game)** — where/when does the tester start, what exact actions do they perform, and what wrong result proves the bug?
4. **Solution** — what change is supported to resolve it?

For Bug Trigger, the tester must not need to ask:

- Where do I start?
- How many players do I need?
- Which phase, team, item, object, or UI do I use?
- What exactly do I press / place / buy / break / enter?
- How do I know the bug actually happened?

Only include context that materially affects reproduction; do not pad steps with obvious navigation.

If Issue or Solution requires Technical Analysis to understand its basic meaning, or Bug Trigger requires source-code knowledge, the bug is not ready for the normal tester-facing preview.

## Table density

- use two columns only;
- keep Bug Trigger steps vertically stacked (`1.`, `2.`, `3.`...) inside the value cell;
- keep labels short and fixed;
- no empty filler columns;
- no duplicate text between Bug, Issue, Trigger, and Solution;
- use `—` only for unavailable Solution;
- never infer or rewrite canonical facts.

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
