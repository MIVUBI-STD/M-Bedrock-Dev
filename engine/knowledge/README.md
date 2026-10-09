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

Production Knowledge loading/validation is owned by `engine/packages/knowledge/`; analysis decisions remain with the existing analyzer/diagnostic owners. `engine/reliability/catalogs/knowledge-detector-bindings.json` **declares** fact-to-analyzer/proof traceability. Its `analyzerPaths` and `proofPaths` are references to relevant source and tests, not execution traces or proof that an analyzer directly loads each Knowledge ID. Resource Graph `USES`/`VALIDATES` edges derived from the binding registry inherit this declaration-only proof ceiling. To claim effective consumption, trace the real loading or input path and the behavior covered by the relevant analyzer/test. Evidence gaps remain explicit rather than being filled from another catalog.

Do not duplicate a fact into a second domain for convenience. When cross-domain behavior is involved, preserve the owning fact and relate it through canonical Graph/consumer mechanisms. Do not create subfolders for every mechanic until existing ownership cannot represent a demonstrated responsibility.

When two catalogs describe related mechanics, compare the **claim** and applicability before moving or deleting anything: a shared platform prerequisite and a domain-specific implication may be legitimately distinct. Preserve stable fact IDs and existing analyzer/proof bindings until their consumers are reconciled. Record unresolved overlaps in the canonical development plan rather than creating a second cross-domain catalog.

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
