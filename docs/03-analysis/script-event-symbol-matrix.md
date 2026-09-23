# Script Event Symbol Matrix

Script compatibility now evaluates event symbols directly instead of assigning one minimum version to an entire event container.

## Why

The API surface is not introduced uniformly.

For example, `system.afterEvents.scriptEventReceive` exists in prior 1.x documentation, while current experimental changelogs add newer symbols such as:

- `world.beforeEvents.chatSend`;
- `world.beforeEvents.playerPlaceBlock`;
- `world.beforeEvents.worldClockOnRestart`;
- `system.beforeEvents.watchdogTerminate`.

These newer symbols are currently documented as pre-release.

## Diagnostics

If a script subscribes to a known pre-release symbol but the owning manifest declares a stable @minecraft/server dependency, inspection emits:

`SCRIPT_API_PRERELEASE_SYMBOL`

A beta/internal dependency does not trigger this diagnostic.

Unknown events are not assumed incompatible. They remain unclassified until an evidence-backed matrix rule exists.
