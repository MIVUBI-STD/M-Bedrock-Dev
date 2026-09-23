# Next Action

Script API intelligence now includes usage-driven direct method symbols in addition to event-symbol granularity.

Implemented:

1. direct `world.*` and `system.*` method extraction without receiver-type guessing;
2. evidence-backed stable minima for `world.getAllPlayers`, `world.getDimension`, and `system.runInterval`;
3. method-level `SCRIPT_API_VERSION_INCOMPATIBLE` diagnostics;
4. official source provenance for every registered method rule;
5. unknown and nested receiver methods remain unclassified instead of being guessed.

Next priority:

1. ingest additional method symbols only when found in real map scripts;
2. add bounded receiver-type inference for high-value Entity, Player, Dimension, and Scoreboard calls when real-map evidence justifies it;
3. correlate method/event symbol changes with Minecraft update regression reports;
4. add deprecated and removed symbol states only when official changelogs document them;
5. keep broad API inventory generation out of the hot path.

Usage-driven expansion remains the default to keep compatibility knowledge maintainable, precise, and low-noise.
