# Schemas Agent Rules

Applies to structural/internal schemas.

## Rules

- Schema validates structure; semantic interpretation belongs to analyzers/rules.
- External/vendor schemas retain provenance/version metadata.
- Do not copy large upstream schemas without a concrete use.
- Internal schemas must have one consumer/owner and explicit versioning when persisted.
- Schema validation must preserve unknown fields when forward compatibility requires it.

## Knowledge architecture

Resource Catalog and Graph schemas must use only the canonical vocabulary defined in `docs/system/canonical-naming.md`.

Do not add alias enum values for convenience or backward naming compatibility. Rename/migration must converge on one canonical value.
