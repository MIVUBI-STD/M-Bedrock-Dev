# Reliability Catalogs

Repository-owned durable reliability knowledge.

```text
regressions.json
coverage.json
minecraft-updates/
```

## Ownership

- `regressions.json` stores minimized historical failure knowledge, never full private maps.
- `coverage.json` exposes what test evidence exists and where blindspots remain.
- `minecraft-updates/` stores curated semantic update deltas with source/confidence.

Catalogs influence retest prioritization, so incomplete or duplicate durable records must fail validation rather than being silently accepted.
