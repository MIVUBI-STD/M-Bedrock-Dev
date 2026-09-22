# Adapters

Format-boundary translation for Bedrock/Education content.

## Purpose

Adapters translate external representations to/from canonical engine models without becoming semantic-policy owners.

Expected specialized adapters may include:

```text
mcworld / pack container handoff
mcstructure / NBT
LevelDB world database
other specialized binary formats
```

Generic ZIP transport remains in `packages/archive/`.

No adapter should be added until a concrete format boundary is implemented.
