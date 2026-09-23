# Version-Aware Native and Script Regression Correlation

The comparison pipeline can combine:

```text
before mcworld
after mcworld
Minecraft update delta
map compatibility fingerprint
historical regression corpus
native LevelDB differential
Script API usage inventory
```

CLI:

```bash
npm run cli -- compare-update before.mcworld after.mcworld 1.26.40
```

For every update-delta entry that overlaps the map's domains or capability tags, the report records:

- update entry id and domain;
- overlapping map capabilities;
- historically related regression ids;
- native count deltas;
- number of changed native chunk signals.

For Script API update entries it additionally records `scriptEvidence`:

- whether the update changes the `@minecraft/server` module surface used by the map;
- module identifiers such as `@minecraft/server@2.9.0`;
- exact or normalized alias matches between observed map symbols and documented affected identifiers;
- occurrence counts before and after;
- source files before and after;
- current knowledge state for each matched symbol;
- unclassified Script API symbols observed in the compared artifacts.

## Symbol matching

Observed singleton/event syntax is normalized only through deterministic aliases:

```text
world.foo                         ↔ World.foo
system.foo                        ↔ System.foo
world.afterEvents.foo             ↔ WorldAfterEvents.foo
world.beforeEvents.foo            ↔ WorldBeforeEvents.foo
system.afterEvents.foo            ↔ SystemAfterEvents.foo
system.beforeEvents.foo           ↔ SystemBeforeEvents.foo
```

No fuzzy API-name matching is used.

A changelog identifier such as `WorldAfterEvents.playerCancelBreakingBlock` can therefore match real source usage such as `world.afterEvents.playerCancelBreakingBlock`, while unrelated symbols remain unmatched.

## Evidence strength

Two distinct signals are retained rather than collapsed:

1. **module-surface overlap** — the map uses Script API and the Minecraft update changes the declared `@minecraft/server` version/surface;
2. **symbol match** — a symbol actually observed in the map is named by the documented update evidence.

A symbol match is narrower evidence than a module-level overlap, but neither proves causation.

Native changes, Script API overlap, and historical regressions are correlation evidence only. They identify a smaller investigation surface for static/runtime validation.
