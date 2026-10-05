# Artifacts

Canonical artifact/container/workspace policy.

Owns:

- artifact identity and fingerprint semantics;
- immutable source boundary;
- archive safety;
- source/working/output separation;
- opaque-content preservation;
- deterministic package intent.

Implementation owners are `packages/artifact/`, `packages/archive/`, and relevant adapters.

Package success is never equivalent to Minecraft runtime success.
