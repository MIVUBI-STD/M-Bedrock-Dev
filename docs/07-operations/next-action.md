# Next Action

Reliability intelligence now supports portfolio-level Minecraft update impact planning.

Implemented:

1. persistent regression and coverage catalogs;
2. sourced Minecraft update deltas;
3. automatic per-map compatibility fingerprints;
4. per-map retest planning;
5. multi-map priority grouping for one update;
6. optional stored fingerprint cache lane.

Next high-value step:

1. Phase B generative/state-machine testing;
2. start with multiplayer/session lifecycle because historical regression and coverage gaps already justify it;
3. model join/start/disconnect/reconnect/reset/concurrent-start sequences;
4. keep runtime execution separate until the generated state model and invariants are deterministic.

Do not treat P3 as proof of safety.
