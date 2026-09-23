# Next Action

Usage-driven Script API inventory is now implemented on top of bounded receiver inference.

Implemented:

1. per-map `scriptApiUsage` in inspection results;
2. event and method occurrence inventory with source-file evidence;
3. known versus unclassified symbol classification;
4. direct/bounded receiver inference counts and receiver-type evidence;
5. multi-map portfolio aggregation;
6. `promotionCandidates` ordered by cross-map coverage before raw frequency;
7. CLI: `npm run cli -- script-usage <map1.mcworld> [map2.mcworld ...]`;
8. unknown symbols remain knowledge gaps and never become diagnostics automatically.

Next priority:

1. run the portfolio inventory against a representative production-map set and retain the resulting symbol distribution as evidence;
2. establish method-level provenance for the most frequent unclassified symbols, starting with Scoreboard/ScoreboardObjective only if real-map coverage supports it;
3. correlate observed event/method symbols with Minecraft update regression evidence;
4. add deprecated and removed symbol states from official changelogs;
5. extend execution-privilege rules to inferred receiver methods where restrictions are explicit;
6. add longitudinal usage snapshots only after real portfolio runs justify historical tracking.

Usage-driven expansion remains the default. Broad API inventory generation stays out of the hot path.
