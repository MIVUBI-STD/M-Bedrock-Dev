# Player Session Lifecycle and Multiplayer Concurrency

## Purpose

This analysis layer prevents M-Bedrock-Dev from treating a player as one timeless runtime object. In Bedrock/Education, persistent identity, online connection, spawned Player state, arena membership, and round participation are different lifecycles.

## Core model

```text
ABSENT
  ↓ playerJoin
CONNECTED_UNINITIALIZED
  ↓ initial playerSpawn
RECONCILING
  ↓ project readiness complete
LOBBY_READY
  ↓ arena assignment
ARENA_ASSIGNED
  ↓ accepted start transaction
ACTIVE
  ├─ DOWNED
  ├─ DEAD
  ├─ SPECTATOR
  ├─ TRANSITIONING
  └─ DISCONNECTED

DISCONNECTED
  ↓ new playerJoin
CONNECTED_UNINITIALIZED
  ↓ new connectionGeneration
RECONCILING
```

Respawn is not reconnect. Reconnect is not resume. Persisted state is not current-session authority.

## Identity layers

Keep these independent:

```text
logical player identity
        ≠
current Player runtime reference
        ≠
connectionGeneration
        ≠
arena membership
        ≠
arenaGeneration
        ≠
participationGeneration
```

Recommended correlation envelope:

```ts
interface PlayerRuntimeEnvelope {
  playerKey: string;
  connectionGeneration: number;
  arenaId?: string;
  arenaGeneration?: number;
  participationGeneration?: number;
}
```

Every deferred callback captures this envelope and validates it again before mutation.

## Critical failure modes

### Ghost ready

A player marks ready and disconnects. The old ready bit remains, so an all-ready predicate starts the arena with a participant who no longer exists.

### Stale reconnect continuation

Old session schedules work, disconnects, reconnects, and obtains a new session. The old continuation later executes against the new player state.

### Duplicate countdown

Two ready events evaluate the same shared state and each creates a countdown. Both eventually call setup.

### Cross-arena selector leakage

Gameplay uses broad selector/tag/score logic whose membership is not generation-scoped. Players in another arena or stale generation are affected.

### Respawn state contamination

Death/respawn recreates an active gameplay path while downed, revive, inventory, input-permission, gamemode, or teleport state from the previous life remains.

### Duplicate terminal side effects

Multiple completion/death/disconnect paths award points, rewards, cleanup, or lobby teleport more than once.

## Arena transaction rule

Use one accepted state transition per arena generation:

```text
WAITING
  ↓ atomic ownership decision
COUNTDOWN
  ↓ still current?
SETUP
  ↓ readiness proof
ACTIVE
  ↓ terminal owner
FINALIZING
  ↓ idempotent commit
COMPLETE
```

Events may request evaluation; they do not each own the transition.

## Reconnect rule

Reconnect always creates a new connectionGeneration.

Persisted data may restore durable facts such as progress or assignment policy, but transient runtime state is reconciled:

- ready
- downed/revive ownership
- open forms
- pending teleports
- temporary spectator/loader role
- countdown participation
- per-session timers
- cached Player references
- pending async actions

## Analyzer diagnostics to add

Recommended diagnostics:

- PLAYER_STALE_SESSION_CALLBACK
- PLAYER_GHOST_READY
- PLAYER_RECONNECT_STATE_LEAK
- PLAYER_RESPAWN_STATE_LEAK
- PLAYER_RUNTIME_REFERENCE_STALE
- PLAYER_PERSISTED_STATE_USED_AS_SESSION_AUTHORITY
- ARENA_DOUBLE_START_RACE
- ARENA_DUPLICATE_COUNTDOWN
- ARENA_CROSS_SCOPE_SELECTOR
- ARENA_STALE_GENERATION_MUTATION
- ARENA_DUPLICATE_TERMINAL_COMMIT
- ARENA_PARTICIPANT_SET_STALE

## Review questions

For every player-sensitive subsystem ask:

1. Which identity layer owns this state?
2. What invalidates it?
3. Does disconnect invalidate it immediately?
4. Does respawn reset or preserve it?
5. Can reconnect inherit it?
6. What generation owns deferred work?
7. Can two players trigger this transition in the same tick window?
8. Is the terminal side effect idempotent?
9. Is arena scope explicit?
10. Can stale scoreboard/tag/dynamic-property state masquerade as current session authority?
