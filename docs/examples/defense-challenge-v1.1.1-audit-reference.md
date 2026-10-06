---
id: document.examples.defense-challenge-v1.1.1-audit-reference
class: DOCUMENT
domain: examples
role: REFERENCE
authority: REFERENCE
lifecycle: ACTIVE
---

# Defense Challenge v1.1.1 Audit Reference

Format/quality reference for gameplay-first selected-map audit.

This file is **not gameplay authority** for future maps. A real audit must reconstruct expected and actual behavior from its exact selected artifact.

## Expected audit order

```text
Selected World Artifact
→ Gameplay / Game Design Reconstruction
→ Player Flow
→ State Transitions
→ Reset / Preserve Rules
→ Progression Rules
→ Multiplayer / Multi-Arena / Capacity
→ Contradiction + Proof
→ BUG | DESIGN_MISMATCH | NEED_VALIDATION
→ Report
```

## Reference gameplay flow

```text
Lobby
→ Join Arena
→ Ready
→ Preparation
→ Build / Shop
→ Combat
→ Wave
→ Level Progression
→ Retry / Defeat
→ Victory
→ Cleanup / Replay
```

The exact flow is map-specific and must never be copied as an expectation into another artifact.

## Finding quality

A reportable gameplay finding must preserve:
- stable issue identity;
- issue type;
- gameplay flow/location;
- player-visible problem;
- reproduction/trigger;
- expected behavior;
- actual/observed behavior;
- evidence/proof state;
- severity only when proven;
- affected scope;
- supported resolution when available.

## Review rules

- Do not classify technical anomalies as bugs without a grounded gameplay contradiction.
- Do not infer gameplay intent from stale documents or other versions.
- Do not skip multiplayer, multi-arena, connection/recovery, reset/replay, or capacity concerns when applicable.
- Do not publish a PROVEN finding without reproducible trigger/proof.
- Keep unresolved material contradictions visible as NEED_VALIDATION or Audit Obligations rather than manufacturing certainty.