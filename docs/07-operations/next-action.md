# Next Action

Remote static `@minecraft/server` compatibility architecture is source-complete for the current evidence-backed migration set.

Completed:

1. module/version and prerelease compatibility;
2. method/event/property/enum/type lifecycle;
3. bounded receiver, named-import, and namespace-import inference;
4. method signature/call-shape migration;
5. optional return contracts plus bounded local guard flow;
6. property mutability/write migration;
7. enum backing-value migration;
8. receiver-aware restricted execution, including restricted custom-command callbacks;
9. real-map usage and cross-map portfolio distributions;
10. Minecraft update/regression correlation.

Do not add another generalized static subsystem without new evidence.

Next phase:

1. run `script-usage` over representative production maps and retain distributions;
2. run version-aware comparison on real pre/post-update artifacts;
3. promote only observed unclassified symbols with official provenance;
4. add object-field rules only when production usage plus official field-level evidence exists;
5. validate real `.mcworld` import/load behavior;
6. validate entity/chunk/timing/multiplayer/runtime behavior in separate local/live proof lanes.

The next work is production validation and evidence ingestion, not speculative static expansion.
