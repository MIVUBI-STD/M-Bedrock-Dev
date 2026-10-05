# Retest and Regression

## Purpose

Canonical guidance for converting confirmed historical defects, Minecraft/update changes, artifact fingerprints, and coverage gaps into bounded retest priorities.

Historical evidence informs what to revisit; it never proves a defect in a current artifact.

## Regression assets

Use distinct owners:

```text
historical defect knowledge → engine/reliability/catalogs/
benchmark expectations      → engine/reliability/corpus/
minimal reproducer          → engine/fixtures/regressions/
execution history           → engine/reliability/history/
current issue truth         → workspace/reports/
```

Do not create another regression/history owner in docs.

## Minimal regression fixture

A regression fixture should reduce a real defect to the smallest reproducible evidence needed to exercise the detector or invariant. A full world is not required when a smaller deterministic fixture proves the target behavior.

## Map retest planning

Build retest priority from:

```text
current artifact fingerprint
+ Minecraft/update delta
+ relevant historical regressions
+ known coverage gaps
+ runtime-sensitive surfaces
→ bounded Retest Plan
```

A retest plan is selection/prioritization, not PASS/FAIL proof.

## Portfolio retest

For multiple maps, reuse exact artifact fingerprints when valid and group maps by affected domains and priority. Reopen artifacts only when their fingerprint or required evidence is stale.

High priority means high retest value, not proof the map is broken. Low priority is not a safety guarantee.

## History-driven search

Historical incidents may:
- raise search pressure;
- activate likely failure families;
- prioritize affected domains;
- suggest proof/counter-proof questions.

They must never inject Expected/Actual behavior into the current selected artifact.

## Campaign history and minimization

Campaign history records what was executed and what coverage/failures were observed. Promote only durable reusable lessons into reliability catalogs; leave chronological run detail in reliability history.

## STOP

Retest planning is complete when affected artifacts/domains have explicit bounded priorities and evidence lanes. Current defect classification remains owned by the current selected-artifact audit.

## Independent regression audit

When validating detector recall against historical defects, keep the current selected artifact independent from the historical answer.

Use:

```text
selected artifact
→ canonical audit flow
→ independent finding set
→ only then compare with historical regression expectations
```

Historical bug IDs, titles, reproduction steps, and root-cause conclusions must not seed the independent pass.

When a historical regression is missed, classify the earliest failing mechanism:

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

Fix the earliest owner that failed instead of adding another taxonomy layer.

Useful quality metrics include:
- material surface routing;
- mutable-resource ownership;
- applicable-check routing;
- required-crosscheck generation;
- scenario accounting;
- player-controlled-surface accounting;
- regression detected/expected;
- PROVEN vs NEED_VALIDATION;
- generic NEED_VALIDATION count;
- false positives;
- duplicate root causes;
- unaccounted material residue.

Regression acceptance must remain honest. Never force recall to 100% by copying historical answers.
