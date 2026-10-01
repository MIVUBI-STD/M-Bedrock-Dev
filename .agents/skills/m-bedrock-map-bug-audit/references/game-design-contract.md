# Game Design Contract

Used before gameplay bug discovery.

## Purpose

Reconstruct the selected world version as a player experience before classifying defects.

## Required Model

```text
Selected World
→ Objective
→ Win Condition
→ Lose Condition
→ Gameplay Flow
→ State Transitions
→ Reset Rules
→ Preserve Rules
→ Progression Rules
→ Multiplayer Rules
→ Bug Discovery
```

## Minimum Questions

- What is the player trying to achieve?
- What makes the player win?
- What makes the player fail?
- Which progress resets?
- Which progress persists?
- How does the player move from one state to another?

Do not classify implementation anomalies as bugs before this contract exists.
