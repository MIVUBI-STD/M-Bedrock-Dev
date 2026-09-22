# Next Action

Phase B now has an offline live-regression runner over captured Minecraft evidence.

Implemented:

1. deployable Script API evidence harness;
2. content-log snapshot ingestion;
3. explicit runtime tick anchor;
4. expected state reconstruction per captured tick;
5. runtime/model comparison at checkpoints;
6. first-divergence incident bundle;
7. nearby snapshot context;
8. 0/1/2-tick multi-arena cutscene regression scenarios.

Next:

1. add a thin runtime-control protocol for triggering named test actions at exact ticks;
2. keep action execution separate from evidence capture;
3. implement only the small action vocabulary required by session regressions;
4. then run the cutscene scenario end-to-end in a local Minecraft environment.

Do not infer scenario start ticks from logs.
