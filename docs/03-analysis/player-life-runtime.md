# Death, Respawn, Downed, and Revive Lifecycle

## Core distinction

Minecraft engine lifecycle and project gameplay lifecycle are not the same thing.

```text
ENGINE:
health change -> death -> respawn

PROJECT:
ACTIVE
  ↓
DOWNED
  ↓
BEING_REVIVED
  ├─ REVIVED
  └─ DEAD_CONFIRMED
       ↓
RESPAWNING
       ↓
ACTIVE / ELIMINATED
```

DOWNED is not an engine fact. It is project state.

## Why this matters

A bug such as a downed player reviving themselves by pressing shift happens when input is treated as revive proof without validating who owns the revive transaction.

Correct revive proof requires:

```text
target is DOWNED
reviver exists
reviver != target
same arenaGeneration
same current participation scope
reviver connected
reviver ACTIVE
interaction condition valid
reviveGeneration current
timer still current at completion
target still DOWNED/BEING_REVIVED
```

## Required identity envelope

```ts
interface ReviveOwnership {
  arenaId: string;
  arenaGeneration: number;

  targetPlayerKey: string;
  targetConnectionGeneration: number;
  targetParticipationGeneration: number;
  targetLifeGeneration: number;

  reviverPlayerKey: string;
  reviverConnectionGeneration: number;

  reviveGeneration: number;
}
```

## Terminal evidence

Do not collapse:

```text
health <= threshold
health == 0
entityDie observed
playerSpawn initialSpawn=false
```

into one signal.

They represent different evidence.

## Revive invalidation

Cancel current revive when any of these occur:

- target dies
- target disconnects
- reviver disconnects
- target respawns
- target leaves arena
- reviver leaves arena
- arenaGeneration changes
- participationGeneration changes
- target lifeGeneration changes
- another terminal transition wins
- interaction requirement breaks beyond permitted grace period

## Respawn reconciliation matrix

Every map should define reset/preserve behavior for:

| Surface | Respawn action |
| --- | --- |
| life state | reset/reconcile |
| health | engine + project policy |
| gamemode | restore intended mode |
| inventory | explicit reset/preserve |
| effects | explicit reset/preserve |
| input permissions | restore |
| tags | repair mirrors |
| scoreboard | repair mirrors |
| dynamic properties | preserve only durable fields |
| pending teleports | invalidate stale operations |
| revive ownership | clear |
| timers | clear stale generation |
| arena membership | preserve/reassign by policy |

## Analyzer diagnostics

- LIFE_DOWNED_AUTHORITY_UNDECLARED
- LIFE_LOW_HEALTH_TREATED_AS_DEATH
- LIFE_SELF_REVIVE_ALLOWED
- LIFE_REVIVER_EQUALS_TARGET
- LIFE_MULTIPLE_REVIVE_TRANSACTIONS
- LIFE_STALE_REVIVE_TIMER
- LIFE_REVIVE_AFTER_DEATH
- LIFE_REVIVE_AFTER_DISCONNECT
- LIFE_CROSS_ARENA_REVIVE
- LIFE_DEAD_COUNTED_ACTIVE
- LIFE_DEAD_COUNTED_READY
- LIFE_RESPAWN_STATE_LEAK
- LIFE_RESPAWN_INVENTORY_DOUBLE_RESTORE
- LIFE_SPECTATOR_STATE_LEAK
- LIFE_HEALTH_HANDLER_RECURSIVE_MUTATION
- LIFE_DUPLICATE_REVIVE_COMPLETION

## Review questions

1. What owns DOWNED state?
2. What exact signal transitions ACTIVE -> DOWNED?
3. Is death engine-confirmed or threshold-inferred?
4. Can target equal reviver?
5. Can two revivers own the same target?
6. What invalidates revive timer?
7. What happens if target dies during revive?
8. What happens if either player disconnects?
9. What survives respawn?
10. Are dead/respawning players excluded from active/ready predicates?
