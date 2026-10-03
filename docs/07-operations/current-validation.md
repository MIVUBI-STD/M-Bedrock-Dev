## 2026-10-03 — HTML report zero-waste cleanup

Source-verified on `Local`:

- Approved Bug Report HTML now uses one compact expandable row per bug.
- One bug owns one `Fixed` checkbox; reproduction steps are plain instructional text.
- `issueIndex`, `showIssueIndex`, `compactTables`, the duplicate `bug-report-doc` script, and the stale `document/design.ts` presentation contract were removed.
- Client HTML projection no longer carries unused `foundBy` provenance.
- Explicitly included fixed bugs now render their checkbox as checked from canonical Bug Report V2 status.
- The active report chain remains `Bug Report V2 → client projection → quality review → HTML renderer`; no second report state store was added.

Proof ceiling: **STATIC / SOURCE REVIEW ONLY**. These latest changes have not yet been typechecked, built, or exercised through the full repository verifier in a local checkout. Do not claim package/runtime validation from this pass.

# Current Validation

## 2026-10-03 — user prompt confirmation checkpoint

Source-verified on `Local`:

- Production selected-map audit initiated from user wording now requires one explicit chat confirmation after prompt interpretation and before `runSelectedMapAudit()`.
- `summarizeAuditUserIntentForConfirmation()` provides a compact human-facing view of target hints, symptoms, suspicions, expectation/design claims, scope guidance, constraints, historical hints, ambiguity, and unmapped input.
- `AuditUserIntentConfirmation` is bound to a deterministic fingerprint of the normalized intent.
- Missing confirmation blocks production audit.
- Any material change to normalized intent makes the old confirmation stale and blocks audit until the revised interpretation is confirmed again.
- Confirmation validates communication accuracy only; it does not establish gameplay truth or proof.
- Raw imperfect prompts may still proceed through fallback/unmapped obligations once the user confirms the interpretation/fallback summary.
- The skill and AGENTS contract require one compact confirmation round, not repetitive approvals.
- Regression coverage verifies missing-confirmation rejection, valid confirmation, and stale-confirmation rejection after intent changes.

Proof ceiling: **STATIC / SOURCE REVIEW ONLY**. Local typecheck/full verifier and live conversational prompt benchmarks remain outstanding.


## 2026-10-03 — complete prompt-fragment accounting

Source-verified on `Local`:

- User prompt intake now preserves explicit `fragments[]`, per-item `sourceFragmentIds[]`, and `unmappedFragmentIds[]`.
- Validation fails if any material fragment is neither mapped nor explicitly unmapped.
- One fragment may support multiple intent classes; normalized semantic duplicates do not multiply search pressure.
- Unmapped fragments remain visible as `user-input-unmapped` Audit Obligations and are never silently dropped or converted directly into issues.
- `SelectedMapAuditInput.rawUserPrompt` provides a fallback when structured translation is unavailable. `createFallbackAuditUserIntent()` preserves the complete raw prompt as an unmapped fragment so processing can continue.
- Raw fallback does not block audit unless the interpretation later exposes a genuine blocking target/product ambiguity.
- Map Audit HTML explicitly displays unmapped input and states that it is preserved as an Audit Obligation, not ignored and not treated as a bug.
- Regression coverage verifies raw fallback, fragment mapping, explicit unmapped retention, semantic dedupe, and obligation preservation.

Proof ceiling: **STATIC / SOURCE REVIEW ONLY**. Local typecheck/full verifier and live model prompt benchmarks remain outstanding.


## 2026-10-03 — prompt intake finalization

Source-verified on `Local`:

- `AuditUserIntentEnvelope` is the single executable owner for translated user prompt context.
- User prompt interpretation is explicitly non-authoritative and does not enter gameplay `auditRevision`.
- Priority domains seed only additive first-pass analysis demand through existing analysis-planner knowledge domains; artifact/RIG demand remains authoritative and may only grow the union.
- Symptoms, suspicions, expectation/design claims, historical hints, scope/exclusion hints, and test constraints remain separately preserved in bounded model-task context.
- Semantically equivalent wording is deduplicated by normalized meaning, so repeated phrasing does not inflate search pressure.
- Material user symptoms that cannot be reconciled with discovered gameplay remain visible as non-bug Audit Obligations.
- Normal ambiguities are retained for bounded multi-hypothesis search; target/outcome ambiguities that block correctness use `blockingAmbiguities[]` and fail closed before production audit.
- Loose/malformed envelope JSON is validated defensively before normalization; the exported normalizer is also defensive against malformed arrays/items.
- Target hints cannot relabel the exact selected artifact. Material target conflicts must be resolved before audit.
- Map Audit Output V2 and HTML preserve the normalized interpretation transparently as guidance only.
- Regression tests cover semantic dedupe, additive knowledge demand, malformed input, unsupported enums, ambiguity separation, dropped symptom interpretation, unexplained symptom obligations, and output preservation.
- Rough-language benchmark cases cover progression stalls, guessed ticking-area causes, inventory loss/duplication, multi-arena crossing, broad completion failure, design claims, ambiguous reset behavior, multiple-writer false positives, and target-version conflicts.

