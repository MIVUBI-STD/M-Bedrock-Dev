# Bug Report

## Current format

`m-bedrock-bug-report/v2` is the canonical bug-tracker format.

User-facing flow:

```text
AUDIT → REPORT → FIX
```

V1 remains import-only compatibility. New reports and exports use V2.

## Contract ownership

The bug-report package keeps one authority per concern:

| Concern | Authority |
|---|---|
| Persisted data semantics | `v2.ts` + V2 schema |
| New-report wording quality | `COPY.md` + `copy-quality.ts` |
| AI Bug Trigger authoring | `bug-trigger.ts` |
| Tester-ready report gate | `report-readiness.ts` |
| Human / ChatGPT presentation | `PREVIEW.md` + `preview.ts` |
| Confirmation / promotion semantics | this package's confirmation and promotion modules |

Other UI, agent, and workspace documents reference these contracts. They must not redefine them.

## Layer boundaries

Keep report information in three conceptual layers even though Bug Report V2 remains one canonical persisted format.

| Layer | Purpose | Typical data |
|---|---|---|
| Internal Detection | Establish whether a defect exists and why. Never shown in the normal tester preview. | diagnostics, evidence IDs, semantic keys, invariant IDs, classification signals, confirmation basis |
| Tester-Facing Report | Let a tester understand and reproduce the gameplay failure without reading code. | Bug title, Issue, Severity, Bug Trigger (In-Game), supported Solution |
| Repair Detail | Give implementation context only when requested or during repair work. | Expected, Observed, Technical Analysis, Relevant Code, Must Preserve, repair decision context |

Rules:

- A defect can be **confirmed internally** without yet being **tester-ready**.
- Tester-ready promotion additionally requires the shared readiness gate in `report-readiness.ts`.
- Bug Trigger is gameplay-only. Technical evidence never substitutes for an in-game trigger.
- Solution is presentation of canonical `suggestedFix`; it is allowed only when repair support exists.
- Repair Detail must not leak into the normal audit preview.
- Internal Detection data must never be copied into report prose merely to make the report look more complete.

The intended flow is:

```text
Internal Detection
→ Confirmed Defect
→ Tester Readiness
→ Bug Report V2
→ Tester Preview

                     ↘ Repair Detail on demand
```

## Canonical vocabulary

Persisted field names and presentation labels must keep the same meaning, but they are not always the same wording.

`BUG_REPORT_V2_LABELS` describes canonical/storage field labels. Tester-facing presentation is owned by `PREVIEW.md`.

| JSON field | Canonical field label | Meaning |
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
| `reproduction` | Bug Trigger (In-Game) | Tester-facing steps that trigger and visibly prove the bug. |
| `aiAnalysis` | AI Analysis | AI technical interpretation; advisory. |
| `relevantCode` | Relevant Code | Small set of source locations worth inspecting. |
| `suggestedFix` | Solution | Advisory repair direction shown to the reader. |
| `mustPreserve` | Must Preserve | Behavior that the repair must not break. |

Tester-facing display mappings are intentionally limited to:

```text
Problem       → Issue
Reproduction  → Bug Trigger (In-Game)
Suggested Fix → Solution
```

Do not create additional synonyms for these concepts. Do not introduce alternate workflow terms such as Open, Closed, Done, Verified, Repair Status, Do Not Break, or Repair With when the persisted V2 field already has a canonical term.

## AI Bug Trigger authoring

AI-discovered defects do not author canonical `reproduction[]` directly.

The AI report route uses an evidence-bound `BugTriggerDraft`:

```text
startingCondition
+ player actions
+ observableFailure
+ evidenceIds
→ compileBugTrigger()
→ canonical reproduction[]
```

Rules:

- the compiler only formats facts supplied to it; it does not infer missing gameplay steps;
- `evidenceIds` must belong to the same confirmed-defect evidence universe;
- if the gameplay start state, action path, or visible failure is not grounded, leave Bug Trigger unavailable;
- an AI defect may remain confirmed internally while `nextEvidenceNeed = tester-reproduction`;
- raw AI `reproduction[]` is not an accepted authoring path;
- tester-origin reproduction remains gameplay evidence supplied by the tester route.

