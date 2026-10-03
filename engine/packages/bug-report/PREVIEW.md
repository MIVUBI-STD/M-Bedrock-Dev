# Bug Report Preview Contract

Canonical Bug Report V2 owns facts. Preview owns readability.

## Default scope

Normal preview is intentionally gameplay-focused:

- open issues only;
- Blocker and Major only;
- Minor issues hidden unless explicitly requested;
- designed behavior, ambiguous intent, technical-only anomalies, and non-player-impact findings never enter the tester-facing bug list.

The goal is to show problems that materially affect play, not every unusual implementation detail.

## Default compact preview

ChatGPT default preview is intentionally issue-only:

```text
Map Name — Bug Report
Map Version: <map version>
Tested Version: <exact tested version>

Open Issues: <count>
Blocker: <count> · Major: <count>

# | Severity | Category | Issue
```

Do not show Fixed checkboxes, How to Reproduce steps, solution, Expected/Observed, or Technical Analysis in the default chat preview.

Those operational details belong in HTML or explicit full-detail mode.

## Issue rule

Issue must describe what the player experiences.

Do not put implementation causes such as callbacks, event handlers, race conditions, dynamic properties, scripts, or architecture in Issue. Those belong in Technical Analysis.

## Severity rule

Blocker means the player cannot normally continue, the objective cannot be completed, the match cannot start, the game crashes/freezes, or recovery requires leaving/restarting outside normal gameplay.

Major means core gameplay, important player state, or fairness is materially wrong but the session can still continue or recover through normal play.

Minor means limited player-visible impact and is hidden by default.

## Trigger rule

Every visible bug must have a tester-verifiable in-game path. The final step must state the wrong visible result.

Do not ask testers to inspect code, logs, variables, scripts, source files, or architecture.

## Detail on demand

Use `includeMinor` only when the user explicitly asks for small/polish issues.

Use full mode only when root-cause or implementation detail is requested.

## Ordering

When canonical gameplay-flow ordering metadata is available, use gameplay journey first and severity within that flow.

When that metadata is absent, use the deterministic fallback:

```text
Blocker → Major → Minor (when explicitly included) → Bug ID
```

Do not infer gameplay order from category or title.

## Ownership

- Bug Report V2: source of truth.
- `COPY.md`: wording quality.
- `decision.ts`: reportability and severity policy.
- `projectBugReportPreview()`: structured projection.
- `renderBugReportPreviewMarkdown()`: compact presentation.
- HTML client output: `tooling/bug-report-documents/render.ts`.

Preview never invents or repairs facts.

## Proposed Bug Set review

Before canonical Bug Report V2 or HTML exists, discuss the proposed set in chat.

Use a compact review table:

```text
Proposed Bugs
# | Severity | Player Issue | Contract Violated | Decision
```

Keep the review focused on player-visible Blocker/Major candidates. Do not show technical root-cause detail unless requested.

When useful, show two short companion sections:

- Suppressed as Game Design — candidates rejected because current intent explicitly permits the behavior.
- Needs Discussion — only material intent or evidence ambiguity that blocks a responsible decision.

Review decisions are explicit:

- approve — enters the approved bug set;
- reject — excluded, with concise reason;
- needs-discussion — blocks publication until resolved.

Do not generate canonical Bug Report V2 or HTML while any proposed bug has no decision or remains needs-discussion. If all proposed bugs are rejected, stop without generating a report artifact.


## Full-detail formatting

Full mode is opt-in. It may show reproduction, Observed/Expected, Solution, Technical Analysis, Relevant Code, and Must Preserve when the user explicitly asks for detail.

Chat full mode still does **not** use interactive checklist semantics. HTML owns the per-bug Fixed checkbox used during retest.

Preserve Technical Analysis line breaks and headings; do not collapse structured engineering analysis into one paragraph.
