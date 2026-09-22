# Minecraft Update Intelligence

Update knowledge is split into two layers.

## Evidence layer

Curated evidence records:

- source title and URL;
- source authority: official, curated, or observed;
- target Minecraft version;
- semantic domain;
- capability tags;
- affected identifiers;
- change kind;
- confidence.

Evidence is not itself a retest decision.

## Normalized delta

```text
Curated Update Evidence
→ normalizeUpdateEvidence()
→ MinecraftUpdateDelta
→ Retest Planner
```

The normalized delta deliberately keeps only the information needed for reliability planning.

## Provenance

Official Microsoft Creator update notes are preferred for documented platform changes. Observed runtime differential evidence can also create update entries, but must use confidence `observed`.

Inferred entries are allowed only when clearly marked `inferred`; they should not silently become documented facts.

## Seed: 1.26.40

The repository includes a curated 1.26.40 delta covering high-value reliability surfaces such as:

- stricter entity JSON/AI-goal validation;
- corrected entity on_kill behavior;
- clone/fill command behavior changes;
- structure-saved block tick behavior;
- @minecraft/server 2.9.0;
- NBT nesting limits.

The catalog is intentionally selective rather than a verbatim copy of the release notes.
