# Map Audit Schema Migration

## Purpose

Extend map audit output from bug candidates only into a complete gameplay audit model.

## Required top-level context

```text
world
→ gameDesign
→ gameplayFlow
→ stateTransitions
→ multiArena
→ bugs
```

## Compatibility Rule

Existing candidate fields remain valid. New gameplay context fields provide the reasoning layer before bug classification.

## Game Design

Must describe:

- objective
- win condition
- lose condition
- reset rules
- preserve rules
- progression rules

## Gameplay Flow

Must represent the player journey:

```text
Lobby
→ Arena
→ Preparation
→ Combat
→ Progression
→ Victory/Defeat
→ Cleanup
```

## State Transitions

Must identify valid and invalid transitions:

```text
Current State
→ Action/Event
→ Expected State
```

## Multi Arena

When applicable, describe isolation boundaries:

- session
- player
- wave
- enemy
- score
- cleanup
