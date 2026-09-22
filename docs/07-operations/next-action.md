# Next Action

Phase B now includes targeted concurrency and timing perturbation for multiplayer/session lifecycle.

Implemented:

1. pure multiplayer state model;
2. generic generated action sequences;
3. runtime observation contract;
4. deterministic tick-ordered scenarios;
5. 0–2 tick concurrent arena-start perturbation;
6. disconnect/reset disturbances around arena start;
7. regression-specific cutscene queue generator;
8. independent-arena cutscene oracle.

Next:

1. scoreboard/tag observation adapter;
2. mapping rules from real Bedrock scoreboard/tag conventions into player/arena observations;
3. capture ambiguity as unknown evidence rather than guessing;
4. then GameTest/Script API runtime emitter.

The timing model is deterministic evidence generation, not live Minecraft proof.
