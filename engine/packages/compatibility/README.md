# Compatibility

Central authority for Minecraft Bedrock / Minecraft Education capability evaluation.

This package owns:

- normalized game-version values;
- edition-aware capability queries;
- stable/preview/beta/experimental track distinction;
- experiment-gated capability evaluation;
- Script API dependency track classification.

It does **not** hardcode a large historical compatibility database. Versioned rule data belongs in `rules/` with provenance and explicit applicability.

Analyzers and validators should ask this owner instead of scattering version/edition conditionals.
