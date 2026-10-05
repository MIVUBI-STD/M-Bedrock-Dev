# Event Ordering and Tick Semantics

## Why this exists

M-Bedrock-Dev must not collapse these into one concept:

```text
event fired
mutation requested
mutation queued
mutation applied
state observable
dependent system synchronized
```

They are different evidence stages.

## Tick-oriented mental model

A practical analyzer model is:

```text
BEFORE_EVENT
  ↓ restricted/cancellable stage
ENGINE ACTION
  ↓
ASYNC / SCHEDULED WORK
  ↓
RUN CALLBACKS / JOB WORK
  ↓
AFTER_EVENT
  ↓
entity/server tick applies some queued state
  ↓
state verification
  ↓
next tick
```

This is intentionally an analysis model, not a promise that every API follows one identical micro-order.

## Core rule

Never infer:

```text
event observed == final state visible
```

Use:

```text
EVENT_RECEIVED
MUTATION_QUEUED
MUTATION_APPLIED
STATE_VERIFIED
```

## High-risk patterns

### Same-event read-after-write

```text
entity event
  ↓ add component group
  ↓ immediately test for component
```

The test can still see the old state.

### Cross-entity ordering

Entity A sends event to Entity B. B may process it same tick or next tick depending on update order.

### system.run false serialization

Two players both schedule `system.run(startArena)`. Deferral does not mean only one callback owns the transition.

### after-event false barrier

An after-event does not prove every scoreboard, entity property, UI, deferred command, and other subsystem has globally converged.

### stale deferred result

A form, timer, command Promise, or deferred callback completes after arena/session generation changed.

## Required ownership envelope

```ts
interface DeferredOwnership {
  operationId: string;
  scheduledTick: number;
  playerKey?: string;
  connectionGeneration?: number;
  arenaId?: string;
  arenaGeneration?: number;
  participationGeneration?: number;
}
```

Execution begins with ownership validation.

## Runtime trace schema

Recommended trace fields:

```text
tick
phase
eventType
operationId
playerKey
connectionGeneration
arenaId
arenaGeneration
participationGeneration
evidenceStage
result
```

Recommended phases:

```text
BEFORE_EVENT
ENGINE_ACTION
DEFERRED_CALLBACK
AFTER_EVENT
ENTITY_TICK_APPLY
STATE_VERIFY
```

## Analyzer diagnostics

- EVENT_READ_AFTER_WRITE_UNVERIFIED
- EVENT_PENDING_MUTATION_TREATED_AS_APPLIED
- EVENT_CROSS_ENTITY_ORDER_ASSUMPTION
- BEFORE_EVENT_ILLEGAL_MUTATION
- SYSTEM_RUN_FALSE_SERIALIZATION
- AFTER_EVENT_FALSE_GLOBAL_BARRIER
- DEFERRED_CALLBACK_STALE_GENERATION
- DEFERRED_RESULT_STALE_STATE
- STATE_VISIBILITY_RETRY_UNBOUNDED
- ROOT_CONTEXT_WORLD_NOT_READY
- RUNJOB_USED_AS_PRECISE_TIMER
- TICK_EQUALITY_TREATED_AS_ATOMICITY

## Review questions

1. What exact event phase is this code running in?
2. Is mutation legal in that execution privilege?
3. Is the changed state immediately observable?
4. Does a dependent branch require verification?
5. Can the callback execute after generation changes?
6. Does `system.run` merely defer, or is code wrongly using it as a lock?
7. Does cross-entity logic assume fixed update order?
8. Can a result arrive after player disconnect/reset?
9. Is retry bounded?
10. Does trace data contain enough phase/tick/generation evidence to reconstruct the race?
