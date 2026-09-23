# Education NPC and Code Builder Knowledge

The Education/creator knowledge layer now models NPC dialogue execution context.

## NPC dialogue

Typed command analysis recognizes:

- `dialogue open <npc> <player> [scene]`;
- `dialogue change <npc> <scene> [player]`;
- `@initiator` selectors.

Important context:

```text
@s
→ executing NPC in NPC-scene command context

@initiator
→ player who initiated the NPC dialogue
```

The two must not be treated as interchangeable in multiplayer logic.

NPC dialogue also has a chunk-lifecycle dependency: a hidden NPC used for forced dialogue still needs to exist in a loaded/ticking context.

## Education Code Builder

Minecraft Education is modeled as having a separate Code Builder / Agent capability family.

This knowledge is profile-scoped to the Education edition and is not automatically assumed for retail Bedrock worlds merely because a behavior pack contains generic commands or scripts.

## Current boundary

Agent internals are not decoded from world storage yet. The current layer records documented capability and runtime context only.
