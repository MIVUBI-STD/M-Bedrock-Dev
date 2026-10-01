# Reliability

Reusable reliability models, runtime evidence normalization, regression planning, and update/retest contracts.

This package does not own Minecraft parsing or search strategy. It consumes supported facts/evidence and exposes deterministic reliability decisions through one public package entrypoint.

## Internal hierarchy

```text
src/
├── core/        invariants, fingerprints, coverage, shared reliability types
├── runtime/     runtime observation/control normalization, Bedrock adapters, replay/divergence
├── catalog/     catalog loading/writing contracts
├── regression/  regression corpus, execution, live scenarios, retest planning
├── session/     session model, generators, invariants, multiplayer stress contracts
├── portfolio/   cross-map regression scheduling/planning
├── update/      Minecraft/update delta and evidence contracts
└── index.ts     sole cross-owner public entrypoint
```

Tests mirror the same hierarchy under `test/`.

These are internal navigation groups, not independent semantic owners.

## Core relation

```text
Map Compatibility Fingerprint
× Update Delta
× Historical Regressions
× Coverage Gaps
= Risk-based Retest Plan
```

## Boundary

- Reliability models evidence and retest/release implications; it does not discover bugs by unbounded search.
- Search/interleaving/minimization strategy belongs to `packages/reliability-search/`.
- Durable catalog/history data belongs to `engine/reliability/`.
- Minecraft-facing controlled experiments belong to `packages/runtime-lab/` and `engine/runtime/`.
- Cross-owner consumers import through `src/index.ts`.
- Priority is rule-derived evidence triage, not a quality score.
