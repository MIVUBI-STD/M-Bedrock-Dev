# Performance, Watchdog, and Scheduler Budgeting

## Core problem

Correct logic can still be operationally incorrect if too much of it executes in one tick.

Typical sources:

```text
chunk coverage scans
entity queries
structure verification
retry loops
arena readiness checks
persistence reconciliation
worldLoad recovery
multiple simultaneous arenas
```

## Work priority classes

```text
CRITICAL_NOW
SOON
BACKGROUND
RECOVERY
```

Only CRITICAL_NOW belongs on the immediate path.

## Two-level budget

Use both:

```text
GLOBAL RUNTIME BUDGET
        ↓
PER-ARENA BUDGETS
```

A system where every arena individually stays within its own budget can still overload the server when many arenas run together.

## Retry storm example

Bad:

```text
Arena 1: 20 missing entities -> retry every tick
Arena 2: 20 missing entities -> retry every tick
Arena 3: structure verify -> retry every tick
Recovery: 10 orphan checks -> retry every tick
```

This creates multiplicative scheduler pressure.

Better:

```text
coalesce per logical target
↓
bounded retry
↓
backoff
↓
global admission budget
↓
terminal diagnostic
```

## runJob rule

Each generator iteration must be small.

Bad:

```text
yield once after scanning 2,000 entities
```

Good:

```text
small bounded unit
yield
small bounded unit
yield
```

## Query rule

Prefer:

```text
filtered query
small spatial scope
lower frequency
registry/event-driven cache
```

over:

```text
get every entity
every tick
filter in JS
```

## worldLoad thundering herd

On restart do not launch all recovery jobs simultaneously.

Use phases:

```text
BOOT
↓
critical durable reconciliation
↓
arena ownership repair
↓
entity registry repair
↓
structure verification
↓
background mirror cleanup
```

## Runtime metrics to trace

Recommended fields:

```text
tick
operationId
arenaId
category
priority
attempt
entitiesScanned
blocksChecked
callbacksScheduled
jobsActive
durationProxy
result
```

## Analyzer diagnostics

- PERF_FULL_WORLD_SCAN_HOTPATH
- PERF_UNFILTERED_ENTITY_QUERY
- PERF_PER_TICK_QUERY_TOO_BROAD
- PERF_RETRY_STORM
- PERF_INTERVAL_OVERLAP
- PERF_DUPLICATE_SCHEDULED_WORK
- PERF_RUNJOB_ITERATION_TOO_LARGE
- PERF_MULTI_ARENA_BUDGET_UNBOUNDED
- PERF_GLOBAL_BUDGET_MISSING
- PERF_RECOVERY_THUNDERING_HERD
- PERF_WATCHDOG_RISK
- PERF_STABLE_LOOKUP_RECOMPUTED
- PERF_BACKGROUND_WORK_ON_CRITICAL_PATH
- PERF_UNBOUNDED_RECOVERY_SCAN
- PERF_PERFORMANCE_CLAIM_UNMEASURED

## Review questions

1. Can this run every tick?
2. How many arenas can execute it concurrently?
3. How many entities/blocks can it touch?
4. Is the query filtered?
5. Can duplicate requests coalesce?
6. Can one interval overlap its prior iteration?
7. Is retry bounded and backed off?
8. Is one runJob iteration itself bounded?
9. What happens on slow mobile hardware?
10. Is there profiler evidence for the suspected hot path?
