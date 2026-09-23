# Structure Loading and World Mutation Transactions

## Core problem

A structure load can be accepted while dependent gameplay is still unsafe.

Do not collapse:

```text
request accepted
placement queued
blocks materializing
entities restored
markers observable
critical world state verified
arena committed
```

into one event.

## Transaction model

```text
PREPARE
  ↓
APPLY
  ↓
VERIFY
  ↓
COMMIT

failure
  ↓
RECOVER / ABORT
```

### PREPARE

- validate arenaGeneration + mutationGeneration
- acquire mutation-region ownership
- compute transformed bounds
- prove chunk coverage/readiness
- resolve structure identifier
- define includeBlocks/includeEntities contract
- snapshot/identify recovery baseline where required

### APPLY

May include:

- structure load/place
- fill/setblock
- block permutation writes
- marker restoration
- controlled entity restoration

Successful API return is only APPLY evidence.

### VERIFY

Check required postconditions:

- sentinel blocks
- expected doors/gates/passages
- marker entities
- critical entity registry
- required block states
- expected absence of blocking residue
- arena ownership still current

### COMMIT

Only after verification may systems enable:

- player teleport into arena
- enemy AI/pathing
- spawn waves
- scoring
- countdown completion
- objective interaction

## Duplicate entity hazard

If a structure contains entities:

```text
old entities still resident
+
structure loaded with entities
=
duplicates
```

Therefore entity-containing structures require an identity/reconciliation policy.

## Concurrent arena hazard

Two world mutations can overlap even when started by different arenas or rounds.

Use a region ownership model:

```text
region -> arenaId + arenaGeneration + mutationGeneration
```

Overlapping ownership is rejected or serialized.

## Rotation/mirror hazard

Source bounds are not enough.

```text
source sentinel (x,z)
  ↓ rotation/mirror
destination sentinel != naive translated coordinate
```

All locks and verification points must use transformed destination geometry.

## Recovery

World mutations are not assumed atomic.

Recovery may require:

- baseline structure reload
- explicit cleanup
- entity deduplication
- marker restoration
- scoreboard/state reconciliation
- second verification pass

Recovery must never belong to an obsolete generation.

## Analyzer diagnostics

- WORLD_MUTATION_REQUEST_TREATED_AS_COMMIT
- WORLD_MUTATION_REGION_OVERLAP
- WORLD_MUTATION_STALE_GENERATION
- WORLD_MUTATION_CHUNK_NOT_READY
- WORLD_MUTATION_PARTIAL_APPLY
- WORLD_MUTATION_VERIFY_MISSING
- WORLD_MUTATION_SENTINEL_MISSING
- STRUCTURE_ENTITY_DUPLICATION_RISK
- STRUCTURE_ENTITY_INCLUDE_UNDECLARED
- STRUCTURE_ANIMATION_EARLY_COMMIT
- STRUCTURE_INTEGRITY_PARTIAL_UNACCOUNTED
- STRUCTURE_TRANSFORM_BOUNDS_WRONG
- STRUCTURE_LOAD_DEPENDENT_WORK_TOO_EARLY
- WORLD_MUTATION_ROLLBACK_UNVERIFIED
- BLOCK_WRITE_UNLOADED_CHUNK
- WORLD_MUTATION_RECOVERY_STALE

## Review questions

1. What generation owns this mutation?
2. What exact world region does it own after transform?
3. Are all target chunks ready?
4. Does the structure include entities?
5. What proves placement is actually ready?
6. Which sentinel blocks/entities are verified?
7. Can another arena mutate overlapping blocks?
8. Can the old generation still execute recovery?
9. Is animation/integrity changing completion semantics?
10. What compensating action exists for partial failure?
