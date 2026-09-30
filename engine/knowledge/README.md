# Minecraft Bedrock / Education Platform Knowledge

This directory contains **descriptive, evidence-backed Minecraft platform knowledge**.

Knowledge answers: **What does this Minecraft runtime support, expose, or do for the declared version/profile?**

It does not define map design and it does not own MIVUBI engineering requirements.

## Authority boundary

- Game Design → `engine/game-design/` + `engine/packages/game-design/`
- Engineering/validation contracts → `engine/contracts/engineering/`
- Runtime observations → runtime evidence layers
- Repair decisions → repair/orchestrator

Global `*-policy.json` catalogs were migrated out of this directory. Repository verification forbids `project-policy` authority/classification here.

Platform knowledge keeps provenance, applicability, confidence, and contradictions explicit. UNKNOWN is preferable to invented behavior.
