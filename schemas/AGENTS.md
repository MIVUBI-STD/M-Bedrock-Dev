# Schemas Agent Rules

Applies to structural/internal schemas.

## Rules

- Schema validates structure; semantic interpretation belongs to analyzers/rules.
- External/vendor schemas retain provenance/version metadata.
- Do not copy large upstream schemas without a concrete use.
- Internal schemas must have one consumer/owner and explicit versioning when persisted.
- Schema validation must preserve unknown fields when forward compatibility requires it.
