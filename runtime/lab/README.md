# Minecraft Runtime Laboratory

This directory is the runtime-facing execution boundary for controlled Minecraft experiments.

The deterministic contracts live in:

```text
packages/runtime-lab/
```

The runtime directory owns host-specific fixtures, adapters, and experiment assets that eventually execute those contracts in Minecraft.

## Safety model

A runtime experiment is not a knowledge fact.

The evidence ladder is:

```text
experiment definition
→ exact target profile
→ exact fixture
→ exact definition revision
→ repeated control/treatment trials
→ observed predicate evidence
→ repeatability qualification
→ intervention-supported evidence
→ explicit knowledge promotion
```

A single trial cannot be promoted as repeatable knowledge.

A control/treatment campaign cannot be called intervention-supported when:

- the experiment definition changed between trials;
- target profile or fixture differs;
- environment fingerprints differ;
- arm/run identities are duplicated;
- outcome evidence is unknown;
- minimum repetitions were not completed;
- control and treatment do not differ on a declared factor.

## Runtime host boundary

`RuntimeExperimentHost` is an adapter boundary.

Future hosts may include:

- Minecraft Bedrock local client;
- Minecraft Education local host;
- Bedrock Dedicated Server;
- controlled multi-client runners.

The host executes protocol action IDs and returns trial evidence. The core lab validates the returned identity and evidence instead of trusting the host blindly.

## Current proof ceiling

Repository/CI work proves only:

- experiment schema;
- deterministic planning;
- revision binding;
- trial validation;
- qualification logic;
- evidence provenance semantics.

It does **not** prove that any experiment has run successfully inside Minecraft.

Until target-runtime trial evidence exists, runtime reliability coverage remains unknown/partial exactly as declared elsewhere.
