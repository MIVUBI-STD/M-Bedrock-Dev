# Next Action

Deprecated and removed Script API lifecycle intelligence is now implemented for observable method and event symbols.

Implemented:

1. version-aware lifecycle states: active, deprecated, removed, unknown;
2. documented 1.x deprecation → 2.0.0 removal transitions;
3. `SCRIPT_API_DEPRECATED_SYMBOL` minor diagnostics;
4. `SCRIPT_API_REMOVED_SYMBOL` critical diagnostics;
5. official replacement metadata where Microsoft documents a replacement;
6. inherited Player legacy methods canonicalized to Entity symbols;
7. lifecycle metadata retained in Script API usage inventory;
8. lifecycle findings feed reliability risk surfaces;
9. official provenance for the initial legacy method/event seed.

Next priority:

1. add deterministic property-access symbol extraction so removed properties such as PlayerInputPermissions.cameraEnabled/movementEnabled can be detected;
2. add enum/member lifecycle intelligence for documented removals such as lowercase GameMode values without guessing dynamic values;
3. run lifecycle analysis against representative production maps to learn which legacy surfaces are actually present;
4. expand lifecycle rules only from observed map usage plus official evidence;
5. continue execution-privilege enrichment for inferred receiver methods;
6. keep type/signature migration analysis separate from simple removed-symbol detection.

Method/event lifecycle coverage is source-verified. Property, enum, and argument-shape lifecycle coverage remains an explicit blindspot.
