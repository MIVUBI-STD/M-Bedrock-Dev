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

```text
Map Name — Bug Report
Map Version: <map version>
Tested Version: Minecraft Education <exact tested version>

Open Issues: <count>
Blocker: <count> · Major: <count>
```

Then render one compact two-column table per bug:

| #1 · BLOCKER | Match cannot restart |
|---|---|
| **Issue** | Player-visible gameplay problem + impact. |
| **Bug Trigger (In-Game)** | Exact tester actions and visible wrong result. |
| **Solution** | Supported change, when available. |

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

Visible bugs are deterministic:

```text
Blocker → Major → Minor (when explicitly included) → Bug ID
```

## Ownership

- Bug Report V2: source of truth.
- `COPY.md`: wording quality.
- `decision.ts`: reportability and severity policy.
- `projectBugReportPreview()`: structured projection.
- `renderBugReportPreviewMarkdown()`: compact presentation.
- HTML client output: `tooling/bug-report-documents/render.ts`.

Preview never invents or repairs facts.
