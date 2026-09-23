# Next Action

Structure commands are now correlated with actual parsed mcstructure content.

Implemented:

1. structure target resolution;
2. missing/ambiguous load detection;
3. includeEntities vs actual entity-content comparison;
4. includeBlocks vs actual block-content comparison;
5. integrity risk for command-block/container structures;
6. schedule on_area_loaded parsing;
7. conservative chunk-lifecycle risk when runtime-significant loaded content has no visible lifecycle evidence.

Next priority:

1. remove remaining static-analysis blindspots in command-block block_position_data inspection;
2. extract command text and command-block mode/state from mcstructure block-position data;
3. connect loaded command blocks back into the command dependency graph;
4. distinguish runtime command logic embedded inside structures from behavior-pack functions;
5. then deepen LevelDB/chunk runtime knowledge.

This is the point where mcstructure stops being only binary content and starts becoming executable gameplay state.
