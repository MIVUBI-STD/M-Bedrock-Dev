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


---

# 19. Deep blindspots and mandatory mitigations

## 19.1 Teleport bootstrap paradox

Player-driven loading has a circular failure mode:

```text
need player near remote chunk
        ↓
try to teleport player there
        ↓
destination chunk is unloaded
        ↓
tryTeleport can fail
        ↓
player never reaches the place that would load the chunk
```

Therefore a coverage point has a bootstrap state:

```text
READY_ANCHOR
BOOTSTRAP_REQUIRED
UNSAFE_ANCHOR
```

If the anchor is already loaded, relocate normally.

If the anchor is unloaded, use the smallest exceptional bootstrap lease supported by the target environment, wait for readiness, move the player, prove player-driven coverage, then release that bootstrap lease.

This does not turn ticking areas into the normal setup backend.

## 19.2 Spectator is isolation, not proof

Spectator is useful because the player cannot normally interact with blocks/mobs and is visually isolated.

However, the setup design must not derive chunk readiness from `GameMode.Spectator` itself.

```text
Spectator
  = interaction policy

Dimension.isChunkLoaded / target validation
  = readiness evidence
```

A target runtime still needs local validation that Spectator behaves acceptably for its loading pattern.

## 19.3 Control-plane self-unload

Moving the only nearby player can unload/deactivate systems at the source area.

This is dangerous when countdown/setup control depends on:

- command blocks;
- redstone;
- local entity AI;
- scheduled mechanics tied to an area.

Before using a player loader, classify:

```text
CONTROL_PLANE_SCRIPT_ONLY
CONTROL_PLANE_PLAYER_PROXIMITY_DEPENDENT
CONTROL_PLANE_UNKNOWN
```

A player-proximity-dependent or unknown control plane cannot safely surrender its last activating player without another liveness mechanism.

## 19.4 Loader side effects on the original pack

Changing game mode, position, or dimension may trigger original-pack logic such as:

- `playerGameModeChange`;
- `playerDimensionChange`;
- zone/location checks;
- proximity triggers;
- score/tag transitions;
- cutscene systems.

A high-end planner therefore has a **loader side-effect scan**.

If original logic cannot distinguish setup relocation from gameplay relocation, player-driven setup is unsafe for that arena and the loader backend should change.

## 19.5 Loaded chunk is not target-complete

Chunk readiness and target readiness are separate.

```text
Gate A:
chunk loaded + script valid

Gate B:
expected target contract satisfied
```

Examples of Gate B:

- expected persistent entity exists and identity matches;
- expected spawner exists;
- expected tags/components are visible;
- setup location query returns the expected cardinality;
- command/setup source has reached its intended state.

The ledger becomes `processed` only after both gates.

## 19.6 Coverage drain barrier

Do not teleport the loader to the next point while operations from the current point still hold entity handles or unresolved asynchronous work.

```text
PROCESS_TARGETS
      ↓
WAIT_TERMINAL_LEDGER
      ↓
DRAIN_ASYNC_DEPENDENCIES
      ↓
MOVE_LOADER
```

Entity handles are ephemeral runtime references, not registry identities.

## 19.7 Persistence profile blindspot

A ticking chunk does not imply a critical entity will survive.

Before relying on recovery, classify the entity definition:

```text
PERSISTENT
TRANSIENT
DESPAWN_CAPABLE
UNKNOWN
```

A transient entity is fundamentally incompatible with a requirement to survive unloading.

A despawn-capable entity may be legitimately absent even when the chunk is loaded.

For such entities, the setup target may need to validate spawn configuration instead of insisting an instance exist before gameplay.

## 19.8 Pre-created entity can disappear before gameplay

Coverage setup can successfully create an entity and then immediately remove the player that made the surrounding simulation active.

If that entity is not guaranteed persistent, setup success can become false minutes/ticks later.

Therefore:

```text
entity must survive unloaded interval?
  YES → prove persistence contract
  NO  → defer instance creation until gameplay activation
```

## 19.9 Ticking area is not player presence

Ticking areas keep chunks active, but they do not reproduce every gameplay semantic associated with a nearby player.

Classify operations:

```text
LOAD_ONLY
PLAYER_PRESENCE_REQUIRED
```

