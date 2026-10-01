# Map Audit Report V2 Schema

## Purpose

Defines the production bug report structure after Game Design First audit.

## Required Audit Model

```text
World Artifact
→ Game Design Model
→ Gameplay Flow
→ State Transitions
→ Bug Findings
→ Production Report
```

## Game Design Model

Required understanding:

- objective
- win condition
- lose condition
- reset rules
- preserve rules
- progression rules
- multiplayer rules
- multi-arena rules

## Gameplay Flow

Every audit should map:

```text
Lobby
→ Arena
→ Ready
→ Preparation
→ Combat
→ Wave
→ Death/Respawn
→ Retry
→ Progression
→ Victory
→ Cleanup
```

## Bug Record

Every reportable issue requires:

```text
Bug ID
Category
Gameplay Flow
Severity
Status
Issue
Player Impact
Reproduction Steps
Expected Behavior
Actual Behavior
Evidence
```

## Status

Confirmed:
- contradiction proven from selected artifact

Needs Validation:
- possible issue requiring additional proof

Ambiguous:
- conflicting intent inside selected artifact

Detection Gap:
- audit capability limitation
