# Current Validation

Status: SOURCE-LEVEL END-TO-END REPAIR CONTRACT

Verified remotely on 2026-09-22:

- all prior artifact, graph, analyzer and topology contracts remain present;
- repair transactions can be applied only through a working-root path resolver;
- mutation paths escaping working root or overlapping source root are rejected;
- command replacement requires exact line + expected text;
- ambiguous generic text replacement fails closed;
- writes use temp-file + rename semantics;
- multi-file failure paths restore already-written working files;
- rollback metadata is returned for successful working-copy changes;
- absolute position translation helpers exist;
- a reduced topology-outlier regression fixture exists;
- source tests describe broken-outlier → repaired-match behavior and verify immutable source separation.

Not yet proven in this execution context:

- dependency installation;
- TypeScript compilation;
- Vitest execution;
- filesystem behavior on Windows target machines;
- actual archive extraction/repackaging;
- complete diagnose-to-transaction generation automation;
- real mcworld end-to-end analysis;
- Minecraft runtime behavior.

Proof level remains source/static inspection only until CI or local execution confirms the code.
