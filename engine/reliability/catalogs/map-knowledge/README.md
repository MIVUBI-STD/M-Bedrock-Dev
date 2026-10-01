# Map Knowledge

Durable, evidence-backed knowledge about how tested maps are structured and where they are historically fragile.

This is not a copy of the map, a bug report, or an exact artifact fingerprint.

- Exact artifact-derived compatibility identity belongs in `../map-fingerprints/`.
- Historical incidents belong in `../regressions.json`.
- Reusable failure abstractions belong in `../failure-patterns.json`.
- This directory connects those sources into a compact per-map engineering profile.

A historical-regression record must cite regression IDs in `evidenceRefs` / `regressionIds`. Unknown artifact facts must stay absent rather than being written as zero/false.
