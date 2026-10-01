# Defense Challenge v1.1.1 Audit Golden Example

## Purpose

This example defines the expected quality level for a complete gameplay audit.

It is a format reference only. The selected world artifact remains the only gameplay source of truth during a real audit.

## Audit Order

```text
World Artifact
→ Game Design Reconstruction
→ Gameplay Flow
→ State Transitions
→ Reset / Preserve Rules
→ Progression Rules
→ Multi Arena Rules
→ Bug Classification
→ Production Bug Report
```

## Gameplay Flow Example

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
→ Cleanup
```

## Bug Report Standard

Every confirmed issue must contain:

- Bug ID
- Category
- Gameplay Flow
- Severity
- Status
- Issue
- Player Impact
- Reproduction Steps
- Expected Behavior
- Actual Behavior
- Evidence

## Important Rules

- Do not classify technical anomalies as bugs without player impact.
- Do not infer gameplay intent from stale documentation.
- Do not skip multiplayer or multi-arena flow.
- Do not publish a report without reproduction steps.
