# Next Action

Script API lifecycle intelligence now covers methods, events, properties, and enum members.

Implemented:

1. version-aware lifecycle states: active, deprecated, removed, unknown;
2. method/event legacy migration detection;
3. bounded property receiver inference;
4. `PlayerInputPermissions.cameraEnabled/movementEnabled` deprecation/removal detection;
5. named-import enum member extraction with alias support;
6. lowercase `GameMode` 2.0.0 removal and uppercase replacement knowledge;
7. documented removal rules for `EntityDamageCause.suicide` and `EntityComponentTypes.GroundOffset`;
8. property/enum symbols included in real-map usage inventory and portfolio aggregation;
9. event-container scaffolding excluded from property promotion noise;
10. lifecycle diagnostics continue feeding reliability risk surfaces.

Next priority:

1. add type-only/imported type symbol lifecycle intelligence for removed classes, interfaces, and aliases;
2. model method/function signature migrations where the symbol survives but parameter or return contracts change;
3. model enum backing-value changes separately from member removal;
4. add bounded namespace-import support only if production-map evidence shows meaningful usage;
5. run lifecycle inventory against representative production maps and promote only observed high-value gaps;
6. continue execution-privilege enrichment for inferred receiver methods/properties where restrictions are explicit.

Method/event/property/enum lifecycle coverage is source-verified. Type/signature/value-shape migration remains the largest static Script API blindspot.
