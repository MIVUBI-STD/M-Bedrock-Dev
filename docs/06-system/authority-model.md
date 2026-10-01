# Semantic Authority Model

Gameplay correctness uses separate authorities:

```text
Map Game Design
→ Gameplay Contract
→ expected gameplay

current source / artifact / runtime
→ Actual Behavior

expected gameplay ≠ Actual Behavior
→ diagnosis
```

Supporting domains:

- Gameplay Intent reconstructs implementation meaning; it is not independent design authority.
- Platform Knowledge describes Minecraft behavior/capability.
- Engineering Contracts define MIVUBI implementation/reliability requirements.
- Behavior Model evaluates possible behavior.
- Runtime Evidence records observed behavior.

Hard rules:

- source code never becomes Map Game Design merely because it is explicit or repeated;
- approved reconstruction is clarification evidence, not enough by itself to confirm a gameplay defect;
- runtime observation proves what happened, not what should happen;
- material design unknowns block bug classification for that scope;
- canonical terminology is defined in `canonical-naming.md`.
