# Bug Report

## Current format

`m-bedrock-bug-report/v2` is the canonical bug-tracker format.

User-facing flow:

```text
AUDIT → REPORT → FIX
```

V1 remains import-only compatibility. New reports and exports use V2.

## Canonical vocabulary

Frontend labels must keep the same meaning as persisted V2 fields.

| JSON field | UI label | Meaning |
|---|---|---|
| `mapVersion` | Map Version | Internal map version. |
| `baseVersion` | Base Version | Minecraft version the map was designed for. |
| `testedVersion` | Tested Version | Minecraft version used during the audit/test. |
| `repairBy` | Repair By | One repair owner for the whole report: ChatGPT or Developer. |
| `bugs` | Bugs | Confirmed bugs included in the repair report. |
| `fixed` | Fixed | Per-bug completion checkbox. |
| `severity` | Severity | Blocker, Major, or Minor. |
| `category` | Category | Primary failure category. |
| `foundBy` | Found By | AI or Tester. |
| `problem` | Problem | What is wrong. |
| `expected` | Expected | Intended behavior. |
| `observed` | Observed | What actually happens. |
| `reproduction` | Reproduction | Steps needed to reproduce the bug. |
| `aiAnalysis` | AI Analysis | AI technical interpretation; advisory. |
| `relevantCode` | Relevant Code | Small set of source locations worth inspecting. |
| `suggestedFix` | Suggested Fix | Advisory repair direction. |
| `mustPreserve` | Must Preserve | Behavior that the repair must not break. |

Do not introduce alternate workflow terms such as Open, Closed, Done, Verified, Repair Status, Do Not Break, or Repair With when the persisted V2 field already has a canonical term.

## Repair ownership

A report has one `repairBy` value. Individual bugs cannot have separate repair owners.

Per-bug `fixed` checkboxes exist only to prevent missed bugs and show report progress. Report completion is derived from all bug checkboxes; it is not stored separately.

## Language

All persisted report content and canonical UI labels are English.


## Creation

New reports must be created directly as V2 through `createBugReportV2()`. The creator defaults each bug to `fixed: false` unless an explicit value is supplied and validates the complete report before it can be emitted.

Do not generate V1 and convert it to V2 for new audits. V1 conversion exists only for old saved reports.


## Promotion gate

Internal diagnostics are not bug reports.

A Diagnostic Finding may represent a risk, evidence gap, compatibility warning, or unresolved hypothesis. Do not copy diagnostics directly into developer-facing V2.

New audit output follows:

```text
internal analysis
→ confirmed defect
→ promoteConfirmedBugsToV2()
→ Bug Report V2
```

Only `confirmed-defect` inputs enter the final report.

Promotion quality rules:

- Tester-found confirmed defects require Reproduction.
- AI-found confirmed defects require AI Analysis and Relevant Code.
- Relevant Code stays focused on at most three primary locations.
- Suggested Fix is advisory and requires supporting analysis/code context.
- Root-cause certainty is never required to describe a confirmed defect.
- Candidate, possible, speculative, and insufficient-evidence findings stay internal.

The promotion-only `status` is not persisted in Bug Report V2.

## Output density

Developer-facing report text should answer the minimum useful questions:

```text
What is wrong?
What should happen?
What actually happens?
How can I reproduce it?
Where should I look?
What does the AI analysis suggest?
What must the repair preserve?
```

Do not copy internal proof chains, diagnostic IDs, planner output, confidence scores, cache metadata, or orchestration details into the report.


## Defect confirmation

Defect existence and root-cause proof are separate decisions.

A bug may be confirmed for the developer report even when its exact root cause is not yet proven. Conversely, a suspicious code path, compatibility difference, risk, or evidence gap is not a confirmed bug by itself.

Use `confirmDefectForReport()` before promotion.

A confirmed defect requires:

1. established expected behavior; and
2. one qualifying existence basis.

Qualifying bases:

```text
tester-reproduction
authored-contract-violation
runtime-observation
```

Expected behavior must come from authored intent, an explicit requirement, or an applicable runtime contract.

AI-discovered bugs cannot be confirmed from tester reproduction alone. AI discovery requires direct authored-contract violation or runtime mismatch evidence.

These are not confirmation by themselves:

- Base Version / Tested Version difference;
- static risk;
- correlation;
- evidence gap;
- unresolved hypothesis;
- suspicious topology;
- multiple active root-cause candidates.

Root-cause and repair authorization remain owned by diagnostic/repair reasoning. They do not need to be serialized into Bug Report V2.

The confirmation basis and evidence are internal promotion metadata. They are never persisted in the final report.


## Confirmation routes

All confirmed defects enter the same Bug Report V2 promotion gate, but the evidence route depends on who discovered the defect.

```text
AI runtime mismatch
→ report-confirmation-adapter
→ runtime-observation

AI static authored-contract violation
→ static-report-confirmation-adapter
→ authored-contract-violation

Tester gameplay reproduction
→ tester-report-confirmation-adapter
→ tester-reproduction
```

Tester confirmation is gameplay-only. Tester evidence must not claim code architecture, root cause, or implementation ownership.

AI may later add AI Analysis, Relevant Code, and Suggested Fix to a tester-found bug without changing `Found By: Tester`.

All non-confirmed diagnostic dispositions remain internal.


## Audit-to-report entry point

The orchestrator exposes one high-level path for confirmed defect collection:

```text
buildBugReportFromAuditCandidates(...)
```

It accepts runtime, static, and tester candidates, applies the route-specific confirmation adapters, records rejected candidates with reasons, and sends only confirmed defects into `promoteConfirmedBugsToV2()`.

The collector does not infer or auto-merge duplicate defects. If two observations are believed to represent one bug, grouping must be supported explicitly by the existing grouping rule:

```text
same causal defect
AND same broken invariant
AND same repair unit
```

This prevents accidental deduplication from hiding distinct gameplay failures.

The collector also does not generate bug copy from raw diagnostic messages. Problem, Expected, Observed, AI Analysis, Relevant Code, Suggested Fix, and Must Preserve remain curated report content rather than mechanical diagnostic dumps.


## Canonical confirmed defect model

Confirmed evidence must not jump directly into a V2 bug draft.

The canonical bridge is `ConfirmedDefect`:

```text
confirmation evidence
→ ConfirmedDefect
→ report projection
→ promotion gate
→ Bug Report V2
```

`ConfirmedDefect` owns semantic information used to derive report fields:

- `impact` → Severity through `classifyBugSeverity()`;
- `primaryFailure` → Category through `routeBugFinderCategory()`;
- `semanticKey` → stable Bug ID;
- `expected` → authoritative Expected statement plus evidence IDs;
- `observed` → Observed statement plus evidence IDs;
- `sourceEvidence` → Relevant Code from verified SourceRef paths;
- `brokenInvariantIds` and `repairUnitIds` → semantic grouping identity;
- optional `causalIncidentId` → causal grouping identity.

Callers do not supply Severity, Category, or Bug ID.

Bug IDs are deterministic from map identity plus `semanticKey`, so adding an unrelated defect does not renumber existing bugs.

For the high-level audit-to-report path, AI source evidence is checked against the audited file inventory before V2 promotion.

## Repair-safe report enrichment

The canonical audit path does not accept manually supplied Must Preserve content.

Must Preserve is derived only when repair invariant selection is automatically supported by causal/invariant provenance.

Suggested Fix requires a `DiagnosticRepairDecision`. If the decision remains `observe-only`, Suggested Fix is omitted.

This keeps defect confirmation separate from repair authorization:

```text
defect confirmed
does not imply
repair mechanism proven
```
