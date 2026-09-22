# Automatic Map Compatibility Fingerprint

Integrated inspection derives a reliability fingerprint from facts already owned by analyzers.

## Inputs

Current automatic inputs include:

- manifest min-engine versions;
- explicit target edition/experiments when supplied;
- top-level command verbs;
- @minecraft/* modules from manifest and source;
- structure count and parse coverage;
- world DB presence;
- scoreboard/tag state access;
- broad state writes;
- repeated topology candidates;
- Script API event/dynamic-property usage;
- selected diagnostics such as unresolved references or structure parse failures.

## Capability vs risk

Capability tags describe what the map uses.

Examples:

```text
command:execute
command:structure
script-module:@minecraft/server
structure-load
gameplay-state
dynamic-properties
world-db
```

Risk surfaces are intentionally stricter and require specific evidence.

Examples:

```text
script-beta
multiplayer-concurrency   ← currently requires broad state write evidence
repeated-topology
world-db-native
reference-integrity
structure-binary
unknown-command
```

The fingerprint does not infer entity AI, chunk lifecycle, concurrency, or other runtime behavior merely because a map contains entities or many files.

## Identity

Normalized/sorted fingerprint contents produce a deterministic fingerprint identity. Artifact SHA remains a separate field when available.

This lets update/retest planning operate on semantic dependency identity rather than filenames alone.
