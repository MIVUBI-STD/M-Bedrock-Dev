# Next Action

Phase B now has a declarative Bedrock scoreboard/tag observation adapter.

Implemented:

1. pure multiplayer/session state model;
2. generative sequences and timing perturbation;
3. runtime observation contract;
4. expected-vs-runtime divergence;
5. explicit scoreboard/tag-to-observation mapping;
6. ambiguity reporting for conflicting arena/phase evidence;
7. default reusable arena/session naming convention.

Next:

1. Script API/GameTest-compatible raw state emitter;
2. emit player tags and scoreboard values into the shared observation contract;
3. keep capture separate from correctness;
4. then run the historical cutscene concurrency scenario against live Minecraft.

Project mappings must be explicit when objective/tag naming differs from the default convention.
