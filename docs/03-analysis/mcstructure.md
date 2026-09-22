# mcstructure Analysis

Initial normalized facts:

- format version when present;
- structure size;
- saved world origin;
- block palette entries;
- block index layers;
- entity list;
- block position data as preserved opaque semantic payload.

Minecraft's structure system saves/loads both blocks and entities, and saved blocks retain state and block-associated information. citeturn490291search0

## Deliberate limits

The initial adapter does not claim:

- complete interpretation of every block/entity NBT field;
- world-space placement without a `structure load` execution target;
- rotation/mirror application;
- palette mutation;
- entity mutation;
- Minecraft runtime equivalence.

Those require dedicated analyzers/repair logic.
