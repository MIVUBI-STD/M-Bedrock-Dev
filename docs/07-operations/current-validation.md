# Current Validation

Status: SOURCE VERIFICATION GREEN; PRODUCTION MAP EVIDENCE PENDING

Latest source-bearing verification on 2026-09-23:

- commit `37245a16d8cee5aa5053bbad8875420063a10e5f` completed the full Verify workflow successfully;
- repository policy and source-boundary verification passed;
- TypeScript `tsc --noEmit` passed;
- the full Vitest suite passed.

Recently proven source capabilities include:

- event/method/property/enum Script API intelligence;
- deprecated/removed lifecycle diagnostics;
- call-shape/signature migration diagnostics;
- method result-use classification;
- version-aware optional return-contract analysis;
- lifecycle/call-shape/result-use distributions in real-map usage inventory;
- Script API ↔ Minecraft update correlation;
- analyzer-independent compatibility contracts.

Current source proof:

```text
repository policy   VERIFIED
source boundaries   VERIFIED
typecheck           VERIFIED
Vitest              VERIFIED
source-bearing head 37245a16d8cee5aa5053bbad8875420063a10e5f
```

Still not proven:

- guarded downstream optional-result flow;
- deep options-object field migrations;
- type-only symbol lifecycle coverage;
- representative production-map return-contract exposure;
- genuine Minecraft-loadable mcworld acceptance;
- production-map diagnosis quality;
- local Minecraft runtime behavior;
- live multiplayer/runtime behavior.

These remain separate static-analysis, production-artifact, LOCAL GAME, and LIVE GAME proof lanes.
