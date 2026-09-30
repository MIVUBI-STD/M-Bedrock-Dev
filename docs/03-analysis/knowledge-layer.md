# Bedrock / Education Platform Knowledge Layer

The analyzer stack has a dedicated machine-readable **Minecraft platform knowledge** authority.

## Ownership

`engine/packages/knowledge` owns platform-knowledge contracts, validation, and effective-profile selection.

`engine/knowledge/*.json` owns descriptive Minecraft facts and provenance only.

It does **not** own Game Design, MIVUBI engineering policy, validation/release contracts, or runtime observations. Those belong to `engine/game-design/`, `engine/contracts/`, and runtime evidence layers.

Analyzers consume platform knowledge rather than duplicating Minecraft semantics internally.

Knowledge can be filtered by edition, Minecraft version, format version, experiments, and Script API module/version.

Every durable platform fact requires provenance and authority/confidence metadata. `project-policy` is forbidden in the platform knowledge directory. UNKNOWN is preferable to invented behavior.
