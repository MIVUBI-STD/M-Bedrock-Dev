# Advanced Dynamic Invariant Mining

Invariant mining now accounts for diversity, raw Bedrock state relations, transitions, entity spatial context and Minecraft version scope.

## Diversity-aware support

Raw snapshot count is no longer sufficient.

Each candidate records:

- observations;
- distinct semantic states;
- distinct Minecraft versions;
- antecedent matches;
- satisfied observations;
- counterexamples;
- confidence.

Default support requires at least three distinct semantic states in addition to antecedent/confidence thresholds.

Thirty copies of one identical state therefore remain weak evidence.

## Score/tag relations

Configured relations can test patterns such as:

```text
tag role:runner
→ scoreboard stage is present/nonzero
```

These relations are opt-in because objective/tag naming is project-specific.

## Transition invariant

The miner now evaluates:

```text
playing at t
+
playing at t+1
→ progress(t+1) >= progress(t)
```

Only snapshots with explicit ticks and explicit progress participate.

## Entity relationships

The miner can evaluate:

```text
entity.arenaId = arena1
→ tag arena:arena1 exists
```

and, when an explicit arena region is supplied:

```text
entity.arenaId = arena1
→ entity position remains inside arena1 region
```

Spatial regions are configuration/evidence, never inferred from arbitrary entity positions.

## Version scope

Each candidate records the Minecraft versions represented by its supporting traces.

When a current target version is supplied and the candidate has no evidence from that version, a previously supported candidate becomes:

```text
stale
```

A stale candidate cannot produce a promotion draft until new-version evidence exists.

This directly addresses Minecraft-update risk: historical behavior is not assumed to remain invariant across engine versions.

## Promotion

Only candidates that are:

- supported;
- diverse enough;
- version-current;
- free of historical/mutation challenges

may produce a review draft.

Promotion remains human-gated.
