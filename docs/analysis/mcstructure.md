---
id: document.analysis.mcstructure
class: DOCUMENT
domain: analysis
role: REFERENCE
authority: CANONICAL
lifecycle: ACTIVE
---

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

## Runtime-significant structure content

Structure analysis also owns semantic inspection of embedded runtime state.

### Embedded command blocks

A block-position entry is treated as a command block only when command text and command-block identity are both supported by structure evidence.

Extracted evidence may include command text, local coordinate/index, block identity, activation state, conditional state, tick delay, execute-on-first-tick, and output tracking.

Embedded commands are analyzed through the same typed command semantics used for mcfunction content.

### Embedded command graph

Embedded commands become semantic graph nodes:

```text
structure
→ embedded command
   ├→ function
   ├→ structure
   ├→ scoreboard read/write
   └→ tag/state mutation
```

This keeps runtime logic stored inside structures visible to dependency analysis.

### Structure load correlation

Each structure-load reference is classified as resolved, missing, or ambiguous.

For resolved loads, compare command options with actual structure content, including entity/block inclusion, integrity, command-block/container significance, and relevant residency dependencies.

Explicit exclusion may be intentional. Partial integrity becomes material only when it can remove gameplay-significant content.

### Local command-chain topology

Command-block facing and conditional state may derive local predecessor/successor topology.

A conditional chain node with no supported predecessor is a structural risk. Local topology is stronger evidence than inferred world placement.

### Placement transform

Absolute structure loads may derive candidate world-space positions from local coordinates, mirror, rotation, and load origin.

When transformation order or pivot semantics are not fully authoritative, world placement remains explicitly inferred and cannot alone prove runtime failure.

### Chunk/ticking relation

Structure content may create dependencies on remote chunk/ticking readiness.

Structure presence or configuration does not prove runtime residency. Runtime readiness remains owned by chunk/simulation analysis.