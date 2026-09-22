# Coordinate Context and Derived Topology

Topology is derived analysis, not a core Bedrock primitive.

## Coordinate resolution

Raw coordinates preserve their mode: absolute, relative, or local.

Relative coordinates can be resolved when a trusted execution origin is known.

Local coordinates require both an origin and a local basis. They remain unresolved when facing/orientation context is unknown. The analyzer must never invent a world-space position for unresolved local coordinates.

## Repeated translated effects

Resolved effects can be compared by translation-invariant shape signatures.

Example:

```text
fill region A
+ offset (100, 0, 0)
= equivalent fill region B
```

This identifies repeated spatial patterns without declaring them arenas. Higher-level analyzers may later group multiple consistent translated effects into topology candidates.

## State scope

Selectors are classified conservatively as self, nearest, all players, all entities, filtered, or unknown.

Broad writes such as @a or @e are surfaced as potential cross-scope state risks. They are not automatically bugs: project/gameplay intent must be considered.
