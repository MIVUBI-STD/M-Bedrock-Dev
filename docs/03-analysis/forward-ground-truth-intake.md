# Forward Ground-Truth Intake

## Purpose

Convert future tester/client-confirmed defects from frozen prospective map versions into objective detector evaluation.

This is the only allowed path for using post-snapshot issue knowledge to improve the frozen engine.

## Frozen snapshot rule

For each prospective map, preserve:
- exact artifact fingerprint;
- audit commit/run state;
- independent finding set;
- coverage gates;
- engine revision used.

Never rewrite the pre-ground-truth result after a tester/client issue arrives.

## Intake record

For each independently confirmed issue record:

```text
Ground Truth ID
Map / exact version
Artifact fingerprint
Reporter/source
Confirmation status
Gameplay scenario
Trigger
Expected
Observed
Player consequence
Affected scope
Reproduction
Independent evidence
Date confirmed
```

Only confirmed defects enter recall scoring. Unconfirmed reports remain external validation candidates.

## Frozen-engine comparison

Compare the confirmed defect with the preserved prospective snapshot.

Outcome:

```text
DETECTED
→ frozen finding is root-cause equivalent

PARTIALLY_DETECTED
→ relevant contradiction exists in frozen record but root cause/proof did not close

MISSED
→ no equivalent frozen finding

NOT_COMPARABLE
→ ground truth applies to a different artifact/version or requires a capability outside the frozen audit scope
```

For MISSED/PARTIALLY_DETECTED, classify the earliest failure:

```text
DISCOVERY_MISS
ROUTING_MISS
CROSSCHECK_MISS
MODEL_MISS
SCENARIO_MISS
ADVERSARIAL_MISS
PROOF_MISS
DEDUP_MISS
REPORT_MISS
```

## Repair rule

A confirmed miss may change the engine only after:
1. exact frozen comparison;
2. earliest failure-stage classification;
3. proof that the defect fits or does not fit existing mechanisms;
4. smallest general repair is identified;
5. affected regression cases are rerun;
6. at least one unrelated regression/prospective control is checked for false-positive expansion.

Do not add a taxonomy family when an existing mechanism can represent the defect.

## Forward metrics

Track:

```text
Confirmed ground-truth defects
Detected by frozen engine
Partially detected
Missed
Not comparable
Prospective recall
Unsupported frozen PROVEN
False-positive confirmations/rejections
Generic NEED_VALIDATION
```

Prospective recall:

```text
DETECTED / (DETECTED + MISSED)
```

PARTIALLY_DETECTED is reported separately until adjudicated.

## Production workflow

```text
Frozen prospective snapshot
        ↓
independent tester/client confirmation
        ↓
Ground-Truth Intake
        ↓
Frozen-engine comparison
        ↓
metrics
        ↓
miss classification
        ↓
smallest mechanism repair
        ↓
regression + control rerun
        ↓
new engine revision
```

This prevents tuning the engine to unverified reports and preserves an honest measurement trail.
