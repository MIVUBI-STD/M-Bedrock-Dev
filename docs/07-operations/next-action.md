# Next Action

Native-world differential analysis now has a direct artifact comparison entrypoint.

Implemented:

1. compare two mcworld/zip artifacts through the same inspection pipeline;
2. reuse the same knowledge catalog for both sides;
3. compare fingerprints and diagnostic counts;
4. compare native LevelDB summaries using bounded world-state diffs;
5. CLI entrypoint:
   `npm run cli -- compare <before.mcworld> <after.mcworld>`.

Recommended next proof work:

1. use the same real map before/after a Minecraft update;
2. compare native chunk signals around known runtime-sensitive structures;
3. record which native changes correlate with known regressions;
4. promote only repeatable correlations into regression knowledge;
5. continue Education scene/NPC graph support separately.

The comparison tool reports differences; it does not label a native change as a bug without additional evidence.
