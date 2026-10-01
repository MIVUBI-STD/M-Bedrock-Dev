# Reliability Agent Rules

Applies to `engine/reliability/`.

Read `engine/reliability/README.md` first for canonical routing.

- `catalogs/` owns durable regression, coverage, capability-proof, fingerprint, and Minecraft-update intelligence.
- `corpus/` owns frozen calibration, blind-acceptance, and regression benchmark manifests.
- `history/` owns immutable/append-oriented campaign and reliability execution history.
- `engine/fixtures/regressions/` owns minimized reproducible fixture content; do not duplicate fixture payloads under reliability.
- Reliability evidence prioritizes retest and release decisions; it does not redefine gameplay semantics.
- Keep private/full production maps out of tracked reliability data.
- Prefer fingerprints, minimized evidence, and stable identifiers.
- Historical execution records are append-oriented and content-identifiable.
- Do not create parallel benchmark/corpus/regression owners elsewhere.
