# Semantic Authority Model

## Current gameplay authority

For a normal map audit:

```text
Selected Map Version
= one current gameplay evidence universe
```

Inside that artifact:

```text
explicit authored gameplay signals
→ Gameplay Contract / expected behavior

executable source + artifact state + runtime observation
→ Actual Behavior

Expected ≠ Actual
→ diagnosis
```

## Not current authority

These are archive/reference only:

- older map versions;
- Development/Source;
- old Bug Reports / QA;
- Technical Docs;
- changelogs;
- other maps;
- external design/reference documents.

They may be used only for an explicitly requested comparison/history task.

## Hard rules

- never mix evidence from different map versions in one current audit;
- do not use stale documents to fill missing gameplay intent;
- missing intent stays unknown;
- runtime observation does not redefine expected behavior;
- external Minecraft knowledge may explain engine capability, but not map-specific gameplay intent;
- canonical terminology is defined in `canonical-naming.md`.

## Platform knowledge authority

Machine-readable Minecraft platform/runtime facts are owned by the engine knowledge layer.

```text
engine/packages/knowledge
→ knowledge contracts, validation, effective-profile selection

engine/knowledge/
→ descriptive platform facts + provenance
```

Platform knowledge does not own Game Design, project engineering policy, current runtime observations, or validation/release state.

Durable platform facts require provenance and bounded applicability such as edition, Minecraft version, format version, experiment state, or Script API module/version.

Analyzers consume knowledge rather than duplicating platform semantics. UNKNOWN is preferable to inventing unsupported behavior.
