# Entity Spawn, Despawn, Population, and Persistence Integrity

## Core problem

These outcomes look similar in gameplay but have different causes:

```text
never spawned
spawn suppressed by cap
spawned in wrong place
spawned then despawned
spawned then unloaded
spawned then replaced
spawned twice
spawned recursively
```

## Spawn-source classification

Track creation source:

```text
NATURAL_RULE
SCRIPT_SPAWN
COMMAND_SUMMON
STRUCTURE_RESTORE
PARENT_SPAWN_ENTITY
SPAWN_ON_DEATH
RECOVERY_RESTORE
```

Without source classification, duplicate population is difficult to attribute.

## Natural spawn diagnosis

Evaluate in order:

```text
identifier
spawn conditions
location validity
population-control pool
density limit
weight/herd
spawn event
```

A valid biome/light condition does not guarantee a spawn if the relevant population pool or density limit is saturated.

## Disappearance classification

Use explicit lifecycle states:

```text
DEAD_CONFIRMED
DESPAWN_EXPECTED_OR_CONFIRMED
UNLOADED
EXPLICIT_REMOVE
REPLACED
UNKNOWN
```

Missing from query is not equivalent to dead.

## Hidden autonomous spawners

Entity JSON can create additional entities through spawn_entity timers or spawn-on-death components. These are independent spawn sources and must be included in population accounting.

## Critical entity persistence

For entities required to complete a round, define whether despawn is allowed. If not, configure or recover accordingly. If yes, objective logic must tolerate it without treating despawn as a kill.

## Wave registry

Prefer:

```text
spawn intent
↓
verified entity
↓
generation-scoped registry
↓
lifecycle evidence
```

over broad selectors or decrement-only counters.

## Replacement lineage

When a death/spawn component creates a child or replacement entity, define whether it inherits:

- arena membership
- wave membership
- scoring role
- objective role
- generation

## Analyzer diagnostics

- POPULATION_SPAWN_SOURCE_UNKNOWN
- POPULATION_SPAWN_INTENT_DUPLICATE
- POPULATION_SPAWN_RESULT_UNVERIFIED
- POPULATION_SPAWN_RULE_IDENTIFIER_MISMATCH
- POPULATION_CAP_SUPPRESSION_UNCHECKED
- POPULATION_DENSITY_LIMIT_SUPPRESSION_UNCHECKED
- POPULATION_DESPAWN_TREATED_AS_DEATH
- POPULATION_UNLOAD_TREATED_AS_DEATH
- POPULATION_CRITICAL_ENTITY_DESPAWN_POLICY_MISSING
- POPULATION_NATURAL_MOB_CONTAMINATES_ARENA_COUNT
- POPULATION_HIDDEN_SPAWN_ENTITY_COMPONENT
- POPULATION_SPAWN_ON_DEATH_UNACCOUNTED
- POPULATION_REPLACEMENT_LINEAGE_UNDECLARED
- POPULATION_RESET_LEAVES_SPAWN_SOURCE_ACTIVE
- POPULATION_BURST_SPAWN_BUDGET_UNBOUNDED

## Review questions

1. What exact path created this entity?
2. Was spawn intent idempotent?
3. Was the spawned entity verified and registered?
4. Could a population cap suppress the spawn?
5. Could density limits suppress it?
6. Can the entity naturally despawn?
7. Is disappearance death, despawn, unload, removal, or replacement?
8. Does the entity autonomously spawn children or replacements?
9. Are arena enemy counts isolated from natural mobs?
10. Does reset stop all spawn sources as well as remove their products?