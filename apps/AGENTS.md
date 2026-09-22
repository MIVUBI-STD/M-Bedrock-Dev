# Apps Agent Rules

Applies to user-facing interfaces under `apps/`.

## Boundary

Apps are thin interaction surfaces over the deterministic core.

## Rules

- Do not reimplement Bedrock parsing, diagnostics, graph traversal, or repair policy.
- Call orchestrator/core owners through typed APIs.
- Presentation-specific formatting stays here.
- Stable semantic truth remains in packages/analyzers/rules.
- A future MCP server, desktop app, or additional CLI must consume the same engine.
- Interface convenience must not weaken source immutability, patch preconditions, or proof vocabulary.

Current app owner: `apps/cli/`.