Proof ceiling: **STATIC / SOURCE REVIEW ONLY**. This prompt-intake stage is architecture-complete enough to freeze, but local typecheck/full repository verification and model-based prompt benchmark execution have not yet been run.


## 2026-10-03 — user prompt intake hardening

Source-verified on `Local`:

- Added canonical `user-input-translation-contract.md`.
- Added typed `AuditUserIntentEnvelope` with runtime validation and normalization.
- User prompt classes now separate symptoms, suspicions, expectation/design claims, scope priorities, constraints, historical references, and ambiguities.
- `SelectedMapAuditInput.userIntent` is hint-only and is preserved in the audit snapshot/output without entering gameplay authority or `auditRevision`.
- Model task packets receive normalized user search context with an explicit authority note forbidding prompt text from establishing Expected/Actual behavior, issue type, severity, proof status, safety, or absence.
- User-reported symptoms that are not explained by discovered selected-artifact surfaces/scenarios remain visible as `Audit Obligation` rather than disappearing or being promoted to a bug.
- Map Audit HTML shows the interpreted user input in a collapsed guidance-only section.
- Map Audit Output V2 schema was synchronized with the live control, honesty, audit-obligation, user-intent, grounding, coverage, arena-capacity, proof-ceiling, and bounded-replica contracts.
- Regression coverage guards prompt normalization, deduplication, runtime enum validation, symptom/suspicion separation, and non-authoritative semantics.

Proof ceiling: **STATIC / SOURCE REVIEW ONLY**. Local typecheck/full verifier and real-map prompt benchmark remain required.


## 2026-10-03 — causal issue admission hardening

Source-verified on `Local`:

- A canonical `map-audit-obligations.ts` owner now collects unresolved audit/model/proof work separately from gameplay findings.
- Pure `RUNTIME_BLOCKED`, `DETECTION_GAP`, gameplay-translation-required, counter-proof-search-required, knowledge-gap, structural/closure gap, blindspot, temporal-risk, shared-resource, compound-boundary, accumulation-growth, and unclassified replica-divergence states no longer inflate `BUG | DESIGN_MISMATCH`.
- `NEED_VALIDATION` issue projection now starts only from `CONFIRMED_DEFECT_READY` resolutions that already have a concrete gameplay trigger, player-visible consequence, Expected/Actual outcomes, affected scope, and cleared blocking counter-proof, but still miss minimum proof saturation.
- Audit honesty now checks the union of causal findings and Audit Obligations, so unresolved material work cannot disappear merely because it is no longer mislabeled as a bug.
- Audit Obligations are preserved through Map Audit Output V2 and downstream report handoff, displayed separately in HTML, and excluded from finding counts.
- Internal model task packets now include bounded `AUDIT_OBLIGATION` tasks. These tasks are explicitly forbidden from promoting a gap/risk directly to BUG/DESIGN_MISMATCH without a fresh causal audit result.
- The obsolete `map-audit-validation-signals.ts` and `map-audit-validation-blindspots.ts` gap-to-issue projectors were removed.

Proof ceiling: **STATIC / SOURCE REVIEW ONLY**. Local typecheck/full verifier and real-map benchmark remain required before executable readiness or measured detection accuracy can be claimed.


## 2026-10-03 — false-positive issue suppression

Source-verified on `Local`:

- Audit/model/proof gaps no longer enter `BUG | DESIGN_MISMATCH` merely to remain visible.
- `auditObligations[]` is the canonical non-finding lane for knowledge gaps, shallow/unbound scenarios, closure gaps, discovery challenges, shared-resource risks, compound boundaries, accumulation risks, unclassified replica divergence, runtime-proof residue, detection gaps, gameplay-translation work, and incomplete counter-proof search.
- `NEED_VALIDATION` findings are now restricted to `CONFIRMED_DEFECT_READY` resolutions whose gameplay translation and blocking counter-proof are already established but minimum proof saturation is still incomplete.
- `PROVEN` remains reserved for saturation-complete confirmation-ready defects.
- The honesty/visibility gate accepts tracked residue only when it is visible as either a causal finding or an Audit Obligation; it no longer forces gaps to masquerade as bugs.
- Map Audit HTML displays Audit Obligations in a separate section explicitly marked as non-bug work and excludes them from finding counts.
- Legacy signal/blindspot issue projectors are compatibility shims that emit no issues; production ownership is `deriveAuditObligations()`.

Proof ceiling: **STATIC / SOURCE REVIEW ONLY**. Local typecheck/full verifier and real-map benchmark are still required.


## 2026-10-03 — honesty / false-claim hardening

Source-verified on `Local`:

