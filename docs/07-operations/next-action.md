# Next Action

Script API intelligence now includes deterministic signature/call-shape migration analysis.

Implemented:

1. method call observations now retain argument count and coarse argument kinds;
2. spread arguments are explicitly represented and remain unknown for deterministic arity checks;
3. analyzer-independent signature compatibility matrix;
4. `Entity.applyKnockback` 1.x four-number → 2.x VectorXZ + verticalStrength transition;
5. `Dimension.spawnEntity` optional third options argument transition;
6. `SCRIPT_API_SIGNATURE_INCOMPATIBLE` diagnostics;
7. signature incompatibility feeds reliability capability/risk surfaces;
8. per-map and portfolio usage inventory retain call-shape distributions;
9. signature-rule-only methods are treated as known usage rather than promotion gaps;
10. repository boundaries remain one-way: compatibility does not depend on analyzers.

Next priority:

1. add return-shape/type-contract migrations where official evidence and static usage make them observable;
2. model options-object field migrations only when real maps use the affected APIs and field access can be proven safely;
3. expand signature rules from production-map call-shape frequency, not broad API enumeration;
4. correlate incompatible call shapes with Minecraft update regression evidence;
5. continue execution-privilege checks for inferred receiver methods/properties;
6. keep semantic behavior changes with identical syntax in a separate runtime/differential evidence lane.

Call-shape migration is source-verified. Return-shape and deep options-object contract migration are now the largest Script API static-analysis blindspots.
