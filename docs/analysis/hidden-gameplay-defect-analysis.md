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


## First-pass production integration

The normal inspection path now treats the following as first-pass inputs/results rather than optional rechecks:

- multi-source Gameplay Intent from scripts, functions, entities, structures, dialogue scene tags, dialogue copy/buttons, and localized `.lang` text;
- physical arena count separated from runtime concurrency admission limits;
- generic gameplay boundary registry for limits/counts/retries/levels/waves/timers/player capacities;
- per-state closure instead of treating any transition graph as complete;
- hidden-defect analysis automatically included in inspection output;
- silent gameplay degradation, including reduced concurrency while the game still appears operational;
- mixed-player validation scenarios derived only when relevant lifecycle surfaces exist;
- structure transition residue risk from `structure_void`;
- repeated-run cleanup/baseline validation plan exposed through the arena/gameplay assessment;
- automatic engineering analysis for complex arena-capacity findings;
- Gameplay Model Closure gating both proposed review and final production report publication.

### Player-facing evidence rule

Player-facing evidence is first-class discovery evidence, but inferred wording does not automatically become intended-design authority. It must be correlated with the specific gameplay surface before it can resolve a Design Intent Challenge.

### Recheck rule

Routine recheck is not the discovery mechanism.

A second pass is justified only when:

- the map artifact/version changed;
- blocked runtime evidence became available;
- a Detection Gap was implemented;
- explicit verification of a proposed repair is requested.

Otherwise the first audit must produce the consolidated surface inventory, gaps, candidate set, engineering analysis, and verification plan.


## Reachability and Capability Exposure

**Owners:**

- `engine/packages/diagnostic-reasoning/src/reachability-graph.ts`
- `engine/packages/diagnostic-reasoning/src/capability-exposure.ts`

These are generic reasoning primitives. They must not contain map-specific object rules.

The model is:

```text
Player-accessible origin
→ acquisition / unlock / craft / grant / drop / interaction path
→ prerequisite
→ trigger
→ capability
→ authorization gate
→ gameplay impact
```

A concrete object such as an item, container, button, entity, score, permission, or location is evidence plugged into the graph, not a dedicated detector.

Domain adapters may contribute nodes/edges such as:

- container → contains → resource;
- resource → crafts → item;
- entity → drops → item;
- script → grants → item;
- player → enters → location;
- score/state → unlocks → interaction;
- permission → authorizes → capability.

The Capability Exposure layer decides whether a sensitive capability is blocked, guarded, exposed, potentially exposed, or unknown.

### Example discipline

Known bugs may be used as regression fixtures, but never as implementation rules.

Do not create rules such as:

```text
if item == stick → dev bug
if arena == 6 → incomplete
```

Instead encode:

```text
ordinary player can reach prerequisite
+
restricted capability is triggerable
+
required authorization is absent
+
capability is enabled in release
→ capability exposure
```

and:

```text
replica expected equivalent to canonical
+
material content/proof coverage diverges
→ replica completeness contradiction
```


## Discovery Closure and proof budgeting

Gameplay Discovery Closure is separate from Gameplay Model Closure:

```text
Discovery Closure
= did we inventory/index the relevant selected-artifact surfaces?

Gameplay Model Closure
= do we understand the material discovered surfaces well enough?
```

Do not spend deep-proof budget while Discovery Closure is OPEN.

Risk-directed proof depth uses `static | targeted | deep`. This changes proof escalation, not coverage obligations: every applicable surface remains accounted.

## Contradiction consolidation

Contradictions are keyed semantically before report projection.

Exact duplicate work means the same candidate identity, route, and evidence set; it may be evaluated once.

Different routes or evidence sets for the same semantic contradiction are corroboration and must remain available for grouping/confirmation.

Confirmation and counter-evidence gates run before expensive classification wherever possible.
