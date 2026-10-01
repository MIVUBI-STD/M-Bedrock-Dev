# Reliability Catalogs

Repository-owned durable reliability knowledge.

For overall routing, start at `engine/reliability/README.md`.

```text
regressions.json
coverage.json
capability-proof-bindings.json
capability-truth/
map-fingerprints/
minecraft-updates/
```

## Ownership

- `regressions.json` stores minimized **historical failure knowledge**, never full private maps.
- `coverage.json` exposes what test evidence exists and where blindspots remain.
- `capability-proof-bindings.json` binds capabilities to explicit proof artifacts.
- `capability-truth/` records generated capability/proof state.
- `map-fingerprints/` stores stable map compatibility/reliability identity.
- `minecraft-updates/` stores curated semantic update deltas with source/confidence.

## Regression naming boundary

Three regression-related owners intentionally exist:

```text
catalogs/regressions.json
  = durable historical bug knowledge

../corpus/regressions.json
  = executable/frozen benchmark manifest

../../fixtures/regressions/
  = minimized reproducible fixture content
```

Do not merge these concepts and do not create a fourth regression owner.

Catalogs influence retest prioritization, so incomplete or duplicate durable records must fail validation rather than being silently accepted.
