# Next Action

## Current lane — Real Evidence Calibration

The architecture foundation is sufficiently mature. The current priority is to prove detector quality and package safety using existing real-map evidence without broadening the system.

## Canonical flow

```text
existing map evidence
→ verify artifact identity
→ freeze expectation
→ classify corpus lane
→ run current detector unchanged
→ freeze observed output
→ score TP / TN / FP / FN
→ identify actual gap
→ bounded detector improvement only where evidence requires it
→ minimized regression fixture
→ retest
```

## Immediate non-CI steps

1. Resolve artifact SHA-256 for calibration candidates that are actually available.
2. Keep unavailable artifacts as `candidate`; do not fabricate identity.
3. Create frozen expectations only from already grounded manual/design/runtime evidence.
4. Add at least one known-good negative case before judging detector quality.
5. Run current detector unchanged and record baseline precision/recall/specificity/FPR.
6. Promote only reproduced, reusable failures into minimized regression fixtures.
7. Bind capability-specific proof only when the new evidence genuinely proves that capability.
8. Use Minecraft runtime validation only for claims whose proof ceiling requires it.

## Current corpus

```text
engine/reliability/corpus/
├── calibration.json
├── acceptance.json
└── regressions.json
```

Readiness:

```text
candidate → source exists but prerequisites are incomplete
ready     → artifact identity + frozen expectation complete
blocked   → source/evidence cannot currently be evaluated
```

## Non-goals

Do not:

- add new detector domains without a measured gap;
- create another benchmark/corpus owner;
- duplicate expectations across files;
- promote calibration cases into blind acceptance;
- rewrite expectations after seeing detector output;
- treat package proof as runtime proof;
- expand auto-repair before no-op/repair delta safety is demonstrated;
- add CI work in this lane.

## Success condition

The next milestone is not “more features.”

It is:

```text
a small real corpus
+ verified artifact identity
+ frozen positive/negative expectations
+ reproducible baseline quality metrics
+ explicit runtime residue
```

Only measured failures should drive the next implementation change.
