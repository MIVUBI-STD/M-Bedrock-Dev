# Runtime Agent Rules

Applies to bounded proof infrastructure under `engine/runtime/`.

- `bedrock-reliability-harness/` owns reusable in-game reliability probes/control.
- `lab/` owns controlled experiment/runtime-laboratory support.
- Runtime harnesses prove observed behavior only for their declared target/runtime conditions.
- Production engine semantics must not depend on harness state or test-only commands.
- Keep probes deterministic, bounded, removable, and evidence-oriented.
