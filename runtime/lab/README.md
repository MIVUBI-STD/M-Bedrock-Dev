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

## Target-profile binding

The Bedrock reliability harness does not claim a Minecraft version, edition, or host from a hard-coded default.

A controller must explicitly bind a schema-version 2 runtime profile to the active script session with:

```text
/scriptevent m-bedrock:target-profile <runtime-profile-json>
```

The harness then emits:

```text
[M-BEDROCK-PROFILE]{...}
```

The repository adapter validates the profile and computes the stable target-profile fingerprint. Volatile player count is excluded from target identity so joining/leaving players cannot silently change the experiment target.

This binding proves that the declared profile was attached to the active runtime session. It does not independently prove that every operator-supplied field is engine-introspected.

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
- evidence provenance semantics;
- target-profile capture/export and Bedrock profile-log parsing.

It does **not** prove that any experiment has run successfully inside Minecraft.

Until target-runtime trial evidence exists, runtime reliability coverage remains unknown/partial exactly as declared elsewhere.
