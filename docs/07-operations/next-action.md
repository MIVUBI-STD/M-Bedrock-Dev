# Next Action

Phase B now has a shared Runtime Observation Contract.

Implemented:

1. pure multiplayer/session model;
2. generative action sequences;
3. reusable invariants;
4. runtime player/arena/entity/chunk observation schema;
5. normalization with explicit unknown evidence;
6. expected-model vs runtime divergence reporting.

Next:

1. targeted concurrency/timing perturbation scenarios;
2. regression-specific generators for the known cutscene/session isolation bug;
3. observation adapters for scoreboard/tag-driven Bedrock state;
4. only then connect a GameTest/live Minecraft runner.

Runtime adapters must emit evidence; they must not duplicate correctness rules.
