# Current Validation

Status: SOURCE VERIFICATION GREEN; PRODUCTION MAP EVIDENCE PENDING

Latest source-bearing verification on 2026-09-23:

- commit `f0adbcd603c25d41c19f0f6deb7a0c8c2410bb74` completed the full Verify workflow successfully;
- Repository Policy completed successfully for the same head;
- TypeScript `tsc --noEmit` passed;
- the full Vitest suite passed.

Recently proven source capabilities include:

- event/method/property/enum Script API symbol extraction;
- bounded receiver and property inference;
- named-import enum alias normalization;
- deprecated/removed lifecycle diagnostics across all four observable symbol kinds;
- lifecycle-aware real-map usage inventory;
- Script API ↔ Minecraft update correlation;
- reliability risk surfaces for deprecated/removed API exposure;
- event-container/property ownership deduplication.

Current source proof:

```text
repository policy  VERIFIED
typecheck          VERIFIED
Vitest             VERIFIED
source-bearing head f0adbcd603c25d41c19f0f6deb7a0c8c2410bb74
```

Documentation-only commits after the source-bearing head are verified by CI independently rather than embedding their own SHA here, avoiding self-referential documentation commit churn.

Still not proven:

- signature/argument/return-shape migration coverage;
- type-only symbol lifecycle coverage;
- namespace-import/dynamic-member lifecycle coverage;
- representative production-map property/enum exposure;
- genuine Minecraft-loadable mcworld acceptance;
- production-map diagnosis quality;
- local Minecraft runtime behavior;
- live multiplayer/runtime behavior.

These remain separate static-analysis, production-artifact, LOCAL GAME, and LIVE GAME proof lanes.
