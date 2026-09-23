# Embedded Structure Runtime Content

The mcstructure adapter now inspects block-position data for executable/runtime state.

## Command blocks

A block-position entry is accepted as a command block only when:

1. `block_entity_data.Command` is a string; and
2. either the structure palette identifies a command-block variant or the block entity id is `CommandBlock`.

Extracted state includes:

- command text;
- flat structure index;
- local structure coordinate;
- palette/block-entity identity;
- always-active/redstone state when available;
- conditional state when available;
- powered state;
- execute-on-first-tick;
- tick delay;
- output tracking.

Command text is then passed through the same typed command analyzer used for mcfunction content.

## Queued ticks

The adapter also counts block-position entries carrying queued tick data.

This matters because loading a structure can restore runtime-significant block state, not only static block permutations.

## Evidence boundary

NBT field interpretation is conservative and incomplete. Unknown block-entity fields are preserved in the raw structure model and are not guessed.
