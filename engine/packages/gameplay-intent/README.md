# Gameplay Intent

This package reconstructs gameplay meaning from the **selected map artifact**.

## Audit authority

For normal map audit:

```text
Selected Map Version
→ only current gameplay evidence universe
```

Gameplay Intent may use explicit authored signals contained in that artifact to build the scoped Gameplay Contract.

External Game Design files, project policy, official docs, old versions, historical diffs, and development source are not current map-intent authority.

## Gameplay Contract

`buildGameplayContract()` derives expected behavior only from authored evidence marked `selected-artifact`.

```text
selected-artifact authored evidence
+ exact audit scope
→ Gameplay Contract
→ READY | PARTIAL | BLOCKED
```

Rules:

- no selected artifact id → BLOCKED;
- no grounded selected-artifact contract evidence → BLOCKED;
- material scoped unknown → BLOCKED;
- non-material scoped unknown → PARTIAL;
- grounded material rules → READY.

Gameplay Contract is temporary/rebuildable and never a second persisted authority.

## Separation

Expected Behavior and Actual Behavior may come from different evidence types, but both must belong to the same selected artifact/version.

Runtime observation proves what happened. It does not import intent from another version or external document.

Historical/reference material is comparison input only when explicitly requested.

## Gameplay Model Closure

`assessGameplayModelClosure()` is the pre-bug completeness gate.

It separates:

```text
CLOSED  = all discovered gameplay surfaces accounted and the major state model is complete
PARTIAL = all surfaces accounted, but material boundaries or surfaces remain blocked/unknown
OPEN    = unaccounted gameplay surfaces or incomplete major state model
```

Rules:

- OPEN blocks comprehensive audit publication.
- PARTIAL allows analysis only for understood surfaces; unresolved surfaces remain explicit.
- CLOSED permits comprehensive contradiction analysis.
- Unknown never becomes Designed Behavior automatically.
- Physical availability does not prove concurrent playability.


## Hidden-defect intent owners

Gameplay Intent owns two pre-classification checks:

- `challengeDesignIntent()` — implementation cannot self-justify intended design.
- `assessMechanicCompleteness()` — declared mechanics must close the Declared → Reachable → Triggered → Consumed → Effect → Player-visible chain.

These functions establish intent/completeness state only. They do not assign Bug Report severity.


## State closure

`assessGameplayStateClosure()` owns per-state entry/exit completeness.

It distinguishes valid unique initial states and grounded terminal states from unresolved states that can still hide softlocks. Gameplay Model Closure consumes this result; merely having a transition somewhere in the graph is not sufficient proof that the state model is complete.
