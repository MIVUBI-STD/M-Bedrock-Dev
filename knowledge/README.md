# Minecraft Bedrock / Education Knowledge Base

This directory contains repo-owned, machine-readable domain knowledge.

It is separate from:

- analyzers: interpret project content;
- compatibility: evaluate target compatibility;
- reliability: plan proof/search/retest;
- repair: mutate a working copy.

Knowledge answers:

> What documented, observed, derived, or project-owned Minecraft behavior is relevant to interpreting this content?

## Authority order

1. official Microsoft/Mojang documentation;
2. official samples/templates;
3. curated community research;
4. observed project/runtime behavior;
5. explicit MIVUBI project policy.

Lower tiers may add evidence but must not silently override stronger authority.

## Fact classification

- `engine-fact`: documented or observed Minecraft behavior.
- `derived-rule`: bounded reasoning derived from evidence.
- `project-policy`: MIVUBI operational design, not an engine guarantee.
- `open-assumption`: unresolved assumption requiring stronger evidence.

Project-policy facts require an explicit `project-policy` source.

## Runtime knowledge coverage

The knowledge base now covers these major runtime families:

### Engine and content foundations

- commands / selectors / scoreboard
- entities / entity events / AI / navigation
- structures / world mutation
- Script API
- chunks / residency
- LevelDB and world-db evidence
- compatibility / manifest / module / experiment profiles

### Player and multiplayer lifecycle

- player session / reconnect / respawn
- multiplayer arena concurrency
- state authority and mirrors
- player life / downed / revive
- permissions / gamemode / developer access
- input gesture / item-use lifecycle
- interaction / forms / input locks
- cinematic / camera lifecycle
- client feedback reconstruction

### World and arena integrity

- teleport / spawn safety
- physics / velocity / knockback
- spatial containment / void recovery
- mounts / riders / passengers
- entity population / spawn / despawn
- effects / attributes / component groups
- combat / projectile attribution / friendly fire
- environmental hazards / explosions
- interactive blocks / containers / doors / gates
- redstone / command-block / block-driven automation
- loot / drops / pickup / economy
- objective / scoring / round terminal integrity
- arena cleanup / repeatability
- world-global state isolation

### Reliability and validation

- event ordering / tick visibility
- persistence / restart / crash recovery
- scheduler / performance / watchdog
- observability / traces / invariants
- validation / future GameTest readiness
- Education-specific runtime profile

## Design principle

The knowledge base deliberately distinguishes:

```text
request
queued work
applied state
verified state
committed gameplay state
```

and consistently models ownership using session, arena, life/entity, operation, or subsystem generations where stale asynchronous work can exist.

## Coverage status

The high-severity general runtime foundation is now considered **broadly covered**.

Remaining additions should normally be triggered by:

- a concrete map mechanic not represented here;
- a new Minecraft/Education version or API surface;
- a newly observed runtime failure;
- a specialized content family such as trading, recipes/crafting, chemistry, or project-specific custom systems.

See `docs/03-analysis/runtime-coverage-audit.md` for the coverage audit and next engineering priorities.
