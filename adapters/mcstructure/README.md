# mcstructure Adapter

Specialized semantic adapter for Bedrock `.mcstructure` content.

Microsoft documents `.mcstructure` as the Bedrock structure file shared/exported from Structure Blocks, and structures may contain both blocks and entities. citeturn490291search0turn490291search2

## Boundary

```text
raw bytes
→ adapters/nbt       typed little-endian NBT
→ adapters/mcstructure
→ normalized structure model
→ analyzers/diagnostics/repair consumers
```

The adapter intentionally retains:

- typed NBT for future safe serialization;
- exact original bytes for untouched pass-through;
- simplified raw representation for inspection;
- normalized size/world-origin/palette/index/entity facts when present.

Unknown fields remain preserved in typed/raw representations.

## Mutation policy

Do not mutate simplified NBT.

Future structure mutation must:

1. target typed NBT;
2. prove palette/index invariants;
3. mark the NBT document dirty;
4. serialize only the modified structure;
5. preserve untouched structures byte-identically.