- Map Audit coverage no longer reports `accounted` unless gameplay closure, state model, boundaries, and unaccounted-surface checks are actually complete.
- Coverage records use `understood`, not `checked`, when semantic understanding exists without test proof.
- Multi-arena output separates detected arenas, declared concurrency, and proven-safe concurrency.
- Game-design headline fields expose authored / inferred / unresolved grounding.
- The finding visibility gate no longer implies overall audit infallibility.
- Unsubstantiated `testerTriggerReady` was removed.
- Generic arena detection no longer automatically closes arena topology understanding when arena count/topology is unresolved.
- Partial chunk/entity residency observability remains unresolved instead of being treated as understood.
- Broad state writes prevent the generic state-model surface from claiming full understanding.
- Compatibility absence-of-rule now yields `unknown`, not unsupported.
- Bounded replica proof is `BOUNDED_EQUIVALENCE`, not full `EQUIVALENT`, and cannot authorize global baseline reuse.
- Verified validation proof levels require evidence; local/live game verification also requires target runtime profile binding.
- Runtime profile captures require provenance evidence.
- Capability Truth now says `owner-has-tests` rather than `owner-tested`; proof bindings do not imply current-session execution.
- Generated known limits explicitly defer current execution truth to this file.

Proof ceiling: **STATIC / SOURCE REVIEW ONLY**. These changes reduce overclaim in source semantics but have not yet been validated by local typecheck, full verifier, or real-map execution.


## 2026-10-03 — single production audit output

Source-verified on `Local`:

- `audit <selected.mcworld>` remains the only production selected-map audit entry.
- `SelectedMapAuditRun` remains internal authority and is no longer emitted by the production CLI.
- The production CLI emits exactly one operator-facing `Map Audit Output V2`.
- The HTML renderer accepts canonical `Map Audit Output V2` directly and no longer accepts a raw `SelectedMapAuditRun` wrapper as a parallel input path.
- Approved Bug Report V2 remains a downstream approved-PROVEN-BUG ledger, not a competing audit output.

Proof ceiling: **STATIC / SOURCE REVIEW ONLY**. Local typecheck, repository verification, and tests are still required.


## 2026-10-03 — report timing integration

Source-verified on `Local`:

- Map Audit Output V2 now carries canonical control state: audit status, current stage, next action, continuation owner, rerun requirement, blockers, and reasons.
- Map Audit HTML surfaces that control state before findings so operators do not need to inspect the raw audit object to know what to do next.
- NEED_VALIDATION findings now expose collapsible Proof Guidance with proof goal, missing claims, ordered proof route, family criteria, historical search hints, evidence substitution, and runtime-last-resort guidance.
- Existing Game Design, Multi-Arena, Gameplay Closure, Honesty, and Full-Map Replica information now surfaces in one collapsed Audit Context block before findings.
- `modelTaskPackets`, raw `executionTrace`, and Work Session bindings remain intentionally internal and are not duplicated into human-facing HTML.

Proof ceiling: **STATIC / SOURCE REVIEW ONLY**. Local typecheck/full verification is still required before package-level readiness can be claimed.


## 2026-10-03 — workflow efficiency cleanup

Source-verified on `Local`:

- Removed the trivial `document/layout.ts` layer; the HTML renderer now owns its single live presentation decision directly.
- Removed unused client-projection metadata and stale report vocabulary.
- Fixed a malformed literal-escape import in `bug-report/src/preview.ts`.
- Removed dead preview helper functions that had no rendering consumer.
- Unified retest wording on `How to Reproduce`.
- `runSelectedMapAudit()` and `resolveSelectedMapAudit()` now share one internal `assembleSelectedMapAuditRun()` path for identity, admission, revision, control, model packets, and Map Audit Output projection.
- This reduces duplicated audit-finalization logic without adding a new public owner, manager, route, or state machine.

Proof ceiling: **STATIC / SOURCE REVIEW ONLY**. The current `Local` head still requires local `typecheck`, repository verification, source-hygiene audit, and tests before package-level readiness can be claimed.


Snapshot date: 2026-10-03  
Branch: `Local`

## Historical integrated proof

The last retained integrated verification remains historical and does **not** verify the current head.

## Current source-level architecture

Selected-map production audit now has one operator door and one ordered authority chain:

```text
audit <selected.mcworld>
→ runSelectedMapAudit()
→ TARGET
→ DISCOVERY
→ UNDERSTAND
→ MODEL
→ STRESS
→ PROVE
→ REPORT
→ issueLanes.BUG
   issueLanes.DESIGN_MISMATCH
```

### Output contract regression guard

A dedicated schema-contract regression test now verifies that Map Audit Output V2 retains:

- the two public statuses only;
- NEED_VALIDATION fields `validationReason`, `missingProof`, `validationTest`, `validationGroupKey`, and `proofNavigation`;
- map-level `honesty` and `validationTests`;
- canonical full-map replica status names.

`BuildSelectedMapAuditReportResult` also preserves `fullMapReplica`, so baseline/delta evidence cannot disappear between the canonical audit run and final report handoff.

### Replica divergence classification boundary

Replica comparison intentionally separates raw world/topology difference from gameplay significance.

Current flow:

