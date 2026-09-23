# Version-Aware Native Regression Correlation

The comparison pipeline can now combine:

```text
before mcworld
after mcworld
Minecraft update delta
map compatibility fingerprint
historical regression corpus
native LevelDB differential
```

CLI:

```bash
npm run cli -- compare-update before.mcworld after.mcworld 1.26.40
```

For every update-delta entry that overlaps the map's domains or capability tags, the report records:

- update entry id/domain;
- overlapping map capabilities;
- historically related regression ids;
- native count deltas;
- number of changed native chunk signals.

This is correlation evidence only.

A native delta and an update-note overlap do not prove causation. They identify a narrower investigation surface for static/runtime validation.
