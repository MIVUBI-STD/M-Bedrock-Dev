---
id: document.analysis.capacity-concurrency
class: DOCUMENT
domain: analysis
role: DOMAIN
authority: CANONICAL
lifecycle: ACTIVE
---

# Capacity and Concurrency

## Purpose

Canonical analysis contract for whether visible/declared gameplay capacity matches actually deliverable concurrent gameplay.

Capacity and isolation are separate questions. A system can isolate arenas correctly while still exposing less playable capacity than the map presents.

## Capacity model

Derive every applicable limit independently:

```text
visible arena / instance count
party size
session count
maximum simultaneous matches
maximum active arenas
per-arena player capacity
shared residency / ticking budget
shared entity / simulation budget
cleanup / reset lease lifetime
other fixed allocations
→ effective simultaneous capacity
```

The smallest active bottleneck defines delivered throughput.

## Required analysis

Check:
- visible/presented capacity;
- admission/session limits;
- actual simultaneous capacity;
- capacity + 1 behavior;
- queue/fallback behavior;
- player-facing queue/full-state feedback;
- transition when capacity becomes available;
- shared resources that reduce throughput;
- cleanup/reuse effects on available capacity.

## Boundary set

When applicable reason at:

```text
1
2 when concurrency matters
safe maximum
safe maximum + 1
selected/presented maximum
```

For players and sessions, evaluate both dimensions when they differ.

## Design mismatch rule

A technical limit is not automatically a bug.

Classify the result using selected-artifact evidence:

```text
intentional + clearly represented limitation
→ no mismatch

presented capability > deliverable capability
→ DESIGN_MISMATCH

grounded intended capability exists but implementation fails
→ BUG
```

A queue is mitigation, not proof that presented simultaneous capacity is delivered.

## Dependencies

Capacity proof must include any applicable dependency that can lower throughput:
- chunk/ticking/residency leases;
- singleton/global session state;
- shared queues;
- entity/simulation budget;
- fixed kit/role/station allocations;
- delayed cleanup/reset;
- platform limits.

Declared/configured availability is not enough; trace delivery to usable gameplay.

## Report evidence

When a mismatch survives proof, preserve:
- presented capacity;
- actual/safe capacity;
- limiting resource/owner;
- affected gameplay flow;
- boundary reproduction;
- player-facing consequence;
- exact evidence and counter-proof disposition.