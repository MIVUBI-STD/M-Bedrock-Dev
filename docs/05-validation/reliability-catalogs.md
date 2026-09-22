# Reliability Catalogs

Durable blindspot knowledge lives under `reliability/catalogs/`.

## Regression catalog

Historical bugs are stored as minimized metadata rather than private world files.

Initial seeded regressions cover:

- Capture Run gate blocked by an unintended fill;
- Loadout Trial entity failing to break a wall;
- concurrent multi-arena cutscenes serializing across sessions.

These entries are evidence for future retest selection. They are not claims that every map shares the same defect.

## Coverage catalog

Coverage is intentionally conservative. Unknown and partial states are expected and useful.

The catalog currently exposes major blindspots such as:

- entity static/runtime behavior;
- multiplayer generative/runtime behavior;
- chunk runtime lifecycle;
- cross-version differential execution.

## Minecraft update catalogs

Update deltas are version-specific and must include source/confidence.

No update JSON should be committed merely to create a green/complete-looking matrix. A missing version catalog is better than speculative update intelligence.

## Loader

Repository and runtime loaders validate:

- schema version;
- duplicate durable IDs;
- required regression behavior fields;
- coverage key uniqueness;
- update filename/version agreement.

Catalog-backed retest APIs then combine these durable records with live map inspection.
