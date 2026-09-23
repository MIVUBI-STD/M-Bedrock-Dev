# Script API Version and Execution Privilege Knowledge

Script inspection now separates three questions:

1. Is the Minecraft script module declared?
2. Is the used capability available in the declared module version?
3. Is the API call legal in the current execution privilege?

## Version matrix

The initial machine-readable matrix includes documented stable anchors for:

- World/Entity dynamic properties → @minecraft/server 1.7.0;
- ItemStack dynamic properties → @minecraft/server 1.9.0;
- current 2.x system before/after event surface.

Prerelease versions remain `unknown` unless an explicit track-specific rule exists.

## Execution privileges

The analyzer recognizes:

- restricted execution for ordinary before-events;
- early execution for system.beforeEvents.startup;
- default execution for after-events.

Known world-state mutation calls found directly inside before-event callbacks are reported with:

`SCRIPT_RESTRICTED_EXECUTION_MUTATION`

The current mutator set is intentionally small and evidence-backed.

## Boundary

A method that is not in the known-mutator set is not assumed safe. It is simply not diagnosed yet.
