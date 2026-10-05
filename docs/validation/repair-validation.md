# Repair Validation

Filesystem mutation success is not repair acceptance.

A repair is accepted only when every declared validation step passes against the working copy.

## Current executable steps

### reparse

Reparse the exact affected source using its canonical analyzer.

Initial support: mcfunction.

### rebuild-graph

Run integrated inspection on the working copy, rebuilding semantic graph and diagnostics.

### rerun-diagnostic

Require a specified diagnostic code to be absent, optionally scoped to an exact source path and line.

### topology-compare

Recompute topology from the affected function set and require the target source location to no longer be a linear topology outlier.

## Result

```text
TransactionValidationResult
├── ok
└── steps[]
    ├── step
    ├── ok
    └── message
```

Any failed step rejects the repair.

Validation does not mutate source or working content.