```text
world/topology proof
→ EQUIVALENT
  or DIVERGENCE_REQUIRES_CLASSIFICATION
  or INCOMPLETE_PROOF
→ semantic/causal classification
→ only grounded gameplay consequence continues as an issue
```

Region-role proof already excludes authored mutable/ignored areas from normal voxel proof where those roles are grounded. Mixed/unknown differences are not automatically called material; they remain classification residue.

### Replica proof ownership cleanup

The unused `arena-semantic-voxel-divergence` layer was removed. It had no production consumer and duplicated semantic masking already owned by arena region classification / proof-eligible volume selection.

Canonical ownership is now:

```text
region classification
→ proof-eligible volumes
→ voxel/block-entity/native proof
→ replica proof quality
→ FullMapReplicaReceipt
→ semantic/causal classification for unresolved divergence
```

Do not reintroduce a parallel semantic voxel classifier unless real-map evidence proves the existing owner cannot express the required distinction.

### Full-map receipt integration

`SelectedMapAuditRun` now exposes `fullMapReplica` when per-replica world/topology proof exists.

The receipt is built only from retained replica proof details already produced by the existing world/topology pipeline. It does not recompute world comparison.

Current canonical replica status names are:

```text
EQUIVALENT
BOUNDED_EQUIVALENCE
DIVERGENCE_REQUIRES_CLASSIFICATION
INCOMPLETE_PROOF
```

BOUNDED_EQUIVALENCE means no divergence was found within the bounded proof scope, but it does not authorize full baseline inheritance. DIVERGENCE_REQUIRES_CLASSIFICATION produces `replicaDivergenceIds[]` for continued causal analysis. INCOMPLETE_PROOF prevents baseline safety from being inherited.

### Naming and output contract alignment

Public naming is now governed by `docs/03-analysis/map-audit-naming-contract.md`.

Map Audit Output V2 now includes the current unresolved-proof and honesty contracts instead of lagging behind source semantics:

- `validationGroupKey`;
- `proofNavigation`;
- `validationTests`;
- `honesty`;
- `historyPressure`;
- `familyProofCriteria`.

Full-map replica comparison also has one consolidation projection, `FullMapReplicaReceipt`, using:

- `replicaBaseline`;
- `replicaResults[]`;
- `replicaStatus`;
- `replicaDivergenceIds[]`.

The receipt reuses existing topology/world-DB/voxel/block-entity proof and does not perform a second comparison or create a second audit flow.

### Master workflow navigation

Operator/AI navigation now starts from `docs/03-analysis/master-selected-map-audit-workflow.md`.

It orders the complete work as:

```text
TARGET
→ DISCOVERY
→ Discovery Challenger
→ UNDERSTAND
   → Player Journey
   → State Registry
   → Shared-Resource Ownership
   → Ownership Registry
   → Progression Contract
→ MODEL
   → Full-map / world-DB replica normalization
   → Actor / Entity
   → Spatial / Simulation
   → Multiplayer / Multi-Arena
   → Boundary / Capability Delivery
→ STRESS
   → lifecycle / negative-space / higher-order / growth
→ PROVE
   → proof navigation
   → historical hints
   → evidence substitution
   → exact counter-proof
   → proof saturation
→ runtime only if irreducible
→ honesty gate
→ REPORT
```

This is a navigation/ordering layer only. Executable closure remains owned by `mandatory-audit-procedure.ts` and `map-audit-admission.ts`; specialist documents cannot become alternate workflows.

### Gate consolidation

Closure decisions now have one executable owner:

```text
discovery / gameplay model / scenario / defect-resolution evidence
→ Mandatory Audit Procedure checkpoints
→ map-audit-admission orders checkpoints and selects first blocker
```

`map-audit-admission.ts` no longer re-evaluates Discovery Closure, Gameplay Model Closure, Scenario Closure, or Defect Resolution in parallel. Gameplay Model Closure is represented explicitly by checkpoint `A7`.

This removes duplicate gate logic while preserving fail-closed behavior.
### Evidence-route naming

Static, runtime, and tester inputs are evidence provenance only. The canonical term is `evidenceRoute`; the legacy field `route` remains only as a compatibility alias inside report-candidate plumbing. These values must never be interpreted as alternate audit workflows.

### CLI lane cleanup

Production selected-map audit still has exactly one command: `audit`.

Arena baseline/corpus/adapter, corpus calibration, script-usage, and all `dev-*` diagnostic commands are now consistently gated by `MBEDROCK_ENGINEERING_TOOLS=1`. They remain bounded engineering/reliability tools and cannot be mistaken for alternate production audit entrypoints.

Distinct non-audit product operations such as compare, package roundtrip, repository task planning, and repair verification remain separate workflows by design.

### Single-flow ownership

- `map-audit-pipeline.ts` owns production entry and continuation.
- `mandatory-audit-procedure.ts` owns executable checkpoints.
- `map-audit-admission.ts` owns first blocking stage and continuation authorization.
- Scenario/RIG/analyzers provide evidence only.
- Specialist docs are supporting contracts, not alternate workflows.
- Work Session/UI/HTML/JSON are projections only.

