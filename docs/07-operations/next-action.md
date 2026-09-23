# Next Action

NPC dialogue scene graphs and Education specialty-block compatibility are now covered.

Implemented:

1. content-based minecraft:npc_dialogue parsing;
2. scene nodes and scene-command nodes;
3. on-open/on-close/button command analysis;
4. scene-to-scene branching references;
5. duplicate and unresolved scene diagnostics;
6. shared command dependency owner across structure/dialogue commands;
7. allow/deny/border palette detection;
8. Education feature-state diagnostics for specialty blocks;
9. documented Education permission-block semantics.

Next priority:

1. add dialogue-scene counts and multiplayer state surfaces to reliability fingerprints;
2. derive allow/deny/border spatial regions when real world/block-position evidence is available;
3. add immutable-world/worldbuilder setting extraction from world metadata;
4. build Script API stable/beta version matrix;
5. continue validating against real Education maps rather than expanding speculative rules.

Permission-block presence is compatibility evidence, not standalone proof of a movement/build bug.
