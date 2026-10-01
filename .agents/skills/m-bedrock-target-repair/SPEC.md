# Target Repair Specification

## Intent
Apply the smallest preconditioned mutation to a target working copy after grounded diagnosis or explicit modification request.

## In scope
- patch transaction;
- rollback/preconditions;
- affected semantic rebuild;
- source/package verification;
- explicit runtime residue.

## Out of scope
- mutating original artifacts;
- detector development;
- unrelated cleanup.

## Acceptance
- exact target owner is known;
- patch has stale-state protection;
- original artifact remains immutable;
- affected verification is rerun;
- runtime proof is not overstated.
