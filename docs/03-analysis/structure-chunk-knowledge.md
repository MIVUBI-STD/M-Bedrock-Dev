# Structure and Chunk/Ticking Knowledge

The knowledge layer now covers structure-load semantics and chunk lifecycle signals.

## Structure load

The command analyzer extracts:

- structure identifier;
- rotation;
- mirror;
- animation mode/duration;
- includeEntities;
- includeBlocks;
- waterlogged;
- integrity;
- seed.

Important distinction:

```text
integrity < 100
→ intentionally probabilistic/partial block loading
```

This must not be diagnosed as random corruption without context.

The mcstructure adapter also summarizes whether a structure contains:

- entities;
- block-position data;
- command block palette entries;
- container-like palette entries.

## Chunk lifecycle

The analyzer recognizes:

- tickingarea add rectangle;
- tickingarea add circle;
- remove/remove_all;
- preload;
- list.

Knowledge distinguishes ordinary simulation-distance activity from persistent ticking areas.

A function that depends on remote command blocks/entities may therefore require chunk-lifecycle reasoning even when its commands are syntactically correct.


## Arena setup and runtime recovery

Chunk knowledge now distinguishes:

- player-driven pre-game coverage loading;
- explicit chunk-readiness evidence;
- temporary runtime recovery loading;
- command-backed ticking areas;
- pack-scoped Script API `TickingAreaManager` capacity.

See `chunk-runtime-loading.md` for the operational state machine and MIVUBI policy layer.
