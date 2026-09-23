# Next Action

Remote static `@minecraft/server` compatibility architecture is complete for the current evidence-backed migration set.

Completed:

1. module/version and stable/beta/internal track compatibility;
2. event, method, property, enum, and imported-type lifecycle;
3. bounded receiver, property, named-import, namespace-import, and local guarded-flow inference;
4. method signature/call-shape migration;
5. optional return-contract migration;
6. property mutability/read-only migration;
7. enum member removal and enum backing-value migration;
8. receiver-aware restricted execution for before-events and custom-command callbacks, with startup kept in the distinct early-execution lane;
9. real-map usage distributions for symbols, call shapes, result uses, property writes, and enum literal comparisons;
10. cross-map portfolio aggregation and usage-driven knowledge promotion;
11. Script API ↔ Minecraft update/regression correlation;
12. repository architecture boundaries remain one-way and verified.

Do not add another generalized static subsystem without new production evidence.

Next proof phase:

1. run `script-usage` over representative production `.mcworld` artifacts;
2. run `compare-update` against real pre/post-update artifacts;
3. promote only observed unclassified symbols with official provenance;
4. add field-level/object-shape rules only when real map usage plus official field-level evidence exists;
5. validate genuine Minecraft import/load acceptance;
6. validate entity AI, chunks, saved ticks, timing, multiplayer, and semantic behavior in local/live runtime lanes.

Further source expansion is triggered by evidence from production maps or new official API changes, not by broad API enumeration.
