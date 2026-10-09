# Minecraft Bedrock / Education Platform Knowledge

This directory contains **descriptive, evidence-backed Minecraft platform knowledge**.

Knowledge answers: **What does this Minecraft runtime support, expose, or do for the declared version/profile?**

It does not define map design and it does not own MIVUBI engineering requirements.

## Authority boundary

- Game Design → `engine/design/` + `engine/packages/game-design-spec/`
- Engineering/validation contracts → `engine/contracts/engineering/`
- Runtime observations → runtime evidence layers
- Repair decisions → repair/orchestrator

Global `*-policy.json` catalogs were migrated out of this directory. Repository verification forbids `project-policy` authority/classification here.

Platform knowledge keeps provenance, applicability, confidence, and contradictions explicit. UNKNOWN is preferable to invented behavior.


## Domain routing

Resolve the knowledge concept through `ownership.json` first, then read its owning JSON catalog. Each domain directory owns a group of platform facts, not a separate execution workflow. Stable fact IDs, source provenance, applicability and consumer bindings matter more than a catalog filename.

Production consumption is routed through `engine/packages/knowledge/` and the existing analyzer/diagnostic owners. The existing `engine/reliability/catalogs/knowledge-detector-bindings.json` links specific facts to their consumers and proofs; binding metadata never becomes a second truth source. Evidence gaps remain explicit rather than being filled from another catalog.

Do not duplicate a fact into a second domain for convenience. When cross-domain behavior is involved, preserve the owning fact and relate it through canonical Graph/consumer mechanisms. Do not create subfolders for every mechanic until existing ownership cannot represent a demonstrated responsibility.

## Physical hierarchy

```text
knowledge/
├─ platform/
├─ world-engine/
├─ player-runtime/
├─ entity-runtime/
└─ gameplay-runtime/
```

The folder name is the semantic domain. `ownership.json` must match the physical placement exactly.


## Naming rule

Knowledge folders describe Minecraft runtime domains, never map-design domains.
