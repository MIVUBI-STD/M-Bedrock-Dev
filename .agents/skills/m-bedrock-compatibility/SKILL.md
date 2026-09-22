# M-Bedrock Compatibility

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
