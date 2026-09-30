# Engine

Canonical deterministic Minecraft Bedrock / Education analysis and repair engine.

## Architecture hierarchy

```text
engine/
├─ core
│  └─ packages/        reusable contracts, reasoning, repair, orchestration
├─ analysis
│  ├─ adapters/        physical/native format translation
│  └─ analyzers/       read-only semantic derivation
├─ design-authority
│  └─ game-design/     explicit map/mode intended gameplay
├─ policy-data
│  ├─ knowledge/       descriptive Minecraft platform facts
│  ├─ rules/           executable version/capability rules
│  └─ schemas/         persisted/internal structural schemas
├─ engineering-governance
│  └─ contracts/       implementation + validation contracts
├─ quality
│  ├─ fixtures/        minimized reproducible evidence
│  └─ reliability/     regressions, coverage, update/history intelligence
└─ runtime-proof
   └─ runtime/         bounded runtime harnesses and controlled labs
```

The hierarchy is logical rather than artificial filesystem nesting. Physical paths stay short and stable; `ownership.json` makes the grouping explicit and repository verification prevents uncategorized domains.

## Engine routing

```text
external bytes / native storage
→ adapters
→ analyzers
→ packages: understanding/diagnosis
→ packages: repair
→ packages: validation/reliability
→ orchestrator
```

Policy/data owners inform the pipeline without becoming runtime proof:

```text
game-design + knowledge + rules + contracts + schemas
        ↓
analysis / compatibility / diagnosis
```

Runtime proof and quality evidence remain separate from semantic authority:

```text
fixtures + reliability + runtime
→ evidence / regression / falsification
→ never implicit source-of-truth promotion
```

## Boundary

- `apps/` consumes stable engine package APIs.
- `tooling/` verifies and operates the repository; it does not own Minecraft semantics.
- `engine/adapters` translates representations.
- `engine/analyzers` derives evidence without mutation.
- `engine/packages/orchestrator` is the normal cross-owner composition boundary.
- `engine/game-design` owns intended gameplay; `engine/knowledge` owns platform facts; `engine/contracts` owns engineering constraints; `rules` and `schemas` remain executable policy/structure owners.
- `engine/fixtures` and `reliability` protect quality but do not define gameplay semantics.
- `engine/runtime` provides bounded runtime proof.
- Research under `experiments/` is non-authoritative and must not become a production dependency.

Logical owner names remain `packages/*`, `analyzers/*`, and `adapters/*` in dependency/audit reports even though their physical paths are namespaced under `engine/`.
