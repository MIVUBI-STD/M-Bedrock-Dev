# Hidden Gameplay Defect Analysis

## Purpose

Canonical ownership map for defects that are difficult to detect because broken behavior can resemble intended game design.

This document does not replace Gameplay Model Closure or Cross-System Interaction Audit. It defines the five analysis modules that run after surface discovery and before final bug classification.

## Ownership

### 1. Design Intent Challenge

**Owner:** `engine/packages/gameplay-intent/src/design-intent-challenge.ts`

Question:

> Is this behavior independently grounded as intended design, or is the implementation merely enforcing itself?

Rule:

```text
implementation evidence only
≠
design intent proof
```

A limitation becomes grounded design only when selected-artifact evidence exists independently from the implementation mechanism being audited.

Typical targets:
- global concurrency limits;
- queue limits;
- disabled mechanics;
- hard-coded caps;
- fallback behavior;
- feature gates.

### 2. Mechanic Completeness Graph

**Owner:** `engine/packages/gameplay-intent/src/mechanic-completeness.ts`

Required chain:

```text
Declared
→ Reachable
→ Triggered
→ Consumed
→ Effect Applied
→ Player-visible Result
```

A mechanic is incomplete when any required stage is missing.

This catches features that exist by name/configuration but do not actually function.

### 3. Negative-Space Analysis

**Owner:** `engine/packages/diagnostic-reasoning/src/negative-space.ts`

Looks for missing required counterparts:

- producer without consumer;
- consumer without producer;
- reachable state without exit;
- reset without baseline restoration;
- declared mechanic without effect.

Negative-space findings are candidates, not automatic confirmed bugs. They still require gameplay grounding and player impact.

### 4. Temporal Interaction Prioritization

**Owner:** `engine/packages/diagnostic-reasoning/src/temporal-risk.ts`

Prioritizes interactions involving:
- async work;
- global state;
- retry;
- reload;
- reconnect;
- cleanup;
- shared resources;
- capacity boundaries;
- delayed callbacks;
- fallback;
- terminal transitions.

For high-risk pairs, review:

```text
before
overlap
after
```

This is risk-directed analysis, not brute-force permutation testing.

### 5. Design Consistency Anomaly Analysis

**Owner:** `engine/packages/diagnostic-reasoning/src/design-consistency.ts`

Finds one gameplay rule that differs from otherwise equivalent peers.

Example:

```text
Arena 1..6:
  independent state
  independent waves
  independent score
  independent cleanup

but:
  only 2 may run concurrently
```

An anomaly is not automatically a bug. It is a mandatory intent challenge: independent design evidence must explain the outlier before it can be classified as Designed Behavior.

## Execution order

```text
Surface Discovery
→ Gameplay Model Closure
→ Design Intent Challenge
→ Mechanic Completeness
→ Negative-Space Analysis
→ Temporal/Cross-System Prioritization
→ Design Consistency Anomalies
→ Contradiction Analysis
→ Bug Classification
```

## Non-overlap rules

- Gameplay Model Closure owns **completeness of understanding**.
- Design Intent Challenge owns **whether behavior is truly intended**.
- Mechanic Completeness owns **whether a declared mechanic has a complete functional chain**.
- Negative-Space owns **missing counterpart/path evidence**.
- Temporal Risk owns **which concurrent sequences deserve deeper analysis**.
- Design Consistency owns **peer/outlier anomalies**.
- Cross-System Interaction Audit owns **system-pair review procedure**.
- Bug Report owns severity and user-facing publication.

No module may redefine another module's result as final bug severity.

## First-pass requirement

These analyses are part of the consolidated first audit pass. They must not be deferred to a routine recheck merely because the happy path works.


## Engineering Analysis Depth

**Owner:** `engine/packages/diagnostic-reasoning/src/engineering-analysis.ts`

Use structured engineering analysis only when the finding materially depends on multiple causes, platform/resource constraints, or multiple evidence channels.

It owns:

```text
Symptom
→ Immediate Cause
→ Root Cause
→ Gameplay Consequence
→ Quantitative / Platform Constraints
→ Evidence Convergence
→ Repair Directions
→ Verification Scenario
```

Do not make every bug verbose. Simple defects remain compact.

### Evidence convergence

Independent channels can include:

- source;
- player-visible world;
- runtime;
- tester;
- player/classroom feedback;
- platform constraints.

Multi-source convergence strengthens explanation but does not replace intent or confirmation gates.

### Constraint-aware repair

A repair direction is invalid if it violates a known platform, geometry, capacity, compatibility, or gameplay-preservation constraint.

Alternatives should state what they solve and what still needs validation.

### Projection

Engineering Analysis is internal structured reasoning. It is projected into the existing Bug Report V2 `Technical Analysis` field. It does not create another persisted report schema.
