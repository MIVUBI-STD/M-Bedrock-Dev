# Next Action

Embedded command blocks inside mcstructure are now entering the semantic dependency graph.

Implemented:

1. command nodes scoped to their containing structure;
2. structure CONTAINS command edges;
3. embedded function-call edges;
4. embedded structure-load edges;
5. embedded scoreboard read/write edges;
6. embedded tag-write edges;
7. scoreboard/tag state identifiers derived from embedded commands;
8. normal unresolved-reference diagnostics now cover embedded command logic.

Next priority:

1. carry structure-load rotation/mirror/placement context into embedded command coordinate reasoning;
2. reconstruct command-block chain adjacency/facing from palette states;
3. model conditional/always-active/delay execution constraints;
4. then deepen LevelDB/chunk runtime observation knowledge.

This closes the static gap where executable logic existed only inside a loaded structure.
