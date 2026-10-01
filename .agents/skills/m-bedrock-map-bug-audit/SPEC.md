# Map Bug Audit Specification

## Intent

Use stable detection capability to find gameplay contradictions only after current Game Design for the audited scope is understood.

## Required entry state

```text
target identity pinned
+ current Game Design recovered
+ scoped Gameplay Contract derived
+ design readiness = READY | scoped-safe PARTIAL
```

BLOCKED design readiness prevents defect classification for that scope.

## In scope

- map-specific design understanding;
- actual-behavior inspection/retest;
- defect vs designed-behavior vs ambiguity;
- counter-evidence;
- player impact and tester trigger;
- proof-ceiling classification;
- Proposed Bug Set review;
- detection-gap handoff.

## Out of scope

- inventing missing Game Design from implementation;
- engine detector development;
- target repair;
- generic product development.

## Evidence model

Expected behavior and actual behavior are independent authorities.

```text
approved Game Design
→ derived Gameplay Contract

current artifact/source/runtime
→ Actual Behavior

Gameplay Contract ≠ Actual Behavior
→ contradiction candidate
```

Platform Knowledge explains Minecraft behavior but never defines Map Game Design. Historical QA is a search/regression hint only.

## Acceptance

- design readiness is explicit before candidate discovery;
- every candidate has one disposition;
- only defects receive Blocker/Major/Minor;
- counter-evidence and player impact are settled before reporting;
- proof ceiling is explicit;
- unresolved detector limitations become detection-gap;
- no engine or target mutation occurs.

## Limits

Static/package evidence does not prove live runtime behavior. Unknown design remains ambiguous rather than defaulting to defect.