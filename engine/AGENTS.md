# Engine Agent Rules

Applies to the canonical Bedrock / Education engine under `engine/`.

## Route first

Choose the smallest owning domain before reading implementation:

```text
external/binary/container format translation → adapters/
semantic/source analysis                      → analyzers/
reusable contracts and orchestration          → packages/
versioned capability rules                    → rules/
structural schemas                            → schemas/
Game Design schema/compiler                  → design/
engineering/validation constraints             → contracts/
machine-readable Minecraft platform facts      → knowledge/
regression/update/history evidence             → reliability/
runtime proof harnesses                        → runtime/
reduced regression evidence                    → fixtures/
```

Use `docs/system/implementation-map.md` when ownership is unclear. Do not broad-scan the whole engine when a canonical owner is already known.

## Boundaries

- `adapters/` translates physical representations; it does not diagnose gameplay.
- `analyzers/` derives evidence and diagnostics without mutating artifacts.
- `packages/` owns reusable contracts, repair behavior, orchestration, and stable engine APIs.
- `packages/orchestrator` is the only normal cross-analyzer composition boundary.
- `design/` owns schema/compiler only; actual intended gameplay authority is project-local under `workspace/projects/<project-id>/design/`.
- `contracts/` owns engineering/validation constraints and must not be promoted into map design.
- `rules/` and `knowledge/` provide versioned platform decisions/facts; they do not become runtime proof by themselves.
- `runtime/` captures bounded runtime evidence; production source must not depend on test harness state.
- `fixtures/` protects durable regressions and must never become semantic authority.
- `experiments/` is outside the engine and may not be imported by production engine code.

## Change discipline

- Fix the first wrong canonical owner.
- Preserve one concept = one owner = one current name.
- Prefer extending an existing semantic owner over creating generic managers, helpers, registries, or alternate pipelines.
- Keep unknown Bedrock data explicit and lossless where required.
- Keep source/static, package, and runtime proof levels distinct.
- Maintain logical owner names (`packages/*`, `analyzers/*`, `adapters/*`) in architecture reports even though physical paths live under `engine/`.
