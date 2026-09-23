# Command Execution and Selector Context Semantics

## Core problem

A command can be syntactically valid and still target the wrong player, arena, dimension, or location.

The analyzer must track a context envelope:

```text
executor
dimension
position
rotation
anchor
arena scope
session/arena generation
```

## Context-transforming execute clauses

```text
execute as        -> executor
execute at        -> position context
execute in        -> dimension
execute positioned-> position
execute rotated   -> rotation
execute anchored  -> anchor
```

These are not interchangeable.

## Selector hazards

### @p

Depends on execution origin.

Command block:

```text
command block location
   ↓
@p
   ↓
nearest player to command block
```

Not necessarily the player who conceptually triggered the gameplay.

### @a

Means all online players unless filtered. In a multi-arena map, bare @a is global scope.

### @s

Means current executing entity. A command block is not the same execution context as a player/entity.

### radius / volume

r/rm and dx/dy/dz are origin-sensitive. Moving the execute context moves the selector area.

## Multi-arena rule

Do not use:

```text
@a[tag=arena]
```

as final membership proof if tags can be stale.

Prefer:

```text
current arena registry
  ↓
current arenaGeneration
  ↓
resolved current participants
  ↓
command targets
```

## Cardinality contracts

Every critical selector should have an expected target count:

```text
EXACTLY_ONE
ZERO_OR_ONE
AT_LEAST_ONE
MANY
```

Example:

```text
teleport destination -> EXACTLY_ONE
arena participants    -> MANY
reviver target        -> EXACTLY_ONE
optional marker       -> ZERO_OR_ONE
```

## Script-issued commands

`Dimension.runCommand` executes in the selected dimension context and returns a result. Critical paths should validate expected success count.

Do not assume:

```text
no exception = intended targets changed
```

## Analyzer diagnostics

- COMMAND_EXECUTOR_CONTEXT_UNKNOWN
- COMMAND_DIMENSION_CONTEXT_UNKNOWN
- COMMAND_RELATIVE_ORIGIN_UNPROVEN
- COMMAND_SELECTOR_GLOBAL_SCOPE
- COMMAND_SELECTOR_ORIGIN_LEAK
- COMMAND_SELECTOR_STALE_TAG_SCOPE
- COMMAND_SELECTOR_NO_MATCH_CRITICAL
- COMMAND_SELECTOR_CARDINALITY_MISMATCH
- COMMAND_BLOCK_AT_S_INVALID_CONTEXT
- COMMAND_NESTED_EXECUTE_CONTEXT_CONFUSION
- COMMAND_SCRIPT_WRONG_DIMENSION
- COMMAND_RESULT_COUNT_UNCHECKED
- COMMAND_FUNCTION_CALLER_CONTEXT_HIDDEN
- COMMAND_CROSS_ARENA_TARGET_LEAK

## Review questions

1. Who is the executor here?
2. What is @s at this point?
3. What dimension is active?
4. What position is the selector measured from?
5. Has nested execute changed position/rotation independently?
6. Is @p actually the intended player?
7. Is @a intentionally global?
8. What proves current arena membership?
9. What target cardinality is expected?
10. What happens when selector resolves zero or too many targets?
