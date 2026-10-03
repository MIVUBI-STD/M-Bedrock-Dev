# Current Validation

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

- unresolved Required Inspection Graph knowledge receipts now surface as NEED_VALIDATION findings instead of living only inside closure metadata;
- leaf scenarios with components but no causal proof edge surface as NEED_VALIDATION;
- negative-space lifecycle signals and high temporal interaction risks surface as NEED_VALIDATION rather than remaining attention counters only;
- partially grounded candidate patterns are retained for targeted proof; only all-unknown low-signal patterns stay as raw evidence work;
- unknown counter-proof never suppresses a material candidate; only concrete blocking counter-proof may do so;
- NEED_VALIDATION findings carry stable validation grouping keys and are consolidated into the minimum practical validation test set.

The intended optimization target is therefore: maximize PROVEN, keep every material unresolved signal visible, and minimize tester actions through consolidated high-information tests.

### False-negative control hardening

The current source now also enforces:

- gameplay criticality is separate from technical complexity, so simple but progression/terminal-critical surfaces cannot be downgraded to shallow proof solely because they have few risk factors;
- multi-arena stress uses selected-map concurrency boundaries instead of assuming that a two-arena pass generalizes to the maximum;
- every `RUNTIME_BLOCKED` causal link emits one narrow runtime proof request;
- every `DETECTION_GAP` causal link emits one targeted tester obligation;
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

## Known proof limits

- latest source changes have not been typechecked locally;
- latest source changes have not run through the full test suite;
- CI has not been run for this latest consolidation;
- LOCAL_MINECRAFT/LIVE_MINECRAFT remains required only for irreducible runtime residue;
- false-negative / false-positive rates still need real-map benchmark measurement;
- semantic Detection Gaps are intentionally allowed to block audit rather than produce false PASS.

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
