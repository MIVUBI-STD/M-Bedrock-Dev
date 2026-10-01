# M-Bedrock Target Repair

**Lane:** OPERATIONAL / TARGET REPAIR

## Purpose

Change the target map/source working copy after an evidence-backed defect or explicit intentional modification.

This lane repairs the target. It does not improve M-Bedrock-Dev detection capability.

## Entry criteria

Require either:

- reproduced / sufficiently grounded defect; or
- explicit intentional modification request.

## Allowed actions

- identify smallest target owner and affected scope;
- create explicit patch transaction;
- mutate working copy only;
- enforce fingerprint/text/semantic preconditions;
- preserve rollback state;
- reparse/rebuild affected semantic branches;
- rerun the diagnostic/check that justified repair.

## Forbidden actions

- mutate original source artifact;
- improve analyzers/knowledge/rules/proof harness;
- use repair as proof that diagnosis was correct;
- widen scope into unrelated cleanup.

## Output contract

```text
Target Repair
Defect/intent reference
Target owner
Patch transaction
Preconditions
Changed semantic surface
Static/package verification
Runtime residue
```

## Handoff

Detection capability gaps go to `m-bedrock-detection-development` as a separate lane.

## STOP

Stop on stale fingerprint, ambiguous match, workspace escape, unresolved coordinate context, uncertain semantic target, or after requested repair + matching verification is complete.
