# NPC Dialogue Scene Graph

NPC dialogue JSON is now parsed as executable gameplay content.

## Parsed scene content

The parser recognizes documents with:

`minecraft:npc_dialogue.scenes`

and extracts:

- scene_tag;
- on_open_commands;
- on_close_commands;
- button commands;
- button index;
- command trigger context.

Slash-prefixed commands are normalized before entering the shared typed command analyzer.

## Graph

```text
dialogue scene
  └─ CONTAINS → scene command
                    ├─ CALLS → function
                    ├─ LOADS_STRUCTURE → structure
                    ├─ READS/WRITES_SCOREBOARD
                    ├─ WRITES_TAG
                    └─ REFERENCES_DIALOGUE_SCENE → next scene
```

This captures branching dialogue implemented with `dialogue open/change`.

## Multiplayer context

Commands may reference `@initiator`, which is intentionally kept distinct from `@s`.

Duplicate scene tags are reported directly, while missing scene references participate in normal unresolved-reference diagnostics.
