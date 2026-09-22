# Patch Transactions

Repair must be explicit and fail closed.

A PatchTransaction contains:

- source artifact fingerprint;
- typed operations;
- preconditions;
- affected paths;
- validation steps.

Initial operations are intentionally narrow: replace text and replace command. Coordinate-aware mutation can be added once source rewriting semantics are proven.

## Preconditions

Before mutation, the transaction may require:

- exact source artifact fingerprint;
- exact current source text.

A mismatch returns precondition failure rather than attempting a best-effort patch.

## Validation

A transaction declares post-mutation validation such as:

- reparse;
- rebuild graph;
- rerun diagnostic;
- topology comparison.

The transaction model does not itself claim Minecraft runtime success.
