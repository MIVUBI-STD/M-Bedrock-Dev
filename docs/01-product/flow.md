# Product Flow

Canonical lifecycle:

```text
artifact
→ fingerprint
→ safe ingest
→ discovery
→ normalization
→ semantic index / dependency graph
→ diagnostics
→ patch plan
→ transactional mutation
→ validation
→ regression checks
→ repackage
→ evidence report
```

## Principles

- inspection must be useful without mutation;
- diagnostics explain findings rather than silently fixing them;
- repairs are explicit, reproducible transactions;
- validation is matched to the claim being made;
- packaging is separate from semantic correctness;
- runtime acceptance remains distinct from source/static validation.