### Two-status finding model

The operator-facing finding surface now uses exactly two statuses:

- `PROVEN` — sufficiently proven finding with cleared blocking counter-proof;
- `NEED_VALIDATION` — materially plausible finding with one explicit missing-proof obligation and one narrow validation test.

Source-proven contradictions still run automatic bounded counter-proof search first so the engine maximizes PROVEN findings. Runtime proof, Detection Gap, insufficient evidence, and ambiguous intent remain internal reasons behind NEED_VALIDATION rather than separate public categories.

Disproved and proven-normal candidates remain in audit trace only. This keeps uncertainty visible without mixing many status vocabularies.

### Resolution-maximization hardening

The current source also pushes more material signals toward resolution before they can disappear:

- unresolved Required Inspection Graph knowledge receipts surface as Audit Obligations instead of being mislabeled as gameplay issues;
- leaf scenarios with components but no causal proof edge surface as Audit Obligations until causal gameplay proof exists;
- negative-space lifecycle signals and high temporal interaction risks surface as Audit Obligations rather than being promoted to BUG findings without causal proof;
- partially grounded candidate patterns are retained for targeted proof; only all-unknown low-signal patterns stay as raw evidence work;
- unknown counter-proof never suppresses a material candidate; only concrete blocking counter-proof may do so;
- confirmation-ready NEED_VALIDATION findings carry stable validation grouping keys; unresolved non-finding residue carries its own obligation resolution action.

The intended optimization target is therefore: maximize real PROVEN findings, keep every material unresolved signal visible, and never inflate issue counts by converting audit gaps into BUG/DESIGN_MISMATCH.

### False-negative control hardening

The current source now also enforces:

- gameplay criticality is separate from technical complexity, so simple but progression/terminal-critical surfaces cannot be downgraded to shallow proof solely because they have few risk factors;
- multi-arena stress uses selected-map concurrency boundaries instead of assuming that a two-arena pass generalizes to the maximum;
- every `RUNTIME_BLOCKED` causal link emits one narrow runtime Audit Obligation;
- every `DETECTION_GAP` causal link emits one semantic/detection Audit Obligation and is not treated as a gameplay issue by default;
- coverage presence is explicitly distinct from coverage adequacy;
- publication may fail closed while investigation continues collecting unrelated high-confidence findings; an early blocker must not silently erase later required tests;
- inverse/negative-space lifecycle pairs are mandatory challenge targets (acquire/release, spawn/account, grant/reset, schedule/cancel-or-revalidate, and equivalent pairs).

These controls reduce silent false negatives but do not constitute a measured false-negative guarantee until the real-map benchmark target below is executed.

### Fail-closed hardening now present

- one production CLI command: `audit`;
- engineering audit commands remain `dev-*` and gated;
- relevant-source accounting distinguishes:
  - indexed,
  - parse failure,
  - unsupported,
  - **indexed but semantically not understood**;
- structurally indexed gameplay JSON without domain semantics now remains a Detection Gap;
- Gameplay Model Closure blocks on unsupported high-risk surfaces;
- explicit unsupported high-risk surfaces currently include:
  - teleport lifecycle,
  - UI/form reachability,
  - environment/gamerule contract,
  - gameplay-significant async command transactions;
  - dynamically constructed `runCommand/runCommandAsync` effects that literal command analysis cannot exhaustively resolve;
- player-flow reasoning remains:
  `ENTRY/JOIN → READY/START → SETUP → ACTIVE → PROGRESSION → TERMINAL → CLEANUP/REPLAY → RECOVERY`;
- cross-system checkpoint requires all materially demanded scenario families, not merely one arbitrary cross-system scenario;
- counter-proof search is context-aware across guard/scope/exclusion and, when applicable, owner/generation/cleanup;
- capability delivery compares presented/design capability against actual playable capability;
- report type is explicit:
  - `BUG`
  - `DESIGN_MISMATCH`;
- canonical issue taxonomy is now explicit for every confirmed issue:
  - `issueType`;
  - `gameplayFlow`;
  - primary `failureDomain`;
  - cross-system `contributingDomains[]`;
  - `informationMismatch` when grounded player-facing information contradicts actual gameplay;
- issue ordering follows player-flow order instead of technical causal-link order;
- `FULL_JOURNEY` composition cannot own a report finding; issues attach to a concrete gameplay stage;

- every reportable issue now carries canonical taxonomy:
  - `issueType`;
  - `gameplayFlow`;
  - primary `failureDomain`;
  - cross-system `contributingDomains[]`;
  - severity only at confirmed report classification, derived from impact;
- issue projection is ordered by player flow first, then failure domain;
- canonical confirmed-issue taxonomy is now explicit:
  - `failureDomain` = one primary gameplay failure family;
  - `contributingDomains[]` = materially involved cross-system domains without duplicating the root cause;
  - `gameplayFlow` = player-flow location;
  - `informationMismatch` = player-facing information/feedback disagrees with actual capability/state;
  - severity remains downstream review state and requires grounded player impact;
