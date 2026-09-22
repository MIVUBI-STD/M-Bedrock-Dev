# Next Action

Phase B now has a bounded runtime-control protocol.

Implemented:

1. generic runtime control plan from timed session scenarios;
2. small action vocabulary: assign/start/disconnect-request/reconnect/reset;
3. exact-tick queue in the development Script API harness;
4. scriptevent transport for control messages;
5. acknowledgement records for executed/failed actions;
6. no arbitrary command-execution surface;
7. explicit limitation: real network disconnect still needs an external client driver.

Next:

1. add project-specific control mappings/functions instead of direct tag conventions;
2. add acknowledgement parser and merge control evidence with observation evidence;
3. produce one end-to-end regression session report;
4. then local Minecraft validation of the multi-arena cutscene scenario.

The runtime-control layer is orchestration only, not gameplay authority.
