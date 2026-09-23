# Native World DB Evidence

Artifact inspection now has an optional native LevelDB evidence lane.

## Flow

```text
extracted working world
→ db/ exists?
→ dedicated temporary LevelDB snapshot
→ bounded key/value metadata scan
→ actor/chunk runtime summary
→ cleanup snapshot
```

The main inspection does not fail when native LevelDB inspection fails.

Instead the result records:

- status = not-present | scanned | failed;
- entries scanned;
- truncation state;
- actor and actor-digest record counts;
- chunk-data record count;
- BlockEntity records;
- PendingTicks records;
- RandomTicks records;
- FinalizedState records;
- SubChunk records;
- observed dimensions;
- unique observed chunk coordinates.

## Safety boundary

Values are not decoded merely because their key family is recognized.

This lane provides native runtime-state evidence without inventing version-sensitive value semantics.