This prevents technical diagnosis from being mechanically rewritten into invented gameplay instructions.

## Human / ChatGPT preview

Bug Report V2 remains the only persisted source of truth.

Human-readable and ChatGPT presentation uses the derived preview surface defined in `PREVIEW.md`:

```text
Bug Report V2
→ projectBugReportPreview()
→ renderBugReportPreviewMarkdown()
→ human / ChatGPT
```

Default audit preview is open-bugs-only and table-first:

```text
Map Version
Tested Version: Minecraft Education <exact tested version>

Open Issues
Blocker · Major · Minor

# + Severity | Bug title
Issue | gameplay problem + impact
Bug Trigger (In-Game) | exact tester actions + visible wrong result
Solution | supported change
```

Normal bug-finding preview does not show Repair By, Fixed progress, Category, Found By, or technical detail.

The exact tested build comes from `map.testedVersion`. The label `(Latest)` may be added only when the audit workflow has verified the official current Minecraft Education release and the tested build matches it.

Technical Analysis, Relevant Code, Expected, Observed, and Must Preserve are detail-on-demand. Bug Trigger (In-Game) remains visible in the normal tester-facing preview.

Preview must never invent a Solution, persist a second report format, or expose internal diagnostic plumbing.

## Repair ownership

A report has one `repairBy` value. Individual bugs cannot have separate repair owners.

Per-bug `fixed` checkboxes exist only to prevent missed bugs and show report progress. Report completion is derived from all bug checkboxes; it is not stored separately.

## Language

All persisted report content and canonical UI labels are English.


## Golden tester report

The canonical reference fixture is:

```text
fixtures/golden-tester-report-v2.json
```

It demonstrates one Blocker, Major, and Minor bug using the current tester-facing contract. Use it as a regression reference for wording and report shape; do not create a second Markdown report from it.

## Creation

New reports must be created directly as V2 through `createBugReportV2()`. The creator defaults each bug to `fixed: false`, validates V2 semantics, enforces tester readiness through `report-readiness.ts`, and then enforces the wording contract in `COPY.md` before emission.

Do not generate V1 and convert it to V2 for new audits. V1 conversion exists only for old saved reports.


## Promotion gate

Internal diagnostics are not bug reports.

A Diagnostic Finding may represent a risk, evidence gap, compatibility warning, or unresolved hypothesis. Do not copy diagnostics directly into developer-facing V2.

New audit output follows:

```text
internal analysis
→ confirmed defect
→ tester-readiness gate
→ promoteConfirmedBugsToV2()
→ Bug Report V2
```

Only `confirmed-defect` inputs enter the final report.

Promotion quality rules:

- Every tester-facing confirmed defect requires Bug Trigger (In-Game) steps; the canonical JSON field remains `reproduction`.
- AI-found confirmed defects require AI Analysis and Relevant Code.
- Relevant Code stays focused on at most three primary locations.
- Suggested Fix is advisory and requires supporting analysis/code context.
- Root-cause certainty is never required to describe a confirmed defect.
- Candidate, possible, speculative, and insufficient-evidence findings stay internal.

The promotion-only `status` is not persisted in Bug Report V2.

## Output density

The normal tester-facing scan should answer only the minimum useful questions:

```text
What failed?
What gameplay impact does it cause?
How can I trigger and prove it in-game?
What supported solution exists?
```

Expected, Observed, Technical Analysis, Relevant Code, and Must Preserve belong to Repair Detail and appear only on demand.

Do not copy internal proof chains, diagnostic IDs, planner output, confidence scores, cache metadata, or orchestration details into tester-facing report copy.


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


## Canonical defect group resolution

Semantic grouping never concatenates report prose automatically.

When multiple confirmed symptoms share:

```text
same causal incident
AND same broken invariant set
AND same repair unit set
```

they form one unresolved semantic defect group.

Before V2 projection, that group must be resolved explicitly. Low-level callers may use `resolveConfirmedDefectGroup()`; high-level audit callers pass `groupResolutions` to `buildBugReportFromAuditCandidates()`.