Examples of player-presence-sensitive systems include natural spawn rules.

A `PLAYER_PRESENCE_REQUIRED` recovery must not be satisfied with a ticking area alone.

## 19.10 Capacity TOCTOU

This sequence is unsafe under concurrency:

```text
request A → hasCapacity = true
request B → hasCapacity = true
A creates
B creates → OverChunkLimit
```

Therefore:

- capacity check and create are serialized through one allocator;
- `hasCapacity` is advisory;
- `createTickingArea` result/error is authoritative;
- `OverChunkLimit` returns the request to capacity scheduling.

## 19.11 Error reason routing

```text
IdentifierAlreadyExists
  → reconcile owner/generation/bounds

OverChunkLimit
  → queue/backpressure

SideLengthExceeded
  → invalid planner request
  → DO NOT queue forever

UnknownIdentifier
  → reconcile stale cleanup state

EngineError
  → preserve engine failure
```

## 19.12 Restricted execution

A chunk recovery request can be discovered inside a before-event or custom command callback.

The request may be recorded there.

The allocation itself must be deferred to default execution because TickingAreaManager methods are not available in restricted execution.

Use the system job queue rather than attempting world mutation immediately.

## 19.13 Orphan leases after reload/crash

In-memory lease state is insufficient.

At manager initialization:

1. read current generation/session metadata;
2. enumerate pack-owned ticking areas;
3. match namespaced identifiers to persisted/current lease ownership;
4. adopt valid leases;
5. remove stale orphaned leases;
6. rebuild capacity accounting.

Do not call `removeAllTickingAreas()` indiscriminately during a live session.

## 19.14 Command backend global contention

The command backend is world-global.

Other content can consume the documented 10-area budget.

Therefore:

```text
configured max = 10
available-to-us != automatically 10
```

The manager must treat command add failure as authoritative and use namespaced identifiers to avoid destructive collisions.

If cheats/permissions are unavailable, the command backend is unavailable—not merely busy.

## 19.15 Exactly-once spawn blindspot

Retrying a spawn is not automatically idempotent.

Before retrying a critical spawn:

1. load the target region;
2. query for the logical role identity;
3. if exactly one expected entity already exists, adopt it;
4. if multiple exist, fail as duplicate/ambiguous;
5. only if none exists, retry spawn.

This prevents chunk recovery from duplicating spawners or critical mobs.

## 19.16 Global setup pressure

Multiple arenas can finish countdown simultaneously.

If each arena moves a loader through several regions, the world can suddenly activate many entities and AI systems.

Use:

- global loader lease count;
- global coverage concurrency;
- estimated active-chunk budget;
- per-arena fairness.

The planner is allowed to queue setup. It is not allowed to overload the server merely to preserve simultaneous countdown completion.

## 19.17 Minimal recovery footprint

The setup coverage radius and runtime ticking-area footprint are different concepts.

```text
coverage radius = planning envelope

recovery footprint = smallest chunks required by one operation
```

A one-chunk entity lookup should not automatically consume a 4-chunk-radius ticking area.

---

# 20. Revised backend decision tree

```text
PRE-GAME SETUP
│
├─ source control plane safe to move loader?
│      NO → non-player bootstrap/setup backend
│
├─ player relocation side effects isolated?
│      NO → non-player bootstrap/setup backend
│
├─ coverage anchor loaded?
│      YES → move loader
│      NO  → exceptional bootstrap lease
│
├─ target chunks loaded?
│      NO → wait/prove readiness
│
├─ target-specific contract ready?
│      NO → bounded target recovery / fail
│
└─ process → drain → next coverage


RUNTIME RECOVERY
│
├─ failure explicitly chunk-related?
│      NO → preserve original error
│
├─ operation needs nearby player semantics?
│      YES → player-presence recovery
│      NO  → temporary ticking-area recovery
│
├─ backend available?
│      NO → CHUNK_RECOVERY_BACKEND_UNAVAILABLE
│
├─ serialized capacity allocation
│
├─ create/adopt lease
│
├─ retry idempotently
│
└─ cleanup + reconcile
```

The architecture now treats chunk loading as a resource-and-state coordination problem, not merely a teleport or ticking-area command problem.


---

