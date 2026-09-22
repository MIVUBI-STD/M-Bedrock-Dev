# Topology Candidates

Topology is derived evidence, not a hard-coded arena concept.

## Repeated spatial effects

Translation-invariant signatures group repeated fill/setblock/clone/teleport shapes. These candidates can reveal duplicated gameplay regions without naming them arenas.

## Automatic linear outliers

Automatic outlier diagnostics are intentionally conservative.

They require:

- at least four effects with the same translation-invariant shape;
- the same Y plane;
- one constant horizontal axis;
- a unique dominant step repeated at least twice;
- a single interior coordinate that disagrees with both neighboring expected positions.

Example:

```text
0, 100, 198, 300, 400
```

with dominant step 100 yields expected 200 for the third point.

Non-linear layouts, rings, grids, and weak/noisy patterns are not auto-diagnosed. They remain topology candidates for higher-level or explicit expected-offset analysis.