The resolver merges only information that is safe to combine deterministically:

- worst-case impact;
- Expected and Observed evidence IDs;
- broken invariant IDs;
- repair unit IDs;
- proven Must Preserve constraints;
- selected primary source evidence.

Canonical Title, Problem, Expected wording, Observed wording, and tester reproduction remain explicit resolution inputs.

Grouped defects must share one primary failure. If the group mixes AI- and tester-origin symptoms, the resolution must explicitly choose Found By according to the earliest documented discovery; the resolver never guesses discovery order.

Expected evidence in the resolved defect is taken only from grouped symptoms that use the selected Expected authority.

Suggested Fix is preserved only when every grouped symptom carries the same supported repair advice.

If a grouped AI defect exposes more than three distinct source locations, the resolver requires an explicit selection of the primary locations rather than truncating them silently.

## Source precision

AI Relevant Code is projected from SourceRef, not arbitrary file strings.

For line-addressable authored sources such as TypeScript, JavaScript, and mcfunction files, the high-level audit-to-report path requires a precise SourceRef range/location. The parsers already emit these ranges.

File-level references remain valid for formats that do not have meaningful line positions.

Every source path is still checked against the audited file inventory before V2 promotion.

## Rejected candidate continuation

Rejected report candidates are not persisted as workflow state.

The collector returns:

```text
semanticKey
route
evidenceIds already available
nextEvidenceNeed
reasons
```

This allows the same semantic candidate to be re-evaluated after collecting only the missing evidence, without creating another report database or rediscovering the defect from scratch.

Examples of targeted next evidence include authored intent, runtime proof, tester reproduction, expected-behavior evidence, repair decision, or candidate correction.

## Authored invariant promotion

An invariant may become `authored` only when the semantic relation has direct evidence from the explicit `authoredScripts` input.

Compiled/runtime duplicates may coexist with the same semantic edge and do not downgrade authored authority. The authored evidence must still exist for that exact semantic relation; runtime-only evidence remains inferred.

This prevents generated JavaScript duplicates from diluting authoritative TypeScript intent while preserving the distinction between authored semantics and inferred naming/call-flow semantics.

Runtime/compiled script evidence does not raise intent authority.

Currently lossless promotion is allowed for:

- typed authored transition-table invariants;
- complete direct-guard policy coverage from authored source.

Incomplete guard coverage and runtime-only derivations remain inferred or unknown.


### Semantic identity ownership

`semanticKey` is derived data. Callers do not choose it.

The canonical identity is derived from:

```text
subjectIds
+ brokenInvariantIds
+ primaryFailure
+ causalIncidentId (when available)
→ semanticKey
```

Runtime and static AI routes take `subjectIds` from the diagnostic result that established the defect. The AI report caller cannot override those subjects.

Tester routes provide explicit gameplay subject IDs because tester evidence is external to source-code diagnostics.

`validateConfirmedDefect()` rejects any ConfirmedDefect whose semanticKey does not match the deterministic identity.

Stable Bug IDs are then derived from this semanticKey, so wording changes to Title, Problem, AI Analysis, or Suggested Fix do not change bug identity.


## Rejected candidate reuse planner

Rejected candidates remain internal and derived. They are not persisted as Bug Report V2 workflow state.

`planReportCandidateReuse()` may reuse a prior rejection only when:

- route and deterministic semantic identity are unchanged;
- the prior next-evidence need is evidence-bound; and
- the current evidence ID set is unchanged.

Candidate correction, repair-decision changes, tester reproduction, and intent clarification are always re-evaluated because those inputs can change without producing a new evidence ID.

This avoids repeating unchanged analysis while remaining conservative when user/tester/repair context changes.


## Defect identity versus repair knowledge

`semanticKey` identifies the defect itself. It is derived from:

- causal incident when available;
- affected semantic subjects;
- broken invariant identity;
- primary failure.

Repair-unit knowledge is deliberately excluded from semantic identity.

`repairUnitIds` are used for grouping and repair reasoning only. As diagnosis becomes more precise, repair units may change without changing the defect's semantic key or Bug ID.

