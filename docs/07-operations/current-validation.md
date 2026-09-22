# Current Validation

Status: FOUNDATION + FIRST BEDROCK ANALYZERS

Verified remotely on 2026-09-22:

- artifact/archive safety contracts exist;
- normalized project and semantic graph contracts exist;
- cheap path-based content classification exists;
- pack candidate discovery from manifest paths exists;
- manifest normalization preserves raw data and recognizes module categories;
- `.mcfunction` parsing extracts direct function calls, structure loads, scoreboard reads/writes and tag mutations with line evidence;
- identifier resolution preserves resolved/unresolved/ambiguous states;
- function-derived references can populate typed semantic graph edges;
- source tests exist for manifest analysis, function parsing and reference resolution.

The manifest model follows current Creator documentation where module types distinguish data, resources and script content, while the parser remains conservative for unknown future values.

Not yet proven in this execution context:

- dependency installation;
- TypeScript compilation;
- Vitest execution;
- ZIP transport/extraction;
- actual filesystem inventory generation;
- complete command grammar;
- full pack dependency resolution;
- structure NBT parsing;
- world/package roundtrip;
- Minecraft runtime behavior.

Proof level remains source/static inspection only until CI or local execution confirms the code.
