# Next Action

Current phase: first Bedrock-aware discovery/analyzer contracts exist.

Next architecture topic: **Diagnostics + Function/Command Coverage**.

Recommended next work:

1. introduce typed diagnostics and finding provenance;
2. convert unresolved/ambiguous graph edges into actionable findings;
3. detect duplicate manifest UUIDs and malformed/missing dependency identities;
4. expand command analysis for `execute ... run` nested commands;
5. model `fill`, `setblock`, `clone`, `tp/teleport` and coordinate regions as typed effects;
6. create command-effect nodes only where they materially improve queries;
7. add first regression fixtures based on real Bedrock defects;
8. then connect actual archive/file inventory transport to these analyzers.

Arena and multiplayer analysis should consume typed coordinate/state effects rather than parse command strings independently.
