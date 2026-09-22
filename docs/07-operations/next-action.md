# Next Action

Phase B generative reliability testing has started with multiplayer/session lifecycle.

Implemented:

1. pure multiplayer session state model;
2. join/assign/start/play/progress/complete/disconnect/reconnect/reset actions;
3. reusable session invariant checker;
4. fast-check property-based sequence generation and shrinking;
5. concurrent-arena cutscene behavior modeled as independent;
6. disconnect/reconnect reset semantics modeled.

Next:

1. add model-based runtime observation contract so Minecraft state snapshots can be compared with this model;
2. add targeted concurrency scenarios and timing perturbations;
3. add regression-specific generators for known cutscene/session failures;
4. only then connect to GameTest/live Minecraft automation.

The generative model is expected behavior, not runtime proof.
