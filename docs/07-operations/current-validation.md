# Current Validation

Status: FOUNDATION + FIRST BEDROCK ANALYZERS + TYPED COMMAND EFFECTS

Verified remotely on 2026-09-22:

- artifact/archive safety contracts exist;
- normalized project and semantic graph contracts exist;
- Bedrock content discovery and manifest normalization exist;
- function references populate semantic graph relationships;
- typed command analysis exists for fill, setblock, clone, teleport, scoreboard writes and tag mutations;
- absolute, relative and local coordinates remain distinct;
- `execute ... run` nested commands are recursively analyzed;
- unknown commands are preserved rather than discarded;
- diagnostics have stable typed IDs and source provenance;
- unresolved/ambiguous graph references can become diagnostics;
- duplicate manifest UUID diagnostics exist;
- relative/local region mutation can be surfaced as context-dependent analysis;
- source tests exist for typed effects and diagnostics.

Not yet proven in this execution context:

- dependency installation;
- TypeScript compilation;
- Vitest execution;
- full Bedrock command grammar;
- execution-context resolution for relative/local coordinates;
- actual archive/file transport;
- structure NBT parsing;
- patch transactions;
- world/package roundtrip;
- Minecraft runtime behavior.

Proof level remains source/static inspection only until CI or local execution confirms the code.
