# Integrated Analysis

The orchestrator composes domain owners without replacing them.

Current flow:

```text
filesystem inventory
├── manifest analyzer
├── function/command analyzer
├── script analyzer
├── mcstructure adapter + invariant diagnostics
└── world DB presence detection
        ↓
semantic graph
        ↓
cross-domain diagnostics
        ↓
inspection result
```

## Cross-domain diagnostics

Initial integrated rules:

- script imports a @minecraft/* module that the owning manifest does not declare;
- mcstructure cannot be parsed as supported Bedrock little-endian NBT;
- mcstructure block-index layers do not match declared structure volume;
- normal unresolved/ambiguous semantic references remain reported.

The orchestrator does not own these rules; it calls their diagnostic owners.

## World DB

Directory inspection reports whether a db/ payload is present and how many physical files it contains. It does not open LevelDB during generic inspection.

Opening/scanning requires the dedicated LevelDB snapshot adapter because native DB access has stronger filesystem and resource boundaries.

## Target profile

Callers may provide target edition, Education-feature state, EDU level, and experiments. Missing target facts remain unknown rather than defaulting to a compatibility claim.
