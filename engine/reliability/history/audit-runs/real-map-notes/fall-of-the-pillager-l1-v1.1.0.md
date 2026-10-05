# Real Map Audit — Fall of the Pillager Level 1 v1.1.0

Status: real-map source audit complete for this pass  
Authority: selected current Drive artifact only  
Historical regression ingestion: none  
Runtime execution: not performed

## Target

- Drive project: `PvP - Fall of the Pillager / Level 1`
- Drive file: `Fall of the Pillager v1.1.0.mcworld`
- Drive file ID: `1K6ZDxz-gwGOmRU92dBZTkZNOkFZL3Y8d`
- Artifact SHA-256: `6df1be2f50404a0b89c2fb08f4d90a4c02eb4d51123ff9c5e03e9860b99938b1`
- BP/RP manifest version: `1.1.0`
- Min engine version: `1.21.130`
- Internal level name: `Fall of the Pillager v1.1.0`

## Proven findings

No source-proven gameplay defect was admitted in this pass.

## Historical issue re-checks

### Friendly hit / PvP

Current session manager explicitly configures:

```text
world.gameRules.pvp = false
```

The historical friendly-hit issue is not present in current source.

### Required sword durability

Current source has two independent protection paths:

1. the kit repair system scans inventory/equipment every 40 ticks and replaces durable equipment at >=90% damage while preserving name/lore/dynamic properties/enchantments;
2. the sword tracker remembers locked gameplay swords and restores a fresh clone if a strike leaves the selected slot without any sword remaining.

Current upgraded durable shop items are created with:

```text
lockMode = inventory
keepOnDeath = true
```

The historical required-sword break/drop lifecycle defect was not re-proven.

### Self revive

Current revive eligibility explicitly rejects:

```text
reviver.id === knockedPlayer.id
reviver.hasTag("knockdown")
```

and requires the helper to be owned by the current arena session, sneaking, in the same dimension, and within revive distance.

The historical self-revive-by-shift issue is not present.

### Hostile targeting of knocked player

Current Pillager behavior filters both retaliation and nearest-player targeting with:

```text
has_tag other != "knockdown"
```

The player entity also rejects all incoming damage while tagged knockdown.

The historical knocked-player-targeting defect was not re-proven.

### Multi-arena cinematic ownership

Current gameplay contexts are session/arena scoped. Event routing checks context ownership and cinematic membership per session rather than using a single global player queue as gameplay authority.

No current source proof was found for the old cross-session cinematic serialization defect.

## Result

Fall of the Pillager Level 1 v1.1.0: **0 source-proven gameplay findings** in this pass.

No historical regression entry should be created without later current-artifact/runtime proof.

## Deep multi-arena pass — isolation re-check

### Arena context proxy prevents apparent global-selector leakage

A deeper review challenged direct calls such as:

```text
this.context.world.getAllPlayers()
this.context.world.getDimension(...).getEntities(...)
```

These initially appear world-global. In the current artifact, however, each active OffenseManager is created from a per-arena gameplay context whose proxy implements:

- `world.getAllPlayers()` / `getPlayers()` → only the session's member IDs;
- proxied `dimension.getPlayers()` → only arena session members in that dimension;
- proxied `dimension.getEntities(query)` → automatically adds the current arena entity tag;
- `context.execute(... @a ...)` → arena members;
- entity spawn → adds the current arena entity tag;
- ticking-area name → current arena ID.

This counter-proof applies to the HUD update, jail-door queries, stage entity counts, rewards, fireworks, and translated commands inspected in this pass.

Result: the apparent raw `@a` / all-player / all-entity patterns in those paths are **not** admitted as cross-arena bugs.

Simultaneous cinematic ownership also remains session/arena scoped in the current implementation; the historical single global cinematic queue was not reproduced.
