# Adapters Agent Rules

Applies to external/source-format adapters.

Adapters translate external Bedrock/Education representations into canonical engine representations and, where supported, back again.

## Rules

- Do not own gameplay diagnostics or repair decisions.
- Do not invent compatibility policy.
- Preserve unknown fields/opaque payloads whenever lossless roundtrip matters.
- Keep generic container/archive concerns in `packages/archive`.
- Keep semantic normalized types in their canonical package/analyzer owner.
- Specialized binary formats may have dedicated adapters, but transport and semantics remain separate.
- Every adapter must state its supported format/version assumptions.

Expected future lanes include `.mcstructure`, LevelDB/world database, and other specialized Bedrock binary formats only when implementation begins.
