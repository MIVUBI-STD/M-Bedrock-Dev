# Integrated Analysis

The orchestrator composes domain owners without replacing them.

Current flow:

```text
filesystem inventory
├── manifest analyzer
├── function/command analyzer
│   ├── state-scope analysis
│   └── spatial topology analysis
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

Initial integrated rules include:

- script imports a @minecraft/* module that the owning manifest does not declare;
- mcstructure cannot be parsed as supported Bedrock little-endian NBT;
- mcstructure block-index layers do not match declared structure volume;
- broad scoreboard/tag writes use @a or @e;
- strongly repeated linear spatial effects contain a single coordinate outlier;
- normal unresolved/ambiguous semantic references remain reported.

The orchestrator does not own parser semantics. It calls the owning analyzers and diagnostic functions.

## Topology safety

Topology inference is deliberately conservative. Repeated non-linear layouts are retained as candidates but are not auto-labelled as outliers.

## World DB

Directory inspection reports whether a db/ payload is present and how many physical files it contains. It does not open LevelDB during generic inspection.
