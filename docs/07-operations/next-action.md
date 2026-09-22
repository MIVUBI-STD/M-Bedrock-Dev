# Next Action

Phase B now has a deployable live Bedrock evidence harness and offline log ingestion.

Implemented:

1. Script API development behavior-pack harness;
2. scheduled evidence capture with system.runInterval;
3. player tags/scores capture;
4. arena scoreboard capture;
5. selected entity evidence capture;
6. structured console transport with [M-BEDROCK-OBS] prefix;
7. offline content-log parser;
8. correctness remains outside the runtime pack.

Next:

1. build live regression runner that aligns a timed scenario with captured ticks;
2. compare observed snapshots against the expected session model at checkpoints;
3. produce a compact incident bundle on first divergence;
4. first target: historical multi-arena cutscene queue regression.

The harness is development instrumentation, not production gameplay code.
