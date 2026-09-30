# Engine

Canonical deterministic Minecraft Bedrock / Education analysis and repair engine.

```text
engine/
├── adapters/      file/container/native format adapters
├── analyzers/     read-only semantic derivation and diagnostics
├── fixtures/      minimized reproducible evidence
├── knowledge/     machine-readable domain facts and project policy
├── packages/      reusable engine and orchestration modules
├── reliability/   regression/update/history catalogs
├── rules/         versioned capability rules
├── runtime/       bounded runtime proof harnesses
└── schemas/       structural/internal schemas
```

## Boundary

- `apps/` consumes the engine through stable package APIs.
- `tooling/` verifies and operates the repository; it does not own Bedrock semantics.
- `engine/adapters` translates physical formats.
- `engine/analyzers` derives facts without mutation.
- `engine/packages/orchestrator` is the cross-owner composition boundary.
- Research under `experiments/` is non-authoritative and must not become a production dependency.

Logical owner names remain `packages/*`, `analyzers/*`, and `adapters/*` in dependency/audit reports even though their physical paths are namespaced under `engine/`.
