# Schemas

Structural schemas for internal persisted contracts or supported external formats.

Schemas answer **shape**, not gameplay meaning.

Requirements:

- identify owner/consumer;
- identify schema/version applicability;
- preserve provenance for external schemas;
- avoid large copied schema catalogs without active use;
- preserve unknown fields when forward-compatible behavior requires it.

## Knowledge architecture schemas

- `knowledge-architecture/resource-catalog.v1.schema.json` — stable resource identity, class, domain, role, authority, path, and lifecycle.
- `knowledge-architecture/graph.v1.schema.json` — typed relationships between registered resource IDs.

These schemas define structure only. Canonical vocabulary and semantics remain owned by `docs/system/canonical-naming.md` and `docs/system/authority-model.md`.

Do not add a second metadata schema for the same Resource Catalog or Graph concepts.
