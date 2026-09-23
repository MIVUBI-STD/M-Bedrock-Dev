# Next Action

Script API intelligence now includes bounded receiver-type inference on top of event- and method-symbol compatibility.

Implemented:

1. direct `world.*` and `system.*` symbol extraction;
2. bounded type flow for Player, Entity, Dimension, Scoreboard, and ScoreboardObjective;
3. loop, array-callback, property-chain, explicit annotation, and simple local-return propagation;
4. inherited Player tag methods canonicalized to Entity symbols;
5. evidence-backed rules for `Dimension.getEntities` and Entity tag methods;
6. Scoreboard usage is recognized without inventing unsupported version minima;
7. unknown receiver paths remain unclassified.

Next priority:

1. derive a real-map method usage inventory and promote only frequently observed symbols into compatibility knowledge;
2. establish explicit Scoreboard/ScoreboardObjective method-version provenance before enabling version diagnostics for them;
3. correlate event/method symbol changes with Minecraft update regression evidence;
4. add deprecated and removed symbol states from official changelogs;
5. extend execution-privilege rules to inferred receiver methods where official restrictions are explicit;
6. keep inference bounded rather than introducing a full TypeScript compiler dependency.

Usage-driven expansion remains the default to keep the analyzer precise, maintainable, and low-noise.
