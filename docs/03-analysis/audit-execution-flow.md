# Audit Execution Flow

The audit must understand and close the gameplay model before finding bugs.

```text
Selected World Version
→ Gameplay Surface Inventory
→ Game Design Reconstruction
→ Gameplay Flow Mapping
→ State Transition Mapping
→ Reset / Preserve / Progression Rules
→ Multiplayer / Multi Arena / Capacity Rules
→ Boundary Extraction
→ Coexistence / Cross-System Mapping
→ Gameplay Model Closure
→ Actual Behavior
→ Gameplay Contradiction
→ Bug Classification
→ Coverage Accounting
→ Bug Report V2
```

## Phase A — Understand

Before bug discovery, record:

- all discovered gameplay surfaces;
- objective, win, lose;
- gameplay phases and transitions;
- alternate/failure/recovery exits;
- reset/preserve/persistence rules;
- progression;
- enemy/content contracts;
- multiplayer, multi-arena, capacity, queue;
- meaningful numeric/discrete boundaries;
- systems that can coexist or invalidate each other.

Use `gameplay-model-closure.md` as the gate.

## Closure rule

- Gameplay Discovery Closure must be COMPLETE before production continuation.
- Gameplay Model Closure must be CLOSED before production contradiction analysis.
- Gameplay Model PARTIAL remains blocking; it means material gameplay semantics are still blocked/unknown/incomplete.
- Gameplay Scenario Closure may be PARTIAL only for irreducible Minecraft runtime proof. Detection gaps, missing knowledge, orphan components, or missing gameplay purpose keep it OPEN.

## Phase B — Break the model

Compare expected gameplay contract against actual implementation and runtime-relevant behavior.

Review:

- contradictions;
- cross-system interactions;
- boundary failures;
- race/simultaneous events;
- recovery failures;
- capacity mismatch;
- persistence/reset mismatch;
- content-contract breaks.

## Phase C — Report

Order issues by player journey, not technical discovery order:

1. Lobby / Join
2. Arena Assignment
3. Ready / Countdown
4. Preparation
5. Build / Shop
6. Combat
7. Wave Progression
8. Death / Respawn
9. Retry / Checkpoint
10. Victory / Cleanup
11. Reuse / Re-entry

Do not start from suspicious implementation details alone.
