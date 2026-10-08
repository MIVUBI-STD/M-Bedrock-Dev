---
name: m-bedrock-compatibility
description: >
  Resolve Minecraft Bedrock/Education version, manifest, Script API, experiment, and capability semantics as a domain specialist. Does not itself prove runtime behavior.
---

# Lazy-Developer Compatibility

Use when behavior depends on Minecraft Bedrock version, Minecraft Education, manifest format, Script API version, experiments, or capability availability.

## Procedure

1. Identify edition and target version explicitly.
2. Prefer current authoritative Creator/Microsoft/Mojang evidence when external truth is required.
3. Represent compatibility as capability/profile truth, not scattered conditionals.
4. Separate stable, preview/beta, experimental, and Education-only capabilities.
5. Preserve unknown/new fields rather than coercing them.
6. Record uncertainty when version evidence is incomplete.
7. Do not broaden supported ranges without compatibility evidence.

Compatibility analysis does not itself prove runtime behavior.


## Lane boundary

During Map Bug Audit, consume current compatibility/Platform Knowledge and report missing/stale capability as `detection-gap`; do not silently edit rules or knowledge.

During Detection Development, compatibility data/rules may be changed only with version-scoped evidence and generalized acceptance.
