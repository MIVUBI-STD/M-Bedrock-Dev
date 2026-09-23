# Chunk Runtime Loading Architecture

This document defines the MIVUBI chunk-loading knowledge model for arena setup and runtime entity recovery.

It deliberately separates **Minecraft engine facts** from **project policy**.

## 1. Core distinction

```text
ENGINE FACT
  Minecraft chunks are 16×16 on X/Z.
  Simulation distance is player-relative.
  Default simulation distance is 4 chunks.
  Dimension.isChunkLoaded() can prove script-valid chunk readiness.
  /tickingarea has a world command limit.
  world.tickingAreaManager has independent pack-scoped chunk capacity.

PROJECT POLICY
  Start with 3 arena coverage points.
  Use 4 chunks as the coverage planning envelope.
  Fail closed on uncovered targets.
  Use a spectator loader player during normal pre-game setup.
  Use temporary ticking areas only as runtime recovery.
```

The number `4` is therefore a **coverage policy**, not an assertion that every chunk within 4 chunks is immediately ready after teleport.

---

# 2. Architecture

```text
Original Pack
    │
    ▼
Setup Target Registry
    │
    ▼
Coverage Planner
    │
    ├─ chunk-space grouping
    ├─ dimension isolation
    ├─ 3 initial points
    └─ adaptive extra points
    │
    ▼
Arena Setup Coordinator
    │
    ├─ Loader Player Lease
    ├─ Chunk Readiness Probe
    ├─ Setup Target Ledger
    └─ Final Verifier
    │
    ▼
Arena READY / FAILED


Runtime gameplay
    │
entity operation fails with chunk evidence
    ▼
Chunk Recovery Manager
    │
    ├─ Script TickingAreaManager backend
    │    └─ capacity = maxChunkCount / hasCapacity
    │
    └─ /tickingarea compatibility backend
         └─ capacity = world command-area limit
    │
    ▼
bounded retry
    │
    ▼
lease cleanup
```

---

# 3. Setup Target Registry

The setup registry is generated from the **original pack**, not from newly invented arena locations.

Every target should have a stable setup identity:

```ts
interface ArenaSetupTarget {
  key: string;
  arenaId: string;
  dimensionId: string;
  location: { x: number; y: number; z: number };

  kind:
    | "persistent-entity"
    | "spawner"
    | "entity-query"
    | "setup-location"
    | "gameplay-component";

  criticality: "critical" | "required" | "optional";

  expectedEntityId?: string;
  expectedTypeId?: string;
  expectedTags?: string[];

  setupOperation: string;
}
```

The registry preserves original coordinates and gameplay ownership.

No coverage point is allowed to become a new gameplay spawn or alter arena layout.

---

# 4. Chunk-space normalization

Chunk coordinates:

```text
chunkX = floor(blockX / 16)
chunkZ = floor(blockZ / 16)
```

Coverage planning uses **Chebyshev distance** in chunk space:

```text
distance(a, b) =
max(
  abs(a.chunkX - b.chunkX),
  abs(a.chunkZ - b.chunkZ)
)
```

This matches a square coverage envelope and avoids misleading Euclidean block-distance calculations.

Targets are always partitioned by dimension before clustering.

---

# 5. Coverage Planner

## Initial planning

For each arena and dimension:

1. collect all critical/required setup target chunks;
2. choose three initial coverage centers deterministically;
3. assign each target to its nearest coverage center;
4. validate `distance <= 4`;
5. if an uncovered target exists, create an additional coverage point at/near the farthest uncovered cluster;
6. repeat until all required targets are covered or planning fails.

Recommended deterministic seed strategy:

```text
point 1 = target nearest chunk-space centroid
point 2 = target farthest from point 1
point 3 = target maximizing minimum distance to points 1–2

additional points =
farthest currently uncovered target/cluster
```

This approximates a bounded k-center planner without expensive optimization and produces reproducible plans.

## Important

The planner's 4-chunk rule answers:

> "Should this target belong to this coverage point?"

It does **not** answer:

> "Is the chunk currently loaded?"

That is the responsibility of the readiness probe.

---

# 6. Arena Setup State Machine