- design mismatch causal links are prevented from entering Bug Report V2 promotion;
- final selected-map report continuation carries the Design Mismatch lane from the same audit revision;
- legacy Map Audit Output V1 schema is explicitly deprecated/non-production;
- repository verifier checks single entry, issue lanes, semantic-gap fail-closed behavior, report lanes, and legacy deprecation.

### Blind-spot hardening ownership

The highest-risk remaining false-negative classes now have explicit canonical owners:

- raw Semantic IR evidence without semantic/scenario ownership → `gameplay-discovery-challenger.ts`;
- multiple/deferred writers and higher-order shared-resource convergence → `shared-resource-ownership.ts`;
- compound multi-dimensional limits and repeated-run growth/producer-cleanup imbalance → `gameplay-compound-growth-analysis.ts`;
- those signals are consolidated by `map-audit-obligations.ts` as non-finding obligations and are independently required by the visibility/honesty gate;
- blocking counter-proof now requires exact contradicted commit target/dependency relevance, not loose same-scenario/component overlap.

These controls reduce the chance that an issue never enters the finding set at all. They remain proof-pressure signals, not automatic bug confirmation.

Still irreducible or only partially statically solvable:
- native Bedrock/Education runtime semantics;
- actual geometry/collision/pathfinding behavior;
- multi-client presentation/order divergence;
- load/performance-only failures;
- completely absent intended features with no selected-artifact evidence of the expectation.

Those cases must remain explicit runtime/design-contract residue rather than being guessed.

### Counter-proof dimension hardening

Automatic graph search now closes only the locally decidable counter-proof dimensions:

```text
guard
scope
exclusion
```

Ownership-sensitive dimensions such as `owner`, `generation`, and `cleanup` require explicit dimension-scoped receipts with scope and evidence. If those remain unresolved, the finding enters `COUNTERPROOF_SEARCH_REQUIRED` and receives a bounded PROVE continuation instead of being auto-confirmed.

This intentionally trades a small amount of extra source-side reasoning for lower false-PROVEN risk; it does not broaden into generic runtime testing.

### Family proof provenance

`FamilyProofReceipt` evidence is now accepted only when each satisfied criterion cites evidence already grounded in the causal link/resolution/counter-proof evidence set. Arbitrary non-empty evidence IDs no longer satisfy family proof saturation.

### Proof saturation / sufficient-proof stop rule

PROVEN projection now requires a minimum-sufficient-proof saturation assessment. Universal saturation checks:

- one concrete grounded gameplay scenario;
- grounded contradiction;
- explicit gameplay trigger and player-visible consequence;
- bound Expected and Actual outcomes;
- explicit affected scope;
- evidence bound to the finding;
- exhaustive bounded counter-proof search with `NO_BLOCKING_PROOF`.

Each failure family also carries `familyProofCriteria[]` as domain-specific proof guidance. Examples include completion accounting for progression, ownership/isolation for multi-arena, identity/scope/idempotency for inventory, generation validation for deferred work, and residency/platform ownership for chunk simulation.

The deterministic PROVEN projection gate now enforces both universal saturation and an explicit `FamilyProofReceipt`. Each required family criterion must be satisfied and bound to concrete evidence before the finding may project as PROVEN.

If universal or family saturation is incomplete, a `CONFIRMED_DEFECT_READY` resolution is not projected as PROVEN. It remains visible as NEED_VALIDATION. Review readiness is allowed only when the unresolved proof is explicitly preserved and the honesty gate passes; per-finding proof completeness remains expressed by PROVEN versus NEED_VALIDATION.

Proof navigation should stop only when universal and family-specific proof are both saturated. Unsaturated confirmation-ready findings remain visible as NEED_VALIDATION and are tracked by the honesty gate.

### Historical failure search pressure

Generic lessons from prior detection failures are now promoted as search-priority hints, not correctness rules.

Current reusable families include:

- simulation resource declared/required but not realized through acquire/readiness/release;
- arena-local lifecycle using global/unleased selectors or mutations;
- deferred work committing after ownership/session generation changes;
- multiple recovery owners restoring the same player/session state;
- incomplete recovery snapshots for transient state;
- progression accounting holes where required work escapes completion tracking;
- cleanup/reuse baseline leakage into the next run.

Hints activate only when current selected-artifact facts match the family. They can:

- increase early surface search priority through `historyPressure`;
- move relevant non-runtime knowledge domains earlier in proof navigation;
- add targeted historical search questions to model task packets.

They cannot create a defect, lower proof requirements, override counter-proof, or use old map behavior as current gameplay authority. Runtime remains last in the route.

### Conditional knowledge and evidence substitution

Knowledge demand is now conditional on coexisting selected-artifact systems rather than only a static domain prerequisite table. Examples:

- inventory + persistence expands into persistence/recovery proof;
- inventory + economy expands into reward/economy proof;
- arena ownership + simulation surfaces expands into multiplayer/chunk proof;
- chunk simulation + actors expands into entity behavior plus platform constraints;
- persistence/recovery expands into temporal ownership and, when present, arena/inventory proof;
- combat and world-structure lifecycles expand into temporal ownership where stale ordering can matter.

