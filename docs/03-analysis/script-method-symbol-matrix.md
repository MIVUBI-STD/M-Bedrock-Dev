# Script Method Symbol Matrix

Script compatibility evaluates method calls at symbol granularity and now includes bounded receiver-type inference.

## Usage-driven direct symbols

The direct singleton rules currently include:

- `world.getAllPlayers` → stable from `@minecraft/server 1.0.0`;
- `world.getDimension` → stable from `@minecraft/server 1.0.0`;
- `system.runInterval` → stable from `@minecraft/server 1.1.0`.

## Bounded receiver inference

The analyzer propagates only receiver types that can be derived from a small evidence-backed flow model:

- `world.getAllPlayers()` / `world.getPlayers()` → `Player[]`;
- `world.getDimension()` → `Dimension`;
- `Dimension.getEntities()` → `Entity[]`;
- `Dimension.getPlayers()` → `Player[]`;
- `world.scoreboard` → `Scoreboard`;
- `Scoreboard.getObjective()` → `ScoreboardObjective`;
- array element flow through `for...of`, `find`, `filter`, `forEach`, `map`, `some`, and `every`;
- simple local helper functions with one directly inferable return expression;
- explicit receiver type annotations for the supported Bedrock receiver classes.

Player calls inherited from Entity are canonicalized to the Entity symbol. For example, `player.getTags()` becomes `Entity.getTags`.

## Evidence-backed receiver rules

Current rules include:

- `Dimension.getEntities` → stable from `1.1.0`;
- `Entity.addTag` → stable from `1.2.0`;
- `Entity.getTags` → stable from `1.2.0`;
- `Entity.removeTag` → stable from `1.2.0`.

Scoreboard receiver types are recognized so real usage can be inventoried, but Scoreboard method minima are intentionally left unclassified until method-level version evidence is strong enough.

## Safety boundary

This is not a general TypeScript type checker. Unknown function returns, arbitrary object aliases, dynamic property access, unresolved imports, and unsupported receiver types remain unclassified. The analyzer prefers missing a rule over inventing a receiver type.

## Diagnostics

A known method used against an older stable manifest dependency emits:

`SCRIPT_API_VERSION_INCOMPATIBLE`

Unknown methods and receiver paths do not emit compatibility failures.
