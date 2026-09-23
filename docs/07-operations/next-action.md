# Next Action

Native Bedrock world-state evidence is now entering artifact inspection.

Implemented:

1. dedicated LevelDB snapshot for inspection;
2. bounded native metadata scan;
3. non-fatal native-reader failure handling;
4. actor/digest/chunk summaries;
5. BlockEntity/PendingTicks/RandomTicks/FinalizedState/SubChunk evidence;
6. observed dimension and chunk-coordinate counts.

Next priority:

1. correlate native chunk coordinates with structure-load destinations and runtime-sensitive command blocks;
2. distinguish static structure content from existing world BlockEntity state;
3. add versioned value decoders only for schemas backed by official documentation or verified fixtures;
4. parse NPC dialogue scene JSON and connect scene commands to the semantic graph;
5. expand Education allow/deny/border/portfolio/camera knowledge where documented.

Unknown LevelDB values remain opaque by design.
