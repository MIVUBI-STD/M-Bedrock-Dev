# M-Bedrock-Dev

M-Bedrock-Dev is a Minecraft Bedrock and Minecraft Education content-engineering workspace for inspecting, diagnosing, repairing, modifying, validating, and repackaging worlds, packs, add-ons, structures, and related content.

## Branch model

```text
Local  → active development / working authority
main   → stable / release authority
```

Routine development happens on `Local`. Promotion to `main` is explicit.

## Product flow

```text
Artifact
→ safe ingest
→ discovery + normalization
→ semantic index / dependency graph
→ diagnostics
→ patch plan
→ transactional mutation
→ validation
→ regression check
→ repackage
→ evidence report
```

## Scope

Primary targets:

- `.mcworld`, `.mcpack`, `.mcaddon`, `.mcstructure`
- Behavior Packs and Resource Packs
- functions, commands, entities, blocks, items, manifests and references
- Script API content
- world metadata and world-level content where supported
- multiplayer / multi-arena content systems
- Minecraft Bedrock and Minecraft Education compatibility analysis

M-Bedrock-Dev is not an AI-only mutation layer. Core parsing, analysis, mutation and validation must remain deterministic and reusable by CLI, CI, future MCP adapters and other front ends.

## Documentation

Start at `docs/README.md`.

Stable project facts live in `CONTEXT.md`. Agent/work routing lives in `AGENTS.md`. GitHub execution rules live in `GITHUB_RULES.md`.
