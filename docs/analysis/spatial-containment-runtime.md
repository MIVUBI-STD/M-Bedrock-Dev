# World Bounds, Void, Dimension Geometry, and Spatial Containment

## Core problem

Multi-arena isolation is physical as well as logical.

Failures include:

- player escapes arena
- mob crosses into another arena
- projectile reaches neighboring arena
- anti-void callback returns player to old round
- selector radius captures neighboring entities
- world mutation opens a containment wall
- hard-coded Y limits fail in custom dimensions

## Arena volume contract

Each arena should define:

```text
dimensionId
playable bounds
setup/loader bounds
entity containment bounds
projectile/combat bounds
entry anchors
exit anchors
safe recovery anchors
void/fall thresholds
neighbor separation policy
```

## Dimension-first identity

Coordinates are incomplete without dimension.

```text
(100, 64, 100) Overworld
!=
(100, 64, 100) Nether
```

Always compare dimension before geometric bounds.

## Spatial evidence is not gameplay authority

Being inside Arena A does not automatically make a player/entity an Arena A participant. Critical logic requires both spatial evidence and current arena/generation identity.

## Out-of-bounds diagnosis

Before teleporting an escaped mob/player, classify likely cause:

- intended route extension
- knockback
- AI/path failure
- teleport failure
- containment wall mutation
- crowd displacement
- stale generation callback

## Void recovery

Recovery must be generation-scoped. An old anti-void timer/callback cannot return a player into a round that already ended.

## Vertical bounds

Use the actual dimension height range. Custom dimensions/world configs can change valid vertical ranges, so reusable logic must not assume one universal Y min/max.

## Cross-arena selector leakage

Bad:

```text
@e[r=80]
```

for critical arena ownership in dense layouts.

Prefer spatial filter plus arena/generation identity.

## Boundary invalidation

After structure/fill/setblock changes to walls, bridges, floors, gates, or void barriers, revalidate the containment contract before gameplay resumes.

## Analyzer diagnostics

- SPATIAL_ARENA_VOLUME_CONTRACT_MISSING
- SPATIAL_DIMENSION_IDENTITY_IGNORED
- SPATIAL_HARDCODED_Y_RANGE
- SPATIAL_PLAYER_OUT_OF_BOUNDS
- SPATIAL_ENTITY_OUT_OF_BOUNDS
- SPATIAL_PROJECTILE_CROSS_ARENA
- SPATIAL_SELECTOR_PROXIMITY_LEAK
- SPATIAL_BOUNDARY_MUTATION_UNVERIFIED
- SPATIAL_VOID_RECOVERY_STALE_GENERATION
- SPATIAL_OLD_ARENA_RECOVERY_TELEPORT
- SPATIAL_NEIGHBOR_SEPARATION_UNDECLARED
- SPATIAL_LOCATION_USED_AS_MEMBERSHIP_AUTHORITY
- SPATIAL_SAFE_RETURN_CHAIN_MISSING
- SPATIAL_CONTAINMENT_MONITOR_UNBOUNDED

## Review questions

1. What dimension owns this arena?
2. What are its exact playable and containment bounds?
3. Are Y limits derived from the dimension?
4. Can mobs/projectiles physically reach another arena?
5. Do proximity selectors include arena/generation identity?
6. What happens when a player/entity leaves the bounds?
7. Can old void-recovery callbacks fire after reset?
8. Did world mutation alter walls/floors/gates?
9. Is there a safe fallback chain?
10. Are boundary checks performance-bounded?