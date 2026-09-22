# M-Bedrock Artifact Engineering

Use when the decision concerns artifact identity, archive safety, extraction, workspace boundaries, deterministic packaging, or opaque-content preservation.

## Procedure

1. Confirm execution context and source immutability.
2. Identify artifact/container kind from evidence, not extension alone.
3. Use `packages/artifact` for identity/fingerprint and `packages/archive` for archive policy/transport.
4. Validate inventory before extraction.
5. Preserve unknown content byte-for-byte unless explicitly targeted.
6. Keep source, working, and output separate.
7. Package deterministically where practical.
8. Report only STATIC/PACKAGE proof actually established.

## Never

- execute artifact-contained scripts during inspection;
- write outside owned workspace;
- mutate original source;
- let a ZIP library become semantic safety authority;
- treat successful repackaging as Minecraft runtime proof.
