# Map Audit Routing Guide

## Purpose

Defines the mandatory reading and execution order before starting a Minecraft map bug audit.

## Required order

```text
Selected World Version
→ Multi-source Gameplay Surface Discovery
→ Game Design Reconstruction
→ Gameplay Flow + Per-State Closure
→ Reset / Preserve / Progression Rules
→ Boundary Registry
→ Multiplayer / Multi Arena / Capacity / Replica Integrity
→ Reachability + Capability Exposure
→ Hidden-Defect / Negative-Space / Temporal Analysis
→ Cross-System Interaction Review
→ Gameplay Model Closure
→ Actual Behavior
→ Gameplay Contradiction
→ Engineering Analysis when complex
→ Bug Classification
→ Coverage Accounting
→ Closure-gated Review
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


## Production gates

- Gameplay Model Closure `OPEN` blocks comprehensive review and report publication.
- Sensitive capability exposure can block release even when prerequisite reachability is not yet fully proven; reachability distinguishes confirmed exposure from potential exposure.
- Replica integrity uses progressive evidence: native chunk fingerprints first, then decoded voxel/block-entity proof when required.
- Known issue examples are regression fixtures only. Routing must remain object- and map-agnostic.
