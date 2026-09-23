# Next Action

Script API intelligence now includes bounded return-contract migration analysis.

Implemented:

1. deterministic method result-use classification;
2. analyzer-independent return-contract compatibility matrix;
3. `Entity.getComponent` optional-return transition at `@minecraft/server 1.18.0`;
4. `SCRIPT_API_RETURN_CONTRACT_RISK` for direct dereference after the transition;
5. optional chaining and non-null assertion recognized separately;
6. assigned/returned results remain unknown rather than being guessed unsafe;
7. return-contract findings feed reliability capability/risk surfaces;
8. real-map usage inventory retains result-use distributions;
9. return-contract-only methods are treated as known usage;
10. official provenance is stored in the Script API knowledge catalog.

Next priority:

1. add bounded guarded-flow analysis for locally assigned optional results only when null/undefined guards are structurally obvious;
2. model options-object field migrations where real map usage and official changelog evidence justify it;
3. add type-only/imported type lifecycle intelligence for removed classes/interfaces/aliases;
4. expand return-contract rules from production-map usage frequency rather than broad API enumeration;
5. correlate return-contract exposure with Minecraft update regression evidence;
6. keep semantic behavior changes with identical syntax in runtime/differential lanes.

Direct return-contract analysis is source-verified. Deep guarded-flow and object-shape migration remain the largest Script API static-analysis blindspots.