```text
COUNTDOWN
   │
   ▼
PLANNING
   │
   ├─ coverage gap ─────────► FAILED_COVERAGE
   ▼
ACQUIRE_LOADER
   │
   ├─ no loader ────────────► FAILED_NO_LOADER
   ▼
MOVE_TO_COVERAGE
   │
   ▼
WAIT_CHUNK_READY
   │
   ├─ timeout ──────────────► FAILED_CHUNK_TIMEOUT
   ▼
PROCESS_TARGETS
   │
   ├─ missing critical ─────► FAILED_TARGET_MISSING
   ├─ ambiguous target ─────► FAILED_TARGET_AMBIGUOUS
   ▼
NEXT_COVERAGE
   │
   ▼
FINAL_VERIFY
   │
   ├─ incomplete ledger ────► FAILED_INCOMPLETE
   ▼
RESTORE_PLAYER
   │
   ├─ restore failure ──────► FAILED_RESTORE
   ▼
READY
   │
   ▼
RUNNING
```

Gameplay cannot enter `RUNNING` from a partially successful setup.

---

# 7. Loader Player Lease

Normal setup does not consume a ticking area.

One loader player is leased for the arena setup operation.

Snapshot before moving:

```ts
interface LoaderPlayerSnapshot {
  playerId: string;
  dimensionId: string;
  location: Vector3;
  rotation?: { x: number; y: number };
  gameMode: string;
}
```

Sequence:

1. acquire loader;
2. snapshot state;
3. set Spectator;
4. teleport to coverage point;
5. verify assigned chunks;
6. process setup targets;
7. continue to next point;
8. restore original gameplay location/mode in a finally-equivalent cleanup path.

If the player disconnects, the coordinator may acquire another eligible loader or fail the setup explicitly.

It must never silently continue with an invalid loader.

---

# 8. Chunk Readiness

Do not use a fixed sleep as proof.

## Preferred Script API probe

When `@minecraft/server >= 2.3.0`:

```ts
dimension.isChunkLoaded(target.location)
```

must be true for every unique required target chunk assigned to the current coverage point.

A project may require multiple consecutive successful samples if it wants extra stabilization, but that is a project-level tuning parameter.

## Legacy compatibility

For older Script API lines that do not expose `Dimension.isChunkLoaded`, use a project-supported area-loaded readiness mechanism such as `/schedule on_area_loaded` where appropriate.

If deterministic readiness cannot be established for the target environment, do not silently convert a time delay into certainty.

---

# 9. Setup Target Processing

Per setup session maintain:

```ts
interface SetupLedgerEntry {
  targetKey: string;
  coverageId: string;

  status:
    | "pending"
    | "ready"
    | "processing"
    | "processed"
    | "missing"
    | "ambiguous"
    | "failed";

  attempts: number;
  errorCode?: string;
}
```

Every operation must be idempotent.

Use a setup `generation` / session token so stale asynchronous work from a previous round cannot mark the new arena setup as complete.

Final verification checks the registry against the ledger, not merely whether the coverage loop finished.

---

# 10. Runtime Chunk Recovery Manager

Temporary ticking areas are a **recovery mechanism**, not an arena-lifetime mechanism.

Recommended API shape:

```ts
interface ChunkRecoveryRequest {
  requestId: string;
  arenaId: string;
  dimensionId: string;

  from: Vector3;
  to: Vector3;

  reason:
    | "spawn-unloaded"
    | "persistent-entity-recovery"
    | "known-location-operation";

  priority: "critical" | "normal" | "low";
  retryBudget: number;
  timeoutTicks: number;
}
```

The manager owns:

- capacity;
- queueing;
- request coalescing;
- unique identifiers;
- retries;
- cleanup;
- leak detection;
- telemetry.

No gameplay subsystem creates ticking areas directly.

---

# 11. Preferred backend — Script TickingAreaManager

When the target API exposes `world.tickingAreaManager`:

```text
check hasCapacity(options)
       │
       ├─ false → queue request
       ▼
await createTickingArea(id, options)
       │
       ▼
chunks are loaded + ticking
       │
       ▼
retry original operation
       │
       ▼
removeTickingArea(id) in cleanup
```

This backend is pack-scoped.

Its capacity is **not** the same as the command system's 10-area limit.

Use:

- `maxChunkCount`;
- `chunkCount`;
- `hasCapacity(options)`.

Overlapping chunks still consume capacity according to the API.

---

# 12. Compatibility backend — /tickingarea

For older target Script API lines:

- one central command-backed manager owns all temporary command ticking areas;
- command/world limit is treated as 10 areas;
- a request that cannot obtain a slot enters the queue;
- every area uses a unique namespaced identifier;
- area is removed immediately after the protected operation finishes;
- manager must reconcile its own lease table with command state when recovery starts.

Do not allocate one permanent ticking area per arena.

That design does not scale safely for multi-arena worlds.

---

# 13. Spawn recovery

Recovery is error-specific.

```text
spawnEntity()
   │
   ├─ success → done
   │
   ├─ LocationInUnloadedChunkError
   │      ▼
   │   request temporary loaded area
   │      ▼
   │   retry within bounded budget
   │
   └─ other error
          ▼
       preserve original error
```

Do not classify:

- invalid entity identifiers;
- out-of-world positions;
- invalid arguments;
- general spawn errors

as chunk failures.

---

# 14. Persistent entity recovery

Critical persistent entities keep:

```ts
interface PersistentEntityRecord {
  key: string;
  entityId: string;
  dimensionId: string;
  lastKnownLocation: Vector3;

  expectedTypeId?: string;
  expectedTags?: string[];
  lastSeenTick?: number;
}
```

Lookup contract:

```text
world.getEntity(id)
   │
   ├─ entity found → validate identity → success
   │
   └─ undefined
       │
       ├─ no trusted last location
       │      → CHUNK_RECOVERY_LOCATION_UNKNOWN
       │
       ▼
   check known chunk readiness
       │
       ├─ unloaded
       │    → temporary load → retry getEntity
       │
       └─ loaded
            → retry/identity resolution
                 │
                 └─ still missing
                      → entity can now be classified as genuinely missing
                         according to project policy
```

This is deliberately conservative.

The policy does **not** claim that `getEntity() === undefined` is always caused by unloading.

It says unloading must be ruled out before declaring a critical persistent entity lost.

---

# 15. Queue and lease semantics

## Capacity

### Script API backend

Capacity unit:

```text
chunks
```

Use the manager's runtime capacity.

### Command backend

Capacity unit:

```text
ticking areas
```

Use the documented world command limit.

These are different resource models.

## Scheduling

Recommended:

1. critical persistent entity recovery;
2. gameplay-blocking spawn recovery;
3. normal recovery;
4. low-priority maintenance.

FIFO within priority.

Add age-based promotion to prevent starvation.

## Coalescing

Requests may share one temporary lease only when:

- same dimension;
- compatible region;
- lifetime overlap is controlled;
- cleanup ownership is reference-counted.

---

# 16. Cleanup and circuit breaker

Every lease has:

- owner arena/session;
- reason;
- creation tick;
- expiry tick;
- backend;
- area/chunk cost;
- retry count.

Cleanup must run on:

- success;
- operation failure;
- arena abort;
- player disconnect;
- exception;
- session replacement.

Repeated failure for the same operation/location should trip a short circuit breaker rather than creating an infinite create/remove/retry loop.

---

# 17. Diagnostic contract

Recommended explicit diagnostics:

```text
ARENA_SETUP_COVERAGE_GAP
ARENA_SETUP_NO_LOADER
ARENA_SETUP_CHUNK_TIMEOUT
ARENA_SETUP_TARGET_MISSING
ARENA_SETUP_TARGET_AMBIGUOUS
ARENA_SETUP_INCOMPLETE
ARENA_SETUP_RESTORE_FAILED

CHUNK_RECOVERY_LOCATION_UNKNOWN
CHUNK_RECOVERY_CAPACITY_EXHAUSTED
CHUNK_RECOVERY_TIMEOUT
CHUNK_RECOVERY_RETRY_FAILED
TICKING_AREA_LEAK
```

Each diagnostic should contain:

- arena id;
- setup/recovery session id;
- dimension;
- block and chunk coordinates;
- coverage point / lease id;
- target/entity key;
- retry count;
- backend;
- original error;
- current capacity state.

---

# 18. Non-goals

This system must not:

- permanently keep every arena loaded;
- modify original arena layout;
- invent new gameplay spawn points;
- silently skip setup targets;
- treat arbitrary spawn errors as unloaded-chunk errors;
- treat `getEntity() === undefined` alone as proof of permanent entity loss;
- assume the command 10-area limit applies to Script `TickingAreaManager`;
- assume a fixed tick delay proves readiness.

The central principle is:

> **Load only what must be proven ready, prove readiness explicitly, execute the operation, then release the loading resource.**
