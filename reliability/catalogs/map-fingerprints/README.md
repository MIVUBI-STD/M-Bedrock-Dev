# Stored Map Fingerprints

This directory is reserved for persisted semantic map fingerprints when the team chooses to cache them.

A stored fingerprint is valid only for the exact artifact fingerprint it records.

Recommended filename:

```text
<map-id>.json
```

Do not reuse a stored fingerprint after the underlying .mcworld changes. Re-inspect and replace it.

Stored fingerprints are optional cache/portfolio inputs, not a second source of map truth.
