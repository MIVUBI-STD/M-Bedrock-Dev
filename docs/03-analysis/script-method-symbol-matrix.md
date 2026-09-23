# Script Method Symbol Matrix

Script compatibility now evaluates direct `world.*` and `system.*` method calls at symbol granularity.

## Initial usage-driven seed

The first rules are limited to methods already used by the repository runtime harness:

- `world.getAllPlayers` → stable from `@minecraft/server 1.0.0`;
- `world.getDimension` → stable from `@minecraft/server 1.0.0`;
- `system.runInterval` → stable from `@minecraft/server 1.1.0`.

Each rule carries official Microsoft source provenance.

## Parser boundary

The script parser only records direct root calls whose receiver is statically known to be the imported `world` or `system` singleton.

Calls such as `player.getTags()`, `dimension.getEntities()`, or `world.scoreboard.getObjective()` are not assigned a class-level compatibility rule yet because doing so would require receiver-type inference. Unknown or unregistered method symbols remain unclassified rather than being guessed incompatible.

## Diagnostics

When a known stable method is used with an older stable manifest dependency, inspection emits:

`SCRIPT_API_VERSION_INCOMPATIBLE`

The diagnostic includes `symbolKind: "method"`, the exact symbol, declared module version, required version, and rule ID.

Pre-release module versions remain unknown for stable-minimum comparison until track-specific evidence is registered.
