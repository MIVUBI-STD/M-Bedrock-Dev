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