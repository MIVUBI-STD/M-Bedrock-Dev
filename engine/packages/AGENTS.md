# Packages Agent Rules

Applies to reusable deterministic engine modules under `engine/packages/`.

## Boundary

Packages own stable reusable behavior. They must not depend on CLI presentation, future MCP protocol shape, desktop UI, or repository orchestration policy unless the package itself is the canonical owner for that policy.

## Rules

- Keep one semantic owner per package.
- Prefer pure/domain functions and explicit inputs over mutable process-wide state.
- Package APIs expose typed domain contracts, not UI-shaped payloads.
- Do not import from `apps/`.
- Do not duplicate analyzer semantics inside packages that merely consume analyzer output.
- Cross-package dependency must follow `docs/system/architecture.md` and `docs/system/implementation-map.md`.
- Derived caches remain rebuildable and never become source authority.
- Security/trust-boundary code fails closed.
- `task-graph` may route existing owners but must not become a second semantic, diagnosis, repair, validation, cache-authority, or evidence owner.
- `orchestrator` composes owners; it must not absorb reusable domain semantics merely because a workflow needs them.

## Package classification authority

`engine/packages/ownership.json` is the machine-readable authority for package-group membership.

Its current groups are:

```text
foundation
understanding
diagnosis
repair
validation-reliability
orchestration
design-authority
```

Do not duplicate the complete package inventory in this instruction file. The nearest package `README.md` or package-local `AGENTS.md` owns package-specific boundary details.

When a package starts accumulating a second unrelated responsibility, move that responsibility to its actual canonical owner instead of growing a generic manager layer.
