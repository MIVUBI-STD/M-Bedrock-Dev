# Minecraft Bedrock / Education Knowledge Base

Repository-owned machine-readable knowledge. This directory is intentionally separated from analyzers, compatibility evaluation, runtime identity, reliability planning, and repair mutation.

## Domain hierarchy

```text
platform
├─ core / compatibility
├─ Education
├─ permissions
├─ Script API / LevelDB
└─ validation contracts

world-runtime
├─ chunks / persistence
├─ world state / mutation
├─ automation / event ordering
├─ command context
└─ performance / observability

player-experience
├─ player lifecycle/session
├─ inventory
├─ interaction / input
├─ teleport
└─ client feedback

entity-systems
├─ entity runtime/population
├─ combat / effects
├─ loot economy
├─ NPC dialogue
└─ mounts / physics

arena-gameplay
├─ arena cleanup
├─ round integrity
├─ state authority
├─ spatial containment
├─ cinematic
└─ environment hazards
```

`ownership.json` is the canonical machine-readable assignment. Every knowledge JSON file must belong to exactly one group.

## Epistemic boundary

Knowledge distinguishes documented contract, observed implementation, derived rule, project policy, and hypothesis. Conflicting evidence remains visible rather than silently overridden.

Knowledge answers what evidence is relevant to interpreting a target. It does **not** by itself prove runtime behavior or authorize repair.
