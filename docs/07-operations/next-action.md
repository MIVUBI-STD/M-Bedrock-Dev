# Next Action

Structure and chunk/ticking knowledge foundations are now being connected to inspection.

Implemented:

1. /structure load option parsing;
2. rotation/mirror/animation/include/integrity/seed semantics;
3. mcstructure content summaries;
4. tickingarea command parsing;
5. simulation-distance/ticking-area knowledge catalogs;
6. preload/load-order knowledge;
7. structure/chunk runtime summary.

Next priority:

1. connect structure-load records to the actual referenced mcstructure model;
2. compare includeEntities/includeBlocks intent against structure contents;
3. add schedule on_area_loaded semantics;
4. detect remote runtime logic with no observable chunk-lifecycle protection;
5. add conservative diagnostics for probable load-order/chunk-lifecycle risks.

Do not claim chunk runtime failure from static analysis alone.
