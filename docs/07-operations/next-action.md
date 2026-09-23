# Next Action

mcstructure runtime content is now being treated as executable gameplay state.

Implemented:

1. conservative command-block extraction from block_position_data;
2. command text/state extraction;
3. local structure coordinate recovery;
4. queued tick presence detection;
5. embedded command text re-analysis through typed command semantics;
6. informational diagnostics for embedded commands without a typed effect model.

Next priority:

1. add embedded command nodes to the semantic graph;
2. connect function/structure/scoreboard/tag dependencies originating inside mcstructure command blocks;
3. carry structure-load transform context to embedded command world-space reasoning;
4. model command-block chain/conditional execution evidence where NBT/state is available;
5. deepen chunk/ticking runtime analysis with LevelDB observations.

The structure layer is now transitioning from binary inspection to executable-state analysis.
