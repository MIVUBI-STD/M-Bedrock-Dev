# Redstone, Command Block, and Block-Driven Automation Integrity

## Core problem

Bedrock gameplay is often hybrid:

```text
redstone
command blocks
physical triggers
custom block events
block ticks
script callbacks
```

Treating only scripts as executable logic leaves a major blindspot.

## Automation graph

Model each node with:

```text
trigger
conditions
execution context
side effect
success/failure semantics
downstream nodes
arena scope
generation
```

## Command block context

For every command block track:

- dimension
- position
- impulse / chain / repeat
- conditional / unconditional
- needs-redstone / always-active
- delay in ticks
- execute-on-first-tick
- facing / downstream chain
- command text

This connects directly to selector and command-context analysis.

## Conditional chain hazard

```text
trigger fires
↓
command A matches no entities
↓
command A fails
↓
conditional chain B does not run
↓
arena appears stuck
```

Therefore trigger activity does not prove chain completion.

## Hybrid authority

Bad:

```text
script decides arena READY
and
command block independently decides arena READY
```

Unless an arbitration rule exists, this is split-brain state authority.

## Repeated physical triggers

Pressure plates, redstone power, repeat command blocks, and step/tick events may remain active for multiple ticks. Single-action gameplay requires edge/debounce/idempotency.

## World mutation invalidation

Structure load or block replacement can change:

- command block type/state/command
- wiring
- observer orientation
- redstone sources
- doors/gates
- trigger blocks

After such mutation, cached automation topology is invalid until verified again.

## Reset and residual automation

Reset must disarm old automation before reuse. A surviving ticking block or repeating command block can mutate the next arena generation even if script cleanup is perfect.

## Analyzer diagnostics

- AUTOMATION_GRAPH_MISSING
- AUTOMATION_COMMAND_BLOCK_CONTEXT_INCOMPLETE
- AUTOMATION_CONDITIONAL_CHAIN_HIDDEN_FAILURE
- AUTOMATION_CHAIN_POSTCONDITION_UNVERIFIED
- AUTOMATION_SCRIPT_REDSTONE_DUAL_AUTHORITY
- AUTOMATION_PHYSICAL_TRIGGER_NOT_DEBOUNCED
- AUTOMATION_REPEATING_TRIGGER_DUPLICATE_SIDE_EFFECT
- AUTOMATION_WORLD_MUTATION_INVALIDATED_GRAPH
- AUTOMATION_RESIDUAL_TICK_AFTER_RESET
- AUTOMATION_REPEATING_COMMAND_BLOCK_NOT_DISARMED
- AUTOMATION_REDSTONE_SOURCE_NOT_RESET
- AUTOMATION_BLOCK_TICK_STALE_GENERATION
- AUTOMATION_DELAY_RACE_UNMODELED
- AUTOMATION_SELECTOR_NO_MATCH_BREAKS_CHAIN
- AUTOMATION_LEGACY_QUEUED_TICKING

## Review questions

1. What physically or logically triggers this node?
2. What command-block mode and context does it run under?
3. Can success/failure change downstream chain execution?
4. Can the trigger repeat while held/powered?
5. Who owns the resulting gameplay state?
6. Does script duplicate the same authority?
7. Can world mutation replace the automation topology?
8. Can a block tick survive arena reset?
9. Are delayed command/tick/script schedulers racing?
10. Is any legacy queued-ticking content version-sensitive?