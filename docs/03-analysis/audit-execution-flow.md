# Audit Execution Flow

The audit must understand the world before finding bugs.

```text
Selected World Version
→ Game Design Reconstruction
→ Gameplay Flow Mapping
→ State Transition Mapping
→ Reset / Preserve Rules
→ Progression Rules
→ Multiplayer / Multi Arena Rules
→ Actual Behavior
→ Contradiction
→ Bug Classification
→ Bug Report V2
```

## Required Game Understanding

Before bug discovery record:

- objective
- win condition
- lose condition
- gameplay phases
- reset rules
- preserve rules
- level progression
- enemy behavior contract
- multiplayer rules
- multi arena rules

## Bug Order

Review issues following player flow:

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

Do not start from suspicious implementation details alone.
