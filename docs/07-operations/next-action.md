# Next Action

Phase B now has a Script API/GameTest-compatible runtime evidence emitter.

Implemented:

1. player capture through tags + selected scoreboard objectives;
2. arena score capture through configured scoreboard participants;
3. selected entity capture by dimension query;
4. server tick capture;
5. optional version/artifact provenance;
6. capture failures preserved as explicit issues;
7. raw capture → semantic observation pipeline;
8. no direct @minecraft/server dependency in reusable core.

Next:

1. create a deployable thin Script API harness/example pack that passes real world/system objects into the emitter;
2. define output transport for snapshots (script event / console / persisted capture);
3. run the historical cutscene concurrency scenario in live Minecraft;
4. compare captured snapshots against the deterministic expected model.

The runtime harness must remain transport-only; correctness stays in packages/reliability.
