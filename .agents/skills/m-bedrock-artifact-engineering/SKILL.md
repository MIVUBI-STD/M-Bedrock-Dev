---
name: m-bedrock-artifact-engineering
description: >
  Handle artifact identity, archive safety, extraction, workspace boundaries, deterministic packaging, and opaque-content preservation. Use as a domain specialist within an active lane.
---

# Lazy-Developer Artifact Engineering

Use when the decision concerns artifact identity, archive safety, extraction, workspace boundaries, deterministic packaging, or opaque-content preservation.

## Procedure

1. Confirm execution context and source immutability.
2. Identify artifact/container kind from evidence, not extension alone.
3. Use `engine/packages/artifact` for identity/fingerprint and `engine/packages/archive` for archive policy/transport.
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


## Lane boundary

During Map Bug Audit this skill inspects/normalizes artifacts only. Missing format support becomes a `detection-gap`.

Engine adapter/archive development belongs to `m-bedrock-detection-development`; do not cross into it implicitly.
