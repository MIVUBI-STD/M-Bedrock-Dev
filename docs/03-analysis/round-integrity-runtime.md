# Objective, Scoring, Win-Loss, and Round Completion Integrity

## Core problem

A terminal condition becoming true is not the same as the round being safely completed.

```text
objective evidence
↓
TERMINAL_CANDIDATE
↓
deterministic resolution
↓
RESULT_COMMITTED
↓
reward/progression
↓
cleanup
↓
COMPLETE
```

## Single terminal owner

Possible competing terminal signals:

- timer expired
- objective completed
- all enemies dead
- all players dead
- target entity destroyed
- disconnect policy
- admin/dev skip
- scripted fail condition

All may propose a result. Only one owner may commit it.

## Enemy-count integrity

Avoid decrement-only authority because duplicate death events, entity replacement, unload/reload, or recovery can drift the counter.

Prefer generation-scoped registry truth:

```text
expected critical enemies
↓
current lifecycle/residency/death evidence
↓
remaining set
```

## Simultaneous terminal conditions

Example: last enemy dies while the timer also reaches zero in the same tick window. Callback order must not implicitly decide the winner.

Define a deterministic policy such as objective wins ties, timeout wins ties, exact-tick comparison, or explicit draw.

## Participant predicates

Round completion must explicitly define treatment of disconnected, downed, dead, respawning, spectator, late-joining, and stale-generation players.

## Reward ordering

```text
RESULT_COMMITTED
↓
reward operation token
↓
durable/idempotent reward
↓
cleanup
```

## Result audit record

Recommended fields: resultId, arenaId, arenaGeneration, terminalReason, winner or loser, participantRevision, objectiveEvidence, commitTick, rewardOperationId.

## Analyzer diagnostics

- ROUND_TERMINAL_OWNER_MISSING
- ROUND_DOUBLE_COMPLETION
- ROUND_CONFLICTING_TERMINAL_RESULT
- ROUND_CALLBACK_ORDER_DECIDES_WINNER
- ROUND_OBJECTIVE_AUTHORITY_UNDECLARED
- ROUND_ENEMY_COUNT_DRIFT
- ROUND_ENEMY_COUNT_DECREMENT_ONLY
- ROUND_ENTITY_UNLOAD_COUNTED_AS_DEATH
- ROUND_DEAD_PLAYER_COUNTED_ACTIVE
- ROUND_DISCONNECTED_PLAYER_BLOCKS_COMPLETION
- ROUND_STALE_TIMER_COMPLETES_NEW_GENERATION
- ROUND_OBJECTIVE_PROGRESS_DUPLICATE
- ROUND_REWARD_BEFORE_RESULT_COMMIT
- ROUND_DUPLICATE_REWARD
- ROUND_CLEANUP_DESTROYS_RESULT_EVIDENCE
- ROUND_RESULT_AUDIT_MISSING

## Review questions

1. What source owns objective truth?
2. Who owns the terminal transition?
3. Can two terminal conditions occur together?
4. What deterministic tie policy resolves them?
5. Is enemy count registry-derived or decrement-only?
6. How are disconnect/death/respawn treated?
7. Is the timer generation-scoped?
8. Is objective progress idempotent?
9. Are rewards after result commit?
10. Can result/reward be reconstructed after crash?