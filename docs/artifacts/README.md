# Artifacts

Canonical artifact/container/workspace policy.

Owns:

- artifact identity and fingerprint semantics;
- immutable source boundary;
- archive safety;
- source/working/output separation;
- opaque-content preservation;
- deterministic package intent.

## Canonical documents

- [Archive Safety](./archive-safety.md) — archive traversal, extraction, and source-preservation boundary.
- [LevelDB](./leveldb.md) — artifact-side LevelDB handling and safety boundary.
- [NBT and mcstructure](./nbt-and-mcstructure.md) — normalized binary/structure representation boundaries.
- [ZIP Transport](./zip-transport.md) — deterministic package transport and round-trip expectations.

Implementation owners are `engine/packages/artifact/`, `engine/packages/archive/`, and relevant adapters.

Package success is never equivalent to Minecraft runtime success.
