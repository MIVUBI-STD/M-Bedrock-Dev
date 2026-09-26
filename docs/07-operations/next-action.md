# Next Action

M-Bedrock-Dev now has four safety foundations:

1. exact runtime-profile + evidence-bounded knowledge;
2. causal proof ladder where observation is not causation;
3. execution/state/temporal Semantic IR feeding probe planning;
4. preservation contracts that gate mutation and release.

## Current lane — Runtime Laboratory

The next work is to make Minecraft runtime truth reproducible rather than anecdotal.

### Runtime Lab foundation

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
- explicit knowledge-promotion boundary.

### Current proof ceiling

Repository CI can verify the Runtime Lab control plane only.

It cannot claim that Minecraft Bedrock, Education, BDS, entities, chunks, or multiplayer behavior has been empirically proven until an actual runtime host returns validated trials.

Therefore existing runtime coverage states must not be upgraded merely because the laboratory framework exists.

## Next runtime implementation order

1. build a target-profile capture/export path;
2. implement the first real host adapter;
3. start with low-risk read-only micro-experiments:
   - scheduler callback reachability;
   - event ordering;
   - entity resolvability;
   - chunk loaded-for-script state;
   - scoreboard/tag state visibility;
4. persist exact trial evidence;
5. only then expand to:
   - chunk unload/recovery;
   - entity navigation;
   - restart/persistence;
   - multiplayer concurrency.

## Safety

- one observation is not repeatability;
- repeatability is not automatically causation;
- control/treatment contrast is capped at INTERVENTION_SUPPORTED;
- different environments cannot be compared as one controlled campaign;
- changing experiment definition invalidates old trial identity;
- experiment evidence does not automatically become knowledge.
