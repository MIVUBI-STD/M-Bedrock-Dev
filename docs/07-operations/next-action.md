# Next Action

M-Bedrock-Dev now has five safety foundations:

1. exact runtime-profile + evidence-bounded knowledge;
2. causal proof ladder where observation is not causation;
3. execution/state/temporal Semantic IR feeding probe planning;
4. preservation contracts that gate mutation and release;
5. session-bound target-profile capture plus a read-only Bedrock Runtime Lab host executor.

## Current lane — First Live Micro-Experiments

The Runtime Lab can now translate observe-only protocol steps into the existing Bedrock probe harness while preserving exact experiment/arm/run correlation.

### Completed Runtime Lab host path

- canonical target-profile fingerprint/export;
- explicit profile binding with per-trial `bindingId`;
- profile acknowledgement validation before a probe may run;
- environment fingerprint binding;
- deterministic request IDs per experiment/arm/run/step;
- factor substitution through `$factor.<id>`;
- supported read-only probe actions:
  - `probe.chunk-loaded`;
  - `probe.entity-resolvable`;
  - `probe.tag-present`;
  - `probe.scoreboard-value`;
- runtime probe exchange validation against request identity;
- fail-closed profile drift handling;
- fail-closed unknown probe results;
- no guarded/mutating protocol execution yet.

### Current proof ceiling

Repository CI can verify the host state machine, protocol translation, profile correlation, and probe exchange validation with deterministic fake channels.

It still cannot claim a real Minecraft experiment has executed until a LOCAL_MINECRAFT/LIVE_MINECRAFT channel is connected to an actual client/BDS/Education session and returns runtime output.

## Next runtime implementation order

1. bind a physical runtime channel:
   - Bedrock client content-log/script-event bridge;
   - BDS stdin/stdout bridge where supported;
   - explicit Education host path rather than assuming Bedrock parity;
2. register the first real read-only experiment definitions:
   - scheduler callback reachability;
   - entity resolvability;
   - chunk loaded-for-script state;
   - scoreboard/tag state visibility;
3. run repeated campaigns and persist exact trial evidence;
4. add event-ordering instrumentation that cannot be represented by a single state probe;
5. only then expand to:
   - chunk unload/recovery;
   - entity navigation;
   - restart/persistence;
   - multiplayer concurrency;
   - guarded/mutating experiments.

## Safety

- configured target identity is not the same as engine-introspected identity;
- a fake/in-memory channel proves adapter logic, not Minecraft behavior;
- one observation is not repeatability;
- repeatability is not automatically causation;
- control/treatment contrast is capped at INTERVENTION_SUPPORTED;
- different environments cannot be compared as one controlled campaign;
- changing experiment definition invalidates old trial identity;
- experiment evidence does not automatically become knowledge.