# 21. Original-loader topology blindspots

## 21.1 The original pack may already load chunks

Chunk activation can already come from several sources:

```text
player simulation distance
command /tickingarea
Script world.tickingAreaManager
entity minecraft:tick_world
other original-pack control logic
```

The first planning step is therefore not "add a loader".

It is:

```text
DISCOVER EXISTING LOADERS
        ↓
ATTRIBUTE OWNERSHIP
        ↓
ESTIMATE ACTIVE FOOTPRINT
        ↓
ONLY ADD WHAT IS MISSING
```

This avoids building a second loading system on top of an existing one.

## 21.2 minecraft:tick_world changes the topology

An entity with `minecraft:tick_world` can tick a radius around itself.

The documented radius range is 2–6.

Therefore a critical "spawner" or controller entity may itself be the reason surrounding chunks remain active.

The analyzer/repair planner should record:

```ts
interface EntityChunkLoaderProfile {
  entityType: string;
  sourceComponent: "minecraft:tick_world";
  radius: number;
  neverDespawn: boolean;
  distanceToPlayers: number;
}
```

Removing or replacing that entity is potentially equivalent to deleting part of the arena's loading infrastructure.

## 21.3 Existing loaders must be ownership-safe

Never execute a broad cleanup such as:

```text
/tickingarea remove_all
```

as part of arena recovery.

A repair manager only owns:

- namespaced areas it created;
- Script manager leases belonging to its pack/generation;
- explicit migration targets approved by the repair plan.

Everything else is external/original state.

## 21.4 Overlap is not free

If an original loader already covers a target region:

- readiness may already be satisfied;
- another temporary area may be unnecessary;
- Script TickingAreaManager overlap still consumes chunk capacity.

The planner should deduplicate by **effective loaded footprint**, not only by lease identifier.

---

# 22. Legacy readiness correction

`/schedule on_area_loaded` is a notification/gating tool.

It is **not** a loading primitive.

Bad model:

```text
schedule on_area_loaded
→ therefore area loads
```

Correct model:

```text
some loader eventually loads area
        ↓
schedule on_area_loaded fires
        ↓
setup continuation may execute
```

For a remote arena with no player, ticking area, tick_world entity, or other loader, scheduling alone does not solve the bootstrap problem.

---

# 23. Anchor geometry and negative coordinates

## Dimension Y

A coverage point is not only an X/Z chunk center.

It needs a valid teleport coordinate.

Validate Y using:

```ts
dimension.heightRange
```

Do not invent a universal Y such as 320 or -64 for every dimension/custom world.

Prefer an original known-safe location or an explicitly authored setup anchor.

## Negative chunk coordinates

Use:

```text
floor(x / 16)
floor(z / 16)
```

not integer truncation.

Regression anchors:

```text
block -1  → chunk -1
block -16 → chunk -1
block -17 → chunk -2
block 0   → chunk 0
block 15  → chunk 0
block 16  → chunk 1
```

A truncation bug here can silently assign western/northern targets to the wrong coverage point.

---

# 24. Moving-entity handoff

Temporary ticking areas are spatially bounded.

Minecraft documentation notes that active entities moving outside a ticking area can stop until they are within player simulation distance again.

Therefore recovery needs a handoff rule:

```text
operation completes
    ↓
entity remains stationary?
    YES → lease may release

entity expected to move immediately?
    ↓
player simulation already owns destination path?
    YES → handoff then release
    NO  → keep bounded footprint / fail design
```

A temporary chunk lease guarantees an operation window, not indefinite AI continuity.

---

# 25. Updated preflight checklist

Before arena setup:

```text
[ ] target registry complete
[ ] dimensions separated
[ ] negative chunk math verified
[ ] original chunk loaders inventoried
[ ] tick_world entities inventoried
[ ] command ticking areas inventoried
[ ] Script ticking areas inventoried
[ ] loader side effects assessed
[ ] control-plane liveness assessed
[ ] coverage anchors inside heightRange
[ ] anchor bootstrap source exists
[ ] critical entity persistence profiles known
[ ] backend permissions/capacity known
[ ] setup concurrency budget available
```

The architecture is now topology-aware: it reasons about **who already owns chunk activity**, not only how to create more of it.
