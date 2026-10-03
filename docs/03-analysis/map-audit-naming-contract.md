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
| Sufficient-proof checklist | `saturationCriteria` | proofChecklist |

Internal resolver states such as RUNTIME_PROOF_REQUIRED, DETECTION_GAP, COUNTERPROOF_SEARCH_REQUIRED, and GAMEPLAY_TRANSLATION_REQUIRED may exist internally, but they must project to NEED_VALIDATION rather than becoming additional public statuses.

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
- `replicaStatus` — `EQUIVALENT | MATERIAL_DIVERGENCE | INCOMPLETE_PROOF`.
- `materialDeltaIds[]` — only deltas that must continue to STRESS/PROVE.
- `baselineReusableForAllReplicas` — true only when every replica has sufficient proof and no material delta remains.

Do not use `copy`, `clone`, `same arena`, or `different arena` as canonical machine terms.

## Rule

A new name requires replacing an existing canonical term, not coexisting with it.
