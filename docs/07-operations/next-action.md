# Next Action

Native-world evidence now supports both spatial correlation and differential comparison.

Implemented:

1. embedded command world/chunk placement correlation contract;
2. native BlockEntity/PendingTicks/RandomTicks evidence annotation;
3. native summary count deltas;
4. bounded added/removed/changed chunk-signal diffs;
5. non-comparable state when either native scan failed;
6. explicit truncation semantics.

Next priority:

1. expose placed embedded commands directly from structure inspection;
2. correlate each transformed command block with native chunk signals in inspectArtifact;
3. add a CLI/API comparison entrypoint for two mcworld artifacts;
4. use update-version fingerprints alongside native-world diffs;
5. then parse NPC dialogue scene JSON and Education-specific world mechanics.

Differential evidence must remain descriptive until a regression invariant or runtime observation explains the change.