Proof navigation also exposes evidence-substitution candidates. These never auto-confirm a finding; they tell the resolver when a combination of selected-artifact, quantitative, platform, or cross-domain evidence can replace a broad runtime trial. Current substitution families include arena capacity arithmetic, simulation ownership, inventory competing restore writers, persistent append-without-clear, structure transition residue, and boundary arithmetic.

Runtime remains last resort after applicable static/cross-domain/formal substitution routes are exhausted.

### Proof navigation / resolution knowledge

Every NEED_VALIDATION finding now receives a bounded proof-navigation contract:

- `recipeId` — generic failure-family proof recipe, never map-name specific;
- `proofGoal` — the exact fact needed to decide the finding;
- `provenClaims[]` — evidence-grounded claims only;
- `missingClaims[]` — unresolved proof obligations;
- ordered `route[]` — selected-artifact proof first, then cross-domain/formal proof when applicable, runtime last.

Initial recipes cover progression dead-end, arena concurrency/isolation, inventory/economy lifecycle, stale async mutation, chunk residency, persistence/recovery, state ownership, entity/combat lifecycle, world mutation, boundary/capacity, player lifecycle, UI/information, and platform-performance impact.

Model task packets can now use `PROOF_NAVIGATION` to resolve a specific NEED_VALIDATION finding toward PROVEN and explicitly forbid skipping to runtime while an earlier applicable proof route remains unexhausted.

### Honesty / non-suppression gate

The selected-map audit now computes an explicit `no-hidden-material-finding` assessment. It independently derives the material unresolved residue set from the scenario graph, RIG knowledge receipts, Gameplay Model Closure, negative-space signals, temporal risks, and defect-resolution state, then compares that set against the union of causal NEED_VALIDATION findings and visible Audit Obligations.

It verifies that every saturation-complete `CONFIRMED_DEFECT_READY` causal link is visible as PROVEN, while confirmation-ready links with incomplete universal/family proof remain visible as NEED_VALIDATION and non-finding gaps remain Audit Obligations.

Any mismatch is an honesty violation and forces the audit to remain `BLOCKED`; it cannot become `READY_FOR_REVIEW` merely because other closure gates passed.

### Evidence-route consolidation

Static, runtime, and tester report candidates are now explicitly treated as evidence origins inside the single PROVE/REPORT flow. They are not independent audit routes.

The existing internal `route` property remains for compatibility, but its semantic meaning is `evidenceRoute`. No production entry, checkpoint authority, or report authority branches on it.

### Map Audit Output V2 bridge

`SelectedMapAuditRun` now carries a canonical `mapAuditReport` projection produced by `map-audit-output-v2.ts`.

```text
audit <selected.mcworld>
→ SelectedMapAuditRun
→ mapAuditReport (Map Audit Output V2)
→ HTML renderer / human presentation
```

The projection performs no second analysis. It serializes the current audit identity, grounded gameplay model, complete BUG/DESIGN_MISMATCH finding lanes, validation tests, honesty receipt, and full-map receipt.

Map Audit severity is optional until grounded impact classification exists. Approved Bug Report V2 continues to require final severity.

### Map Audit Report honesty

The human-facing report is now the complete Map Audit report, not the approved bug ledger alone.

```text
Map Audit findings
├─ PROVEN BUG
├─ PROVEN DESIGN_MISMATCH
├─ NEED_VALIDATION BUG
└─ NEED_VALIDATION DESIGN_MISMATCH
```

The resolver must attempt to promote NEED_VALIDATION through bounded proof navigation first. If deciding proof remains unavailable, the finding stays visible as NEED_VALIDATION with `validationReason`, `missingProof`, and `validationTest`; it is not silently dropped and receives no final severity.

`BuildSelectedMapAuditReportResult` now exposes one centralized complete finding projection (`findings`, `proven`, `needValidation`) on every success/failure return path. The HTML renderer accepts Map Audit Output V2 and renders both PROVEN and NEED_VALIDATION sections. Approved Bug Report V2 remains a downstream PROVEN BUG ledger only.

### PROVE / REPORT checkpoint cleanup

`D2 Contradiction Admission` now treats Scenario Closure PARTIAL as non-blocking only when it represents irreducible runtime proof residue. OPEN remains blocking.

`E1` is now the **Map Audit Report Contract**, not a Proposed Bug Set / confirmed-defects-only gate. It preserves the complete finding surface; approved Bug Report V2 promotion remains downstream.

### READY_FOR_REVIEW semantics

`READY_FOR_REVIEW` means the audit finding set is complete enough for human review:

- every tracked material finding is visible;
- honesty is PASS;
- mandatory checkpoint admission is READY.

It does **not** mean every finding is PROVEN.

A `NEED_VALIDATION` finding may remain in a review-ready Map Audit Report when the unresolved proof is explicitly identified and preserved. Per-finding proof completeness is expressed only by `PROVEN` versus `NEED_VALIDATION`, not by creating another audit-run status.

