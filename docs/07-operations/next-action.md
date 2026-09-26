# Next Action

M-Bedrock-Dev now has five safety foundations:

1. exact runtime-profile + evidence-bounded knowledge;
2. causal proof ladder where observation is not causation;
3. execution/state/temporal Semantic IR feeding probe planning;
4. preservation contracts that gate mutation and release;
5. session-bound target-profile capture/export for the Bedrock runtime harness.

## Current lane — Runtime Laboratory Host Execution

The Runtime Lab control plane and target-profile bridge are now defined. The next work is to execute experiment protocol actions against a real Minecraft session and return validated trial evidence.

### Completed Runtime Lab foundation

- versioned experiment definitions;
- explicit setup/stimulus/observe/teardown protocol action IDs;
- controlled factors;
- control/treatment arms;
- exact target-profile fingerprint;
- fixture fingerprint;
- environment fingerprint;
- deterministic repetition planning;
- definition revision binding;
- trial validation;
- repeatability/intervention qualification;
- experiment evidence provenance;
- explicit knowledge-promotion boundary;
- canonical target-profile fingerprint/export;
- Bedrock harness profile binding through `m-bedrock:target-profile`;
- Bedrock profile announcement parsing without a hard-coded Minecraft version claim.

### Current proof ceiling

Repository CI can verify the Runtime Lab control plane, profile identity semantics, and harness/profile protocol only.

It cannot claim that Minecraft Bedrock, Education, BDS, entities, chunks, or multiplayer behavior has been empirically proven until a real runtime host executes protocol actions and returns validated trials.

Therefore existing runtime coverage states must not be upgraded merely because the laboratory framework or profile bridge exists.

## Next runtime implementation order

1. implement the first executable Bedrock host transport:
   - send target-profile binding;
   - execute protocol action IDs;
   - correlate acknowledgements by experiment/arm/run identity;
   - collect bounded observation windows;
   - fail closed on timeout, malformed output, or profile mismatch;
2. start with low-risk read-only micro-experiments:
   - scheduler callback reachability;
   - event ordering;
   - entity resolvability;
   - chunk loaded-for-script state;
   - scoreboard/tag state visibility;
3. persist exact trial evidence;
4. only then expand to:
   - chunk unload/recovery;
   - entity navigation;
   - restart/persistence;
   - multiplayer concurrency.

## Safety

- configured target identity is not the same as engine-introspected identity;
- one observation is not repeatability;
- repeatability is not automatically causation;
- control/treatment contrast is capped at INTERVENTION_SUPPORTED;
- different environments cannot be compared as one controlled campaign;
- changing experiment definition invalidates old trial identity;
- experiment evidence does not automatically become knowledge.
