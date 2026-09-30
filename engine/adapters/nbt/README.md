# NBT Adapter

Generic NBT transport adapter for Bedrock binary content.

Current implementation uses `prismarine-nbt` for typed little-endian parsing/writing while M-Bedrock-Dev owns safety, semantic interpretation, mutation policy, and source preservation.

## Invariants

- Bedrock NBT format is explicit; do not silently reinterpret as Java big-endian.
- Typed NBT is retained for writable roundtrip.
- Simplified NBT is read-only convenience and must never be the source for serialization.
- Unmodified documents reuse their exact original bytes.
- A document is serialized only after an explicit mutation marks it dirty.
- NBT transport does not own mcstructure semantics.