### Report handoff authority cleanup

Canonical report review/build now carries only the gate authorities it actually consumes:

```text
SelectedMapAuditAuthority
+ MandatoryAuditProcedure
+ GameplayDefectResolution
→ approved bug candidate review/build
```

Discovery, Gameplay Model Closure, and Scenario Closure remain inputs to the Mandatory Audit Procedure and are no longer passed as parallel production report gates. Legacy collector fields remain optional/deprecated for compatibility only.

### Final report handoff integrity

The canonical report handoff now preserves unresolved material work explicitly:

- approved Bug Report V2 still promotes PROVEN BUG items only;
- Map Audit report result carries all DESIGN_MISMATCH findings with their PROVEN / NEED_VALIDATION status;
- all NEED_VALIDATION findings across BUG and DESIGN_MISMATCH are exposed in one explicit `needValidation` collection;
- consolidated `validationTests` are carried with the report result so unresolved findings cannot disappear during handoff.

The audit run remains the authority; these are projections of the same revision, not a second workflow.

## Current Capability Truth

Latest source-level catalog remains expected to contain:

```text
task capabilities  51
proof-bound        51
proof-unbound      0
analysis caps      31
```

Proof-bound means a capability-specific proof contract exists. It does not mean tests were executed in this work session.

### Remaining blind-spot hardening now present

The latest source also closes several previously high-risk false-negative paths:

- **Discovery Challenger** — raw Semantic IR state operations, unresolved execution edges, unowned execution regions, and deferred/periodic relations with no semantic/scenario owner surface as NEED_VALIDATION instead of silently disappearing before modeling.
- **Reverse shared-resource ownership** — each state surface is indexed to all readers, writers, clearers, and deferred writers; multi-writer, missing-authority, stale-generation, and three-or-more-region convergence produce explicit proof pressure.
- **Higher-order interaction** — shared-resource convergence is used to select interleavings, avoiding an exhaustive Cartesian product across unrelated systems.
- **Exact-target counter-proof** — an exclusion/guard only blocks a defect when it applies to the contradicted dependency/commit target; nearby or merely overlapping healthy guards no longer suppress a candidate.
- **Compound boundaries** — interacting arena/player and arena/simulation capacity dimensions are challenged explicitly rather than relying only on one-dimensional N-1/N/N+1 checks.
- **Accumulation/growth** — append-without-clear persistence, ticking acquire/release imbalance, and world-drop reward paths without cleanup are challenged as repeated-run growth risks without requiring many live runs first.

All of these signals are included in the honesty/non-suppression gate, so they cannot remain internal attention counters while the audit claims READY_FOR_REVIEW.

## Known proof limits

- latest source changes have not been typechecked locally;
- latest source changes have not run through the full test suite;
- CI has not been run for this latest consolidation;
- LOCAL_MINECRAFT/LIVE_MINECRAFT remains required only for irreducible runtime residue;
- false-negative / false-positive rates still need real-map benchmark measurement;
- semantic Detection Gaps are intentionally allowed to block audit rather than produce false PASS.

### Negative precision calibration

Calibration now includes explicit negative/known-safe candidates for:

- an exact-target exclusion guard that legitimately blocks a defect;
- a repaired topology translation that matches the expected replica offset.

They remain non-scorable candidates until artifact fingerprint/frozen expectation requirements are satisfied. This improves precision coverage without fabricating readiness.

### Benchmark contract alignment

The existing detection benchmark framework is now aligned with the current map-audit public model rather than creating a second benchmark system.

Benchmark expectations may freeze:

- `issueType = BUG | DESIGN_MISMATCH`;
- `publicStatus = PROVEN | NEED_VALIDATION`;
- whether unresolved validation is explicitly allowed at the configured evidence ceiling.

Benchmark results may measure:

- TP / TN / FP / FN;
- `provenRate`;
- `needValidationRate`;
- `runtimeResidueRate`;
- validation-test count;
- honesty PASS/VIOLATION;
- full-map replica equivalence/divergence/incomplete-proof counts.

A NEED_VALIDATION result is not automatically a false negative. It becomes a proof-quality failure when frozen expectations require PROVEN and sufficient evidence was available.

Real-map regression cases remain non-ready when required identity/version/frozen-expectation fields are missing. Readiness must not be fabricated to obtain a score.

## Next proof target

Run one exact selected artifact through:

```text
audit <selected.mcworld>
```

Measure:

- stage at first block;
- semantic understanding gaps;
- required cross-system scenario activation;
- PROVEN BUG findings;
- PROVEN DESIGN_MISMATCH findings;
- NEED_VALIDATION findings remain visible with exact missing-proof tests;
- runtime-only residue;
- known-issue capture;
- false negatives / false positives against independently frozen expectations.

## Rule

Do not expand architecture unless real-map evidence exposes a repeated generic gap. Prefer extending an existing semantic owner or leaving an explicit Detection Gap.
