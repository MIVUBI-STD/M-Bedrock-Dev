# Map Audit Routing Guide

## Purpose

Defines the mandatory reading and execution order before starting a Minecraft map bug audit.

## Required order

```text
Selected World Version
→ Game Design Reconstruction
→ Gameplay Flow Mapping
→ State Transition Mapping
→ Reset / Preserve / Progression Rules
→ Multiplayer / Multi Arena / Capacity
→ Blind-Spot Coverage
→ Cross-System Interaction Review
→ Actual Behavior
→ Gameplay Contradiction
→ Bug Classification
→ Coverage Accounting
→ Bug Report V2
```

## Required references

Before finalizing bugs, read and apply:

- Game Design Audit Checklist
- Gameplay Flow Contract
- Multi Arena Audit Contract
- Capacity and Concurrency Contract
- Gameplay Audit Blind-Spot Contract
- Cross-System Interaction Audit Matrix
- Audit Finalization Checklist
- Bug Report V2 Contract
- Map Audit Output V2 Schema

Runtime-domain contracts are loaded when their system is present in the selected artifact.

## Rules

- The selected world version is the gameplay authority.
- Do not import mechanics from stale documentation.
- Do not report implementation details as bugs without player impact.
- Every reported issue must connect to a gameplay flow.
- Every applicable coverage surface must be checked, blocked, or marked not-applicable with a reason.
- Unsupported or unparsed gameplay surfaces become Detection Gap.
- A clean happy path does not complete the audit.
