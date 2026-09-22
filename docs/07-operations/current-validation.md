# Current Validation

Status: FOUNDATION + ANALYZERS + DERIVED TOPOLOGY CONTRACT

Verified remotely on 2026-09-22:

- artifact/archive safety contracts exist;
- normalized project and semantic graph contracts exist;
- Bedrock discovery, manifest and function analyzers exist;
- typed command effects exist;
- coordinate values preserve absolute/relative/local semantics;
- relative coordinates can be resolved only from explicit origin context;
- local coordinates require an explicit local basis and otherwise remain unresolved;
- typed effects can be converted to resolved world-space effects when context is sufficient;
- translated equivalent effects can be detected using translation-invariant signatures;
- selector/state scope classification exists;
- broad scoreboard/tag state writes can be surfaced as cross-scope risks;
- topology remains derived and does not introduce arena as a core semantic primitive;
- focused source tests exist for coordinate resolution, repeated translations and selector scope.

Not yet proven in this execution context:

- dependency installation;
- TypeScript compilation;
- Vitest execution;
- automatic extraction of execution origins from Bedrock command context;
- robust grouping of multiple effects into arena/topology candidates;
- actual archive/file transport;
- structure NBT parsing;
- patch transactions;
- Minecraft runtime behavior.

Proof level remains source/static inspection only until CI or local execution confirms the code.
