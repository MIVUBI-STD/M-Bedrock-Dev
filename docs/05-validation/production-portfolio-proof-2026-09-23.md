# Production Portfolio Proof — 2026-09-23

This proof uses two representative production `.mcworld` artifacts from the user's existing workspace library.

The artifacts themselves are not committed to this repository.

## Environment

- repository branch: `Local`;
- production proof workspace: portable GitHub Actions artifact;
- Node runtime: `v24.20.0`;
- source was installed and verified by GitHub Actions before packaging;
- analysis command: `script-usage` plus per-artifact `inspect`.

## Script API portfolio result

Across the two production artifacts:

```text
maps                  2
total occurrences     570
unique symbols         82
known symbols          82
unclassified symbols    0
promotion candidates    0
unknown.* symbols        0
```

This proves the current production-observed Script API surface is fully classified by the repository's evidence-backed knowledge layer.

The proof also validated bundled/minified aliases such as renamed `world` / `system` imports. Those aliases are canonicalized back to the singleton roots before event, method, and property analysis.

## Artifact-level results

### Production Defense V1

```text
Script API occurrences  202
unique symbols            67
known symbols             67
unclassified               0
unresolved references      0
```

Remaining diagnostics:

- 76 `ENTITY_EVENT_INTERNAL_REACHABILITY_UNKNOWN` — info-level static limits;
- 2 `SCRIPT_RESTRICTED_EXECUTION_MUTATION` — map-level findings.

### Production Defense V2

```text
Script API occurrences  368
unique symbols            66
known symbols             66
unclassified               0
unresolved references      0
```

Remaining diagnostics:

- 83 `ENTITY_EVENT_INTERNAL_REACHABILITY_UNKNOWN` — info-level static limits;
- 4 `SCRIPT_API_DEPRECATED_SYMBOL` — real migration debt in the map;
- 2 `SCRIPT_API_RETURN_CONTRACT_RISK` — real optional-return safety findings.

The four deprecated symbols observed in this artifact are:

- `world.afterEvents.entityHurt`;
- `Entity.isValid()`;
- `Entity.runCommandAsync`;
- `Dimension.runCommandAsync`.

The two return-contract findings are `Entity.getComponent` results used through unguarded assigned-result flows on an `@minecraft/server 1.19.0` manifest.

## Entity-event static limit

`ENTITY_EVENT_INTERNAL_REACHABILITY_UNKNOWN` is not treated as a broken event.

It means the entity event is not reachable from:

- configured internal event/sensor roots;
- known engine roots;
- command/script trigger evidence observed by the project-level correlator.

The event may still be triggered by runtime systems or content surfaces not statically observable from the inspected artifact.

These findings remain informational until runtime or additional project evidence proves otherwise.

## Result

The remote static architecture is now production-proven for this representative portfolio:

- no unclassified Script API usage remains;
- no unknown singleton-root usage remains;
- no unresolved graph references remain;
- genuine map-level migration/risk findings remain distinguishable from analyzer knowledge gaps.

Further work belongs to map repair or runtime proof lanes, not generalized static architecture expansion.
