# Targeting and Filter Knowledge

Entity analysis now extracts target-acquisition semantics from:

- `minecraft:behavior.nearest_attackable_target`;
- `minecraft:behavior.nearest_prioritized_attackable_target`.

Extracted evidence includes:

- configured `entity_types` count;
- `is_family` targets nested inside filter trees;
- per-target `max_dist`;
- `must_see`;
- `must_reach`;
- `within_radius`;
- `reselect_targets`;
- `reevaluate_description`.

A target behavior with an empty `entity_types` array does not receive the `targeting:configured-entity-types` capability.

This lets the knowledge graph distinguish:

```text
movement goal exists
but
target acquisition is not actually configured
```

from a pure navigation/pathing problem.

Navigation states also expose explicit variant capabilities such as:

- `navigation:variant:walk`;
- `navigation:variant:generic`;
- `navigation:variant:swim`;
- `navigation:variant:fly`;
- `navigation:variant:hover`;
- `navigation:variant:climb`.

Variant identity and individual path flags remain separate evidence.
