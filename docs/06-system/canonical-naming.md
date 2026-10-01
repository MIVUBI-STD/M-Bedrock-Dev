# Canonical Naming

This document defines repository-wide canonical terminology.

## Authorities

| Canonical term | Meaning | Canonical location |
|---|---|---|
| Map Game Design | What a specific map/mode is supposed to do | `workspace/active/<project-id>/design/game-design.json` |
| Design System | Schema, vocabulary, templates, compiler for Game Design | `engine/design/` |
| Game Design Spec | Typed model/loader/compiler package | `engine/packages/game-design-spec/` |
| Platform Knowledge | Descriptive Minecraft Bedrock/Education facts | `engine/knowledge/` |
| Platform Rule | Executable/versioned capability decision | `engine/rules/` |
| Behavior Contract | Target-specific authored runtime constraints | `engine/packages/behavior-model/` + inspection target |
| Engineering Contract | Global MIVUBI implementation/validation constraints | `engine/contracts/engineering/` |
| Gameplay Intent | Reconstructed intent from authored artifact evidence | `engine/packages/gameplay-intent/` |
| Gameplay Semantic Model | Canonical gameplay meaning projection | orchestrator `gameplaySemantic` |
| Engineering Assessment | Canonical QA/engineering projection | orchestrator `engineeringAssessment` |
| Runtime Evidence | What was observed in Minecraft/runtime | runtime/telemetry/probe layers |

## Forbidden ambiguous canonical names

Do not introduce new canonical owners/files/types using:
- `project-policy`;
- generic `policy` for Behavior Contracts or Engineering Contracts;
- `game-design` as an engine-global authority directory/package;
- `gameplayWorld` as a new primary consumer model;
- `player-experience`, `entity-systems`, `arena-gameplay`, or `world-runtime` as knowledge-domain folders.

Legacy aliases may remain only when marked deprecated and must resolve to one canonical owner.

## Decision rule

Ask whether a statement would remain true if the map were replaced by a completely different map.

- **No** → Map Game Design / Behavior Contract.
- **Yes, because Minecraft behaves that way** → Platform Knowledge / Platform Rule.
- **Yes, because MIVUBI requires implementations to be safe that way** → Engineering Contract.
