# Real Map Audit — Five Nights at Z Village Level 2 v1.2.2

Status: real-map source audit complete for this pass  
Authority: selected current Drive artifact only  
Historical regression ingestion: none  
Runtime execution: not performed

## Target

- Drive project: `PvP - Five Nights at Z Village / Level 2`
- Drive filename: `Defense_Level_2_v1_2_0.mcworld`
- Drive file ID: `1v-7t1gvcPoIxZuaexUnWKxUqtv-ezB8S`
- Artifact SHA-256: `d515dcf21bc1665f41c0ae8d3b316721d1ef9ee4ba4ed0212ad7f0d36017d96b`
- BP/RP manifest version: `1.2.2`
- Internal level name: `Defense Level 2 v1.2.2`

The Drive filename is stale relative to the selected artifact's internal manifest/level identity. This is recorded as metadata mismatch only.

## Proven findings

**0 source-proven gameplay defects admitted in this pass.**

## Historical issue re-checks

### World rules / time / weather

Current `WorldRulesBootstrap` explicitly applies and periodically reasserts:

```text
keepInventory = true
doDayLightCycle = false
doWeatherCycle = false
pvp = false
time = night
weather = clear
```

The old keepInventory/time/weather mismatch is not reproduced.

### Builds Shop

Current gameplay configuration contains an active Builds Shop with:

- Barricade
- Spike Trap

The historical empty/missing BuildItems surface is not reproduced.

### Flag loss reachability

Current objective logic uses:

```text
damagePerZombie = 4
healPerPlayer = 0.6
```

and checks the gatekeeper every configured interval. Sustained undefended enemy pressure can reduce flag health to zero and calls `stop("defeat")`.

The historical practically-unreachable loss condition is not reproduced.

### Spawn failure

Normal wave and boss spawn paths retry bounded failures and explicitly stop the session with `spawn_failure` after retry exhaustion.

This prevents the source from silently treating failed required spawns as valid progression.

### Arena loading / ticking ownership

Current arena loading derives required chunks from gameplay paths, entity setup, shop chests, camera locations, spawn, and wave endpoints.

Retained ticking-area ownership is stored with both:

```text
sessionId
generation
```

and `release(arenaId, sessionId, generation)` refuses stale ownership.

This is materially different from the stale arena-only lease ownership bug proven in standalone Defense Challenge v1.1.1.

### Route/path recovery

The current coordinator owns route nodes per arena/session and contains stuck-zombie/path reconciliation. Source does not establish that the historical bridge-stuck issue survives in this version.

### Session ownership / reload

Session Registry increments a per-arena generation and current gameplay checks session+generation before delayed work continues. Reload recovery removes stale session-owned entities rather than accepting obsolete ownership.

## Audit obligations — not bugs

- Navigation success remains runtime-sensitive and should be validated if Pillagers still stall on real terrain.
- The Drive filename/version mismatch should be cleaned for operator clarity but is not a gameplay bug.

## Result

Five Nights at Z Village Level 2 v1.2.2:

- **0 source-proven gameplay bugs**
- major historical configuration/shop/objective/session issues are not reproduced by current source
- runtime-sensitive pathfinding remains validation work only

Do not create historical regression entries for this map from this pass.


## Deep multi-arena pass — isolation counter-proof

Current Defense Level 2 code was rechecked for world-wide player/entity leakage.

Relevant operations resolve players through session member IDs or session tags before mutation. Arena-owned entities use arena/session route tags, cleanup removes owned entities by those tags, and periodic kit repair filters to Defense session-tagged players.

Global online-player enumeration is therefore an index/lookup surface; gameplay mutations remain session/arena scoped in the inspected paths.

Result: no additional source-proven cross-arena defect admitted.
