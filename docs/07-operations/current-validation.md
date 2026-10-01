# Current Validation

Snapshot date: 2026-10-01  
Branch: `Local`  
Behavior/source baseline before this non-behavioral consolidation: `160b7bd6914820357abff7cb5299acb0912619bf`

This file is a current-state proof snapshot, not a chronological validation log.

## Current source capabilities

The current branch contains the established static/source reasoning stack for:

- Semantic IR and value/data-flow reasoning;
- evidence-grounded Gameplay Intent reconstruction;
- Behavioral Model and constraint-backed reasoning;
- diagnostic reasoning with explicit evidence ceilings;
- compatibility/runtime-profile reasoning;
- Runtime Lab experiment contracts and telemetry/evidence binding;
- repair admission, preservation, realization, and retest obligations;
- reliability search, regression/corpus support, and capability-proof bookkeeping;
- repository affected planning, bounded context compilation, and zero-waste execution support.

These capabilities existing in source does not by itself establish current-head runtime correctness.

## Diagnostic proof boundary

A defect may be promoted only to the proof level supported by its evidence.

```text
grounded design / intent
+ supported semantic evidence
+ contradiction evidence
+ matching runtime evidence when the claim depends on runtime behavior
```

Inferred intent remains below authored-design authority. Static or package evidence never implies live Minecraft behavior.

## Retained corpus baseline

The reviewed eight-map understanding baseline remains useful as a regression reference:

```text
cases                 8
intent nodes          1145
authored nodes        181
inferred nodes        964
unknown intent        0
maps with unknowns    0
route profile cases   1
authored route points 67
```

Baseline revision: `2aaf14bf81856c995cdcaed9b8af330ec7c4065c`.

This demonstrates non-empty semantic recovery across the reviewed sample families. It does not prove every recovered classification is correct.

## Current proof limits

Still requiring stronger or real runtime evidence where applicable:

- complete semantic correctness across representative and production maps;
- bundled/minified script semantic coverage and false-semantic review;
- complete official/versioned platform knowledge coverage;
- observed-vs-documented conflict resolution;
- real scheduler/fairness behavior;
- replayability under actual Minecraft runtime conditions;
- entity AI/pathfinding behavior;
- real chunk lifecycle/readiness behavior;
- real multi-client execution and concurrency behavior;
- cross-version runtime differences outside experiments actually executed;
- end-to-end validation of newer source changes at the exact current head.

## Integrated verification bookkeeping

The last integrated verification entry retained by the previous chronological version of this file was:

```text
validated source revision  5e02256869b4fc2107a1cbcf0ff85f0aac6745ac
GitHub Actions Verify       36431630205
repository policy           pass
source hygiene              pass
public API audit            pass
typecheck                   pass
full test suite             pass
```

The current `Local` branch is newer than that recorded proof point. The later consolidation commits change documentation/routing surfaces only; this pass intentionally does not run CI and therefore does **not** upgrade behavioral proof.

Detailed historical validation entries remain recoverable from Git history; longitudinal machine-readable evidence belongs under `engine/reliability/history/`.
