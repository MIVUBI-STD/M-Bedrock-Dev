# Current Validation

Status: FOUNDATION + ARTIFACT/ARCHIVE + PROJECT GRAPH CONTRACT

Verified remotely on 2026-09-22:

- repository and branch authority exist;
- artifact identity/fingerprint contracts exist;
- archive path and resource-budget safety contracts exist;
- source/working/output workspace boundaries exist;
- normalized project model separates file inventory from semantic components;
- semantic component identity helpers exist;
- `SourceRef` supports artifact/path/range/JSON Pointer evidence;
- semantic graph supports typed nodes and edges;
- resolved, unresolved and ambiguous reference states are represented;
- graph maintains outgoing, incoming and kind indexes;
- dependency/dependent queries and reverse impact tracing exist;
- change-scoped invalidation contract exists;
- focused Vitest source tests cover graph resolution and invalidation behavior.

Not yet proven in this execution context:

- dependency installation;
- TypeScript compilation;
- Vitest execution;
- ZIP transport/extraction;
- Bedrock-specific parser behavior;
- serialized index persistence;
- world/package roundtrip;
- Minecraft runtime behavior.

Proof level remains source/static inspection only until CI or local execution confirms the code.
