# Packages Agent Rules

Applies to reusable deterministic engine modules under packages/.

## Boundary

Packages own stable reusable behavior. They must not depend on CLI presentation, future MCP protocol shape, desktop UI, or repository orchestration policy unless the package itself is the canonical orchestrator owner.

## Rules

- Keep one semantic owner per package.
- Prefer pure/domain functions and explicit inputs over mutable process-wide state.
- Package APIs expose typed domain contracts, not UI-shaped payloads.
- Do not import from apps/.
- Do not duplicate analyzer semantics inside packages that merely consume analyzer output.
- Cross-package dependency must follow docs/06-system/architecture.md and implementation-map.md.
- Derived caches remain rebuildable and never become source authority.
- Security/trust-boundary code fails closed.

## Package ownership

```text
common         → dependency-neutral shared primitives only
artifact       → identity / fingerprint / source classification
archive        → archive policy / inventory / extraction / packaging transport
project-model  → normalized project/workspace/session/file inventory + telemetry data contracts
telemetry      → runtime telemetry emission helpers / sinks / instrumentation guards
graph          → semantic graph / edges / invalidation
diagnostics    → diagnostic contract and stable identifiers
validation     → post-mutation validation contracts/results
reliability    → invariants / regression metadata / map fingerprints / update deltas / retest planning
compatibility  → edition/version/capability evaluation
runtime-profile → exact target Minecraft product/host/module/environment identity
knowledge       → versioned evidence-backed Minecraft claims and applicability
repair         → patch transactions / preconditions / working-copy mutation
orchestrator   → composition only; no duplicated parser/repair semantics
```

When a package starts accumulating a second unrelated responsibility, move the responsibility to its actual canonical owner instead of growing a generic manager layer.
