---
name: m-bedrock-target-repair
description: >
  Repair or intentionally modify a target map/source working copy after grounded diagnosis. Use for target mutation; not detector development.
---

# M-Bedrock Target Repair

**Lane:** OPERATIONAL / TARGET REPAIR

## Purpose

Mutate only the target working copy after an evidence-backed defect or explicit modification request.

## Entry criteria

Require grounded diagnosis or explicit intentional modification.

## Allowed actions

- identify smallest target owner/scope;
- create preconditioned patch transaction;
- mutate working copy only;
- preserve rollback state;
- reparse/rebuild affected semantic branches;
- rerun the check that justified the repair.

## Forbidden actions

- mutate original source;
- improve detection capability;
- use successful mutation as proof diagnosis was correct;
- widen into unrelated cleanup.

## Workflow

Grounded defect/intent → smallest target owner → patch transaction → preconditions → atomic working-copy mutation → affected verification → runtime residue.

## Output contract

Validate against ../../schemas/target-repair-output.schema.json.

Run: node scripts/validate-output.mjs repair.json

## Handoff

Detection weakness discovered during repair → separate m-bedrock-detection-development handoff.

## Reference routing

Use repository repair semantics and ../../references/evidence-cost-ladder.md only as needed.

## STOP

Stop on stale fingerprint, ambiguous match, workspace escape, unresolved semantic target, or after requested repair + matching verification completes.
