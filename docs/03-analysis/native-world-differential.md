# Native World Differential Evidence

Native LevelDB summaries can now be compared across two artifact inspections.

The differential compares:

- actor records;
- actor digest records;
- total chunk records;
- block-entity records;
- pending/random ticks;
- finalized state;
- subchunk records;
- unique observed chunks;
- bounded per-chunk recognized-kind sets.

The result distinguishes:

- added chunk signals;
- removed chunk signals;
- changed chunk signal kinds.

## Intended use

```text
same map before Minecraft update
vs
same map after Minecraft update
```

or:

```text
before repair
vs
after repair
```

The diff is structural native-world evidence only. A changed count or chunk signal is not automatically a bug.

If either native scan failed, the diff explicitly reports `comparable = false`.
