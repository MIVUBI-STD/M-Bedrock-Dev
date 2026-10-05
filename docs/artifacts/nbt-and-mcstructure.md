# NBT and mcstructure Boundary

Bedrock `.mcstructure` is treated as a specialized binary artifact rather than generic ZIP content. Microsoft documents it as a structure file exported/imported through Structure Blocks, containing structure content that may include blocks and entities. citeturn490291search0turn490291search2

## Layers

```text
binary bytes
→ generic Bedrock NBT transport
→ mcstructure semantic normalization
→ analyzers
→ repair transaction
```

Generic NBT transport must not know what a palette, block index, or structure size means.

## Preservation

The adapter keeps both:

- exact original bytes;
- typed NBT;
- simplified inspection view;
- normalized supported facts.

Untouched NBT artifacts pass through using original bytes. This prevents incidental serializer churn for files unrelated to a repair.

## Safety

Do not disable NBT array safety checks merely to parse an unexpectedly large structure. Large/hostile NBT handling needs its own explicit resource policy.

Do not execute entity commands/scripts while inspecting structure data.
