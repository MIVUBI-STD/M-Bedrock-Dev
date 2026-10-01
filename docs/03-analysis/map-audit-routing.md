# Map Audit Routing Guide

## Purpose

Defines the reading order before starting a Minecraft map bug audit.

## Required Order

```text
Selected World Version
→ Game Design Reconstruction
→ Gameplay Flow Mapping
→ State Transition Mapping
→ Bug Detection
→ Bug Classification
→ Bug Report V2
```

## Required References

Before reporting bugs, read:

- Game Design Audit Checklist
- Gameplay Flow Contract
- Multi Arena Audit Contract
- Bug Report V2 Contract

## Rules

- The selected world version is the gameplay authority.
- Do not import mechanics from stale documentation.
- Do not report implementation details as bugs without player impact.
- Every reported issue must connect to a gameplay flow.
