# Map Audit Naming Contract

## Purpose

One concept must have one public name across source, schema, docs, report, and tester output.

## Canonical public terms

| Concept | Canonical name | Do not introduce as alternate public status/name |
| --- | --- | --- |
| Proven issue | `PROVEN` | confirmed, ready, source-grounded |
| Material unresolved issue | `NEED_VALIDATION` | ambiguous, runtime-blocked, detection-gap |
| Issue class | `BUG` / `DESIGN_MISMATCH` | defect-type variants |
| Primary taxonomy | `failureDomain` | category |
| Cross-system taxonomy | `contributingDomains[]` | secondary categories |
| Missing deciding evidence | `missingProof` | missingEvidence, unresolvedProof |
| Why unresolved | `validationReason` | ambiguityReason |
| Exact tester action | `validationTest` | testerObligation, runtimeChecklist |
| Validation consolidation | `validationGroupKey` | testBucket |
| Proof route | `proofNavigation` | resolutionPlan |
| No-hidden gate | `honesty` | completenessCheck |
| Consolidated runtime/manual tests | `validationTests` | testerTasks |
| Historical search influence | `historyPressure` | historicalRiskScore |
| Family-specific proof guidance | `familyProofCriteria` | proofChecklist |

Internal resolver states such as RUNTIME_PROOF_REQUIRED, DETECTION_GAP, COUNTERPROOF_SEARCH_REQUIRED, and GAMEPLAY_TRANSLATION_REQUIRED may exist internally, but they must project to NEED_VALIDATION rather than becoming additional public statuses.

## Report naming

Use these names consistently:

- `Complete Bug Report` / `Map Audit Report` — human-facing complete finding set; includes PROVEN and NEED_VALIDATION across BUG and DESIGN_MISMATCH.
- `Approved Bug Report V2` — downstream approved PROVEN BUG ledger only.
- `evidenceRoute` — conceptual name for static/runtime/tester evidence origin. It is not an audit workflow lane.

Never call static/runtime/tester separate audit routes.

## Canonical flow names

Use these stage names exactly:

```text
TARGET
DISCOVERY
UNDERSTAND
MODEL
STRESS
PROVE
REPORT
```

Player-flow names:

```text
ENTRY_JOIN
READY_START
SETUP
ACTIVE_GAMEPLAY
PROGRESSION
TERMINAL
CLEANUP_REPLAY
RECOVERY
```

## Full-map naming

Use:

- `replicaBaseline` — canonical arena/region baseline.
- `replicaResults[]` — per-replica comparison result.
- `replicaId` — stable identifier for one compared replica.
- `replicaStatus` — `EQUIVALENT | BOUNDED_EQUIVALENCE | DIVERGENCE_REQUIRES_CLASSIFICATION | INCOMPLETE_PROOF`.
- `replicaDivergenceIds[]` — only deltas that must continue to STRESS/PROVE.
- `baselineReusableForAllReplicas` — true only when every replica has complete proof and is `EQUIVALENT`; bounded equivalence never authorizes global baseline reuse.

Do not use `copy`, `clone`, `same arena`, or `different arena` as canonical machine terms.

## Reporting hierarchy

Use:

```text
completeAuditFindings
→ all material PROVEN + NEED_VALIDATION findings

approvedBugReportV2
→ approved PROVEN BUG items only
```

Do not use "Bug Report" to imply unresolved material findings may be omitted from the human-facing audit report.

## Evidence-route boundary

Internal report candidate values `static`, `runtime`, and `tester` describe evidence origin only.

Canonical interpretation:

```text
one audit flow
→ PROVE
→ evidence origin: static | runtime | tester
→ one finding projection
```

They must never be presented as alternate audit lanes or alternate production entrypoints. Existing internal `route` fields are compatibility names; their semantic meaning is `evidenceRoute`.

## Rule

A new name requires replacing an existing canonical term, not coexisting with it.
