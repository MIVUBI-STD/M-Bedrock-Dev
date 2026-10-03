# Real Map Audit — Composite Challenge v1.1.1

Status: source-proven real-map audit evidence

Target artifact SHA-256: `c7a208ccb943d214de6bb6d2f15f265f8dba2b794ae56da40a11bef24162776a`

## Proven finding 1

### BUG — Arena-specific ticking areas are declared but never created

Severity: Blocker

Composite defines arena-specific ticking areas for every arena, but the only runtime `tickingarea add` path reads `WorldData.tickingarea`, which contains only `lobby` and `permission`. The per-arena `tickingAreas` configuration is offset for all six arenas but is never materialized into Minecraft ticking areas. A raw DB string search also found no persisted arena ticking-area names such as `arena_1_red_team` or `arena_1_blue_team`.

Expected: started arenas must create their declared simulation regions before remote spawn/pathing/structure logic depends on them.

Observed source evidence:
- `chunk-WYD2CS7M.js`: arena template declares `arena_1_red_team`, `arena_1_blue_team`, and lobby ticking areas.
- `chunk-WYD2CS7M.js`: `createArenaConfig()` clones/offsets the two arena regions for all six arenas.
- `chunk-KPA6ZKUE.js`: `WorldManager.applyTickingAreas()` is the only `tickingarea add` implementation in the selected artifact.
- `chunk-KPA6ZKUE.js`: `WorldData.tickingarea` contains only lobby and permission.
- Selected-artifact search found no second arena ticking-area creation owner.
- Raw world DB search found no persisted arena ticking-area names for arenas 1, 2, or 6.

Player-visible consequence: gameplay becomes dependent on player-loaded chunks; distant entity spawning/pathing/wave progression can fail.

Repair direction: keep one arena simulation-residency owner and create/release the selected arena's declared regions as part of arena lifecycle, or replace this unused contract with another proven residency mechanism.

## Next action

Continue selected-artifact analysis for additional independently proven Composite defects before approval/promotion.
