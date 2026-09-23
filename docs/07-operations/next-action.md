# Next Action

Version-aware regression correlation is now available.

Implemented:

1. compare two artifacts under one target Minecraft update;
2. load the repo-owned update delta, regression corpus and coverage catalog;
3. generate retest plans for before/after fingerprints;
4. correlate update entries with map domains/capabilities;
5. attach historical regression ids;
6. attach bounded native LevelDB count/chunk-signal deltas;
7. CLI:
   `npm run cli -- compare-update before.mcworld after.mcworld <version>`.

Next priority:

1. feed known real-map before/after update pairs into this correlation engine;
2. measure which update entries repeatedly co-occur with known failures;
3. keep repeated correlations as observed knowledge, not documented truth;
4. expand NPC dialogue scene graph and Education world mechanics;
5. add Script API version matrix after real-map regression intake.

Do not auto-assign causation from correlation evidence.
