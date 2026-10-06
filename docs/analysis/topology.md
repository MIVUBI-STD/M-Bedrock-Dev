---
id: document.analysis.topology
class: DOCUMENT
domain: analysis
role: DOMAIN
authority: CANONICAL
lifecycle: ACTIVE
---

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

## Topology candidates and outliers

Repeated resolved effects may be grouped by translation-invariant signatures to identify duplicated spatial regions without prematurely naming them arenas.

Automatic linear-outlier detection must remain conservative. A candidate requires enough repeated effects, a stable plane/axis, a dominant step, and one interior coordinate that disagrees with both neighboring expectations.

Non-linear layouts, rings, grids, and noisy patterns remain candidates rather than automatic defects.

## Native chunk correlation

Absolute structure-load destinations may be correlated to chunk coordinates observed by native LevelDB evidence.

Static absolute block coordinates convert to chunk coordinates by floor division by 16. Relative/local destinations remain unresolved without trusted execution context.

Native correlation means only that world storage contains evidence for the correlated chunk coordinate in one or more observed dimensions.

It does not prove that the structure load executed, that the same dimension was used, that the chunk was ticking at failure time, or that gameplay succeeded there.

Native LevelDB scanning/decoding remains owned by world-database/native-evidence analysis; topology only consumes the bounded correlation result.