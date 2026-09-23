# Structure Load Correlation

Structure analysis now connects command intent to the parsed mcstructure actually referenced.

## Resolution states

Each structure load is classified as:

- resolved;
- missing;
- ambiguous.

## Content-aware checks

For a resolved load, inspection compares:

- includeEntities vs actual entity count;
- includeBlocks vs palette content;
- integrity vs command-block/container content;
- runtime-significant command-block content vs available chunk-lifecycle evidence.

Explicitly excluding entities or blocks is informational because it may be intentional.

Integrity below 100 with command-block/container content is stronger because partial loading can selectively remove runtime-significant blocks.

## Chunk lifecycle caution

If analyzed functions load structures containing command blocks but contain no tickingarea or schedule on_area_loaded evidence, inspection reports a chunk-lifecycle risk as informational only.

It does not claim failure because player proximity, world-level ticking configuration, scripts, or other runtime systems may still keep the destination active.
