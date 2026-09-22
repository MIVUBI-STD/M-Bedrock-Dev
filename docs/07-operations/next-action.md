# Next Action

Current phase: artifact/archive and normalized graph foundations exist at contract/source level.

Next architecture topic: **Content Discovery + First Bedrock Analyzers**.

Recommended order:

1. physical file inventory and cheap content classification;
2. pack/world discovery without deep parsing;
3. manifest analyzer and pack identity normalization;
4. `.mcfunction` parser focused on function calls, structure loads and scoreboard/tag usage;
5. reference resolver that emits resolved/unresolved/ambiguous graph edges;
6. structure reference inventory without yet implementing full NBT structure mutation;
7. diagnostics generated from graph facts;
8. serialized index/cache only after actual analyzer outputs prove what must persist.

Arena and multiplayer topology remain derived analyzers, not core graph primitives.
