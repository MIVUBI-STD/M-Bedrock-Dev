# Defense V2 Script API Migration Exposure — 2026-09-23

This report separates exact Script API classification from lexical migration exposure for the production Defense V2 artifact.

The map declares `@minecraft/server 1.19.0`, where several APIs are documented as deprecated but still available.

## Why lexical exposure exists

Bundled production JavaScript can erase enough receiver-type information that a member call is observable while its exact Minecraft receiver class is not provable.

The analyzer therefore distinguishes:

- `exact-symbol` — bounded receiver inference proves the canonical Script API symbol;
- `lexical-only` — the deprecated member name is present, but the receiver is not strong enough to make a compatibility diagnostic.

Lexical-only evidence is inventory data, not a bug finding.

## Defense V2 migration exposure

```text
runCommandAsync
  total occurrences       57
  exact-symbol            10
  lexical-only            47
  exact candidates:
    Entity.runCommandAsync       4
    Dimension.runCommandAsync    6

isValid
  total occurrences       16
  exact-symbol             5
  lexical-only            11
  candidate symbols:
    Entity.isValid
    ScoreboardObjective.isValid

playSound
  total occurrences        2
  exact-symbol              0
  lexical-only              2
  candidate symbol:
    world.playSound
```

The normal Script API inventory remains fully classified:

```text
occurrences       368
unique symbols     66
known symbols      66
unclassified        0
promotion candidates 0
```

## Repair decision

A broad `runCommandAsync → runCommand` rewrite is intentionally not applied.

The prior 1.x API exposes synchronous `runCommand` and deprecated asynchronous `runCommandAsync`, but replacing the asynchronous call globally can change execution ordering, promise/error behavior, and tick-sensitive gameplay.

A partial migration was tested locally and rejected as a final repair because replacing the first classified calls only exposed later occurrences while leaving the wider migration surface unchanged.

Therefore:

- the original production artifact remains the canonical map for runtime proof;
- no partial "API cleanup" artifact is considered a finished repair;
- migration should happen only when a target Script API line is explicitly chosen and Minecraft runtime validation is available.

## Current map findings

After source-range and guarded-flow precision fixes:

### Defense V1

- no Script API diagnostics;
- no unresolved references;
- only informational entity-event reachability limits remain.

### Defense V2

Four minor deprecation diagnostics remain:

- `world.afterEvents.entityHurt`;
- `Entity.isValid()`;
- `Entity.runCommandAsync`;
- `Dimension.runCommandAsync`.

These are migration-debt indicators for the declared 1.19 API line, not evidence that the current map is broken.

The analyzer also models `entityHurt` as a non-monotonic lifecycle: deprecated in the prior 1.x surface, removed in 2.0.0, and reintroduced in 2.6.0.

## Boundary

The next meaningful action is runtime proof or an explicit API-upgrade migration.

Static rewriting is not the bottleneck and should not be expanded simply to eliminate warnings.