This prevents unrelated source-line movement, repair-strategy refinement, or later root-cause precision from renumbering an existing bug.

For source-backed grouping, precise SourceRef locations are preferred over whole-file identity. This makes grouping conservative: uncertain repair ownership tends to split rather than silently merge.


## Authored source roots

Default authored TypeScript discovery recognizes Bedrock source layouts under:

```text
behavior_packs/<pack>/src/
development_behavior_packs/<pack>/src/
```

Custom layouts may be supplied through `authoredSourceRoots` in the inspection profile or authored-intent diagnosis payload.

Generated/runtime outputs remain excluded. In particular, Bedrock `<pack>/scripts/`, `dist/`, `build/`, `node_modules/`, and declaration-only `.d.ts` files are not treated as authored gameplay intent.

The authored-intent diagnosis executor revision is bumped when these semantics change so cached evidence cannot silently reuse an older source-authority policy.


## Classification evidence

The high-level audit-to-report path does not accept ungrounded impact or primary-failure classification.

Each audit candidate carries structured classification signals instead of final Severity/Category inputs.

```text
impact signals
  progression-blocked
  progression-degraded
  recovery-none
  recovery-abnormal
  crash-or-freeze
  core-mechanic-wrong
  important-state-wrong
  fairness-affected

primary failure signals
  one BugPrimaryFailure
```

Every signal carries evidence IDs. The IDs must already belong to the same confirmed-defect evidence universe.

`deriveReportDefectClassification()` deterministically converts those signals into `BugImpactAssessment` and one `BugPrimaryFailure`. Ambiguous primary-failure signals are rejected rather than guessed.

Severity remains derived from the resulting impact assessment, and Category remains derived from the resulting primary failure. Classification signals and their evidence are internal only and are never serialized into Bug Report V2.

## Semantic repair owners

Repair-unit identity prefers a validated Semantic IR execution region when one can be established:

```text
Semantic IR execution region
→ JSON pointer
→ SourceRef range
→ file
```

Source evidence may carry an internal `semanticOwnerId`. The collector validates it against `SemanticIr.execution.regions`.

When the caller omits the owner and Semantic IR is available, SourceRef evidence may be bound automatically only when exactly one execution region is the best match. Ambiguous matches are not guessed.

Semantic owners influence grouping and repair reasoning only. They do not change the defect semantic key or Bug ID.

## CLI authored source roots

Custom authored source layouts are available from the CLI through the repeatable option:

```text
--authored-source-root <path>
```

Example:

```text
npm run cli -- inspect map.mcworld \
  --authored-source-root map-source \
  --authored-source-root authoring/domain
```

The option flows through the inspection target profile and authored-intent diagnosis path.


## Route-owned report provenance

The canonical audit path does not accept caller-owned Expected/Observed evidence IDs.

For AI static/runtime routes:

```text
authored invariant evidence
→ Expected provenance

diagnostic/runtime contradiction evidence
→ Observed provenance
```

The draft supplies only the curated wording:

```text
expectedStatement
observedStatement
```

For tester routes, `TesterDefectConfirmationInput` owns:

```text
expected behavior authority
expected statement
expected evidence IDs
gameplay observation evidence IDs
reproduction state
```

The collector projects those authoritative facts into `ConfirmedDefect.expected` and `ConfirmedDefect.observed`.

This removes a duplicate source of truth and prevents report copy from attaching arbitrary provenance.

## Bounded classification producers

Classification automation is intentionally partial.

`derivePrimaryFailureSignalsFromDiagnostics()` maps only diagnostic families with a direct one-to-one semantic meaning. Ambiguous diagnostic codes remain unmapped.

`deriveReportClassificationFromRuntimeExperiment()` maps only explicit failure predicates from qualified runtime experiments. It does not infer impact from diagnostic severity, success predicates, measurements, or natural-language names.

Runtime-derived classification may affect a defect only when its source evidence intersects the same runtime evidence used to confirm that defect.

Explicit and derived primary-failure signals are combined without precedence. If they disagree, classification is rejected as ambiguous.
