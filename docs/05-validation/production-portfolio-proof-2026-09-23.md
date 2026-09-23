# Production Portfolio Proof — 2026-09-23

This proof uses two representative production `.mcworld` artifacts from the user's existing workspace library.

The artifacts themselves are not committed to this repository.

## Environment

- repository branch: `Local`;
- production proof workspace: portable GitHub Actions artifact;
- Node runtime: `v24.21.0`;
- source/dependencies were installed and verified by GitHub Actions before packaging;
- analysis command: `script-usage` plus per-artifact `inspect`.

## Final Script API portfolio result

Across the two production artifacts:

```text
maps                  2
total occurrences   570
unique symbols       82
known symbols        82
unclassified          0
promotion candidates  0
unknown.* symbols     0
```

The production portfolio is fully classified by the current evidence-backed Script API knowledge layer.

Bundled/minified aliases such as renamed `world` / `system` imports are canonicalized before event, method, and property analysis.

## Artifact-level results

### Production Defense V1

```text
Script API occurrences  202
unique symbols            67
known symbols             67
unclassified               0
unresolved references      0

restricted-execution findings  0
return-contract findings       0
deprecated Script API          0
removed Script API             0
```

The earlier two restricted-execution findings were analyzer false positives caused by line-only containment on bundled one-line/minified source. Source-range precision now includes columns/offset-aware containment, and the false positives are gone.

Remaining diagnostics are informational entity-event static limits:

```text
ENTITY_EVENT_INTERNAL_REACHABILITY_UNKNOWN  76
```

### Production Defense V2

```text
Script API occurrences  368
unique symbols            66
known symbols             66
unclassified               0
unresolved references      0

restricted-execution findings  0
return-contract findings       0
removed Script API             0
deprecated Script API          4
```

The earlier two `Entity.getComponent` return-contract findings were analyzer false positives. Their results are guarded by boolean/conditional control flow; bounded guard analysis now recognizes those patterns.

The four remaining diagnostics are genuine deprecation exposure for the map's declared `@minecraft/server 1.19.0` line:

- `world.afterEvents.entityHurt`;
- `Entity.isValid()`;
- `Entity.runCommandAsync`;
- `Dimension.runCommandAsync`.

These are migration-debt findings, not safe automatic repairs. Replacing them can change runtime semantics or require a target API-line migration. `world.afterEvents.entityHurt` also has a documented removal/reintroduction lifecycle, so the analyzer models removed and reintroduced states instead of treating it as permanently absent.

Remaining informational entity-event limits:

```text
ENTITY_EVENT_INTERNAL_REACHABILITY_UNKNOWN  83
```

## Entity-event static limit

`ENTITY_EVENT_INTERNAL_REACHABILITY_UNKNOWN` does not mean the event is broken.

It means the event is not reachable from:

- configured internal event/sensor roots;
- known engine roots;
- command/script trigger evidence observed by project-level correlation.

The event may still be driven by runtime systems or content surfaces not statically observable from the inspected artifact.

## Final result

The remote static analyzer is production-proven for this representative portfolio:

- 100% of observed Script API symbols are classified;
- bundled singleton aliases are resolved;
- no unknown Script API roots remain;
- no unresolved semantic references remain;
- known false positives in bundled source and guarded return flow were removed;
- remaining warnings distinguish genuine migration debt from static/runtime proof limits.

Further work belongs to controlled migration or Minecraft runtime proof lanes, not generalized static analyzer expansion.
