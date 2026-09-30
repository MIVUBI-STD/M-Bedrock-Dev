# Minecraft Runtime Laboratory

This directory is the runtime-facing execution boundary for controlled Minecraft experiments.

The deterministic contracts live in:

```text
packages/runtime-lab/
```

The runtime directory owns host-specific fixtures, adapters, and experiment assets that execute those contracts in Minecraft.

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

## Target-profile binding

The Bedrock reliability harness does not claim a Minecraft version, edition, or host from a hard-coded default.

Each trial binds a schema-version 2 runtime profile with a correlation identity:

```json
{
  "schemaVersion": 1,
  "bindingId": "<experiment:arm:run:profile>",
  "profile": { "...": "MinecraftRuntimeProfile v2" }
}
```

through:

```text
m-bedrock:target-profile
```

The harness acknowledges with:

```text
[M-BEDROCK-PROFILE]{...}
```

The host accepts only the matching `bindingId`, validates the returned profile, and compares its canonical fingerprint with the experiment target.

Volatile player count is excluded from target identity so player joins/leaves cannot silently change the target fingerprint.

This proves profile/session binding. It does not independently prove that every declared profile field is engine-introspected.

## First Bedrock host executor

`createBedrockHarnessExperimentHost()` implements the Runtime Lab host contract over a `BedrockHarnessChannel`.

The channel owns only physical I/O:

```text
sendScriptEvent(id, payload)
waitForLine(prefix, correlation, timeout)
```

The host owns experiment semantics and currently accepts read-only, observe-only steps:

- `probe.chunk-loaded`;
- `probe.entity-resolvable`;
- `probe.tag-present`;
- `probe.scoreboard-value`.

Factor values may be referenced as `$factor.<id>` in protocol parameters. Request IDs include experiment, arm, run, and step identities.

Unknown probe results fail closed as unknown evidence. They are not converted into absent evidence.

## Current proof ceiling

Repository/CI can prove:

- experiment schema and qualification logic;
- target-profile capture/fingerprint semantics;
- per-trial profile correlation;
- deterministic protocol-to-probe translation;
- runtime exchange validation;
- host refusal on profile drift or unsupported mutation.

Repository/CI still cannot prove Minecraft runtime behavior by itself.

A real client/BDS/Education channel must execute these messages and return actual runtime output before evidence can be called LOCAL GAME VERIFIED or LIVE GAME VERIFIED.
