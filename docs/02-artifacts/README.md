# Artifact Boundary

The artifact layer owns source identity, immutable-source guarantees, content fingerprints, container classification, archive safety and handoff into the normalized project model.

## Permanent invariants

1. Original artifacts are immutable.
2. File extension is a hint, not semantic truth.
3. Every source artifact receives a SHA-256 fingerprint.
4. Extraction is sandboxed and resource-bounded.
5. Unknown content is preserved.
6. Artifact parsing and semantic analysis are separate.
7. Analyzers do not mutate source artifacts.
8. Mutations are explicit transactions with preconditions.
9. Repackaging should be deterministic where practical.
10. Package success does not imply gameplay correctness.

## Representation policy

Text/JSON parsers should preserve raw representation alongside normalized semantic views when lossless targeted edits matter.

Binary content is classified as:

- parsed;
- opaque/preserved;
- specialized.

`.mcstructure` and LevelDB are specialized formats and do not belong inside generic archive logic.
