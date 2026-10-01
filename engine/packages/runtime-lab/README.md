# Runtime Lab

Controlled runtime experiment contracts and qualification for Minecraft Bedrock / Education.

This package defines experiments, evidence qualification, host capability contracts, and domain-specific experiment families. It does not itself prove Minecraft behavior unless a real compatible runtime host executes the experiment.

## Internal hierarchy

```text
src/
├── core/          shared runtime-lab contracts, validation and revisions
├── host/          Bedrock action/host/profile capability boundaries and multi-client host control
├── experiment/    catalog, planning, qualification, execution and promotion
├── scenario/      scenario requirements, counterexamples and execution gates
├── differential/  cross-version differential planning/execution
├── domains/
│   ├── arena/
│   ├── chunk/
│   ├── entity/
│   ├── multiplayer/
│   ├── persistence/
│   └── scheduler/
└── index.ts       sole cross-owner public entrypoint
```

Tests mirror the same hierarchy under `test/`.

## Boundary

- Domain folders group experiment families; they do not become gameplay semantic owners.
- Actual Minecraft-facing harness implementation belongs under `engine/runtime/`.
- Runtime evidence/decision models consumed outside the lab remain in their canonical packages.
- Cross-owner consumers import through `src/index.ts`.
- Synthetic/fake hosts can validate experiment wiring but never upgrade proof to LOCAL/LIVE Minecraft.
