# Reliability Agent Rules

Applies to `engine/reliability/`.

- `catalogs/` owns durable regression, coverage, and Minecraft-update intelligence.
- `history/` owns immutable campaign/reliability execution history.
- Reliability evidence prioritizes retest and release decisions; it does not redefine gameplay semantics.
- Keep private/full production maps out of reliability data.
- Prefer fingerprints, minimized evidence, and stable identifiers.
- Historical execution records are append-oriented and content-identifiable.
