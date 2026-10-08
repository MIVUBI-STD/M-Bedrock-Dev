# Platform Knowledge Package Rules

Own canonical Minecraft Bedrock/Education **platform knowledge package behavior**: typed claims, catalog loading, provenance/applicability, and freshness handling.

- Knowledge is descriptive evidence-backed data, not map design.
- Every durable fact requires provenance.
- Version/profile applicability must be explicit.
- UNKNOWN is preferable to invented semantics.
- Analyzers may consume knowledge; knowledge must not import analyzers.
- Project engineering policy belongs under `engine/contracts/`.
- The Design System belongs under `engine/design/`; map-specific Game Design belongs under `workspace/projects/<project-id>/design/`.
- Observed runtime behavior is evidence, never automatically promoted to documented truth.

Raw/versioned platform fact data is owned by `engine/knowledge/`; this package owns reusable typed loading and applicability semantics.
