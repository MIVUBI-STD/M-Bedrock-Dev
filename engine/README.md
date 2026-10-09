# Engine

Canonical deterministic Minecraft Bedrock / Education analysis and repair engine.

## Physical directory responsibilities

These are actual directories under `engine/`. Each owns one distinct kind of source or evidence; **none** is a new workflow stage.

| Directory | Owns | Does not own |
|---|---|---|
| `adapters/` | Native/archive format translation | Gameplay diagnosis |
| `analyzers/` | Read-only evidence and authored-source semantics | Authorized mutation |
| `packages/` | Reusable typed behavior, reasoning, repair and cross-owner composition | Duplicate parsers or data catalogs |
| `design/` | Game Design vocabulary/schema system | Current selected-map Game Design |
| `knowledge/` | Minecraft platform fact catalogs | Executable runtime proof |
| `rules/` | Versioned executable platform capability rules | Descriptive knowledge duplicates |
| `schemas/` | Serialized format/schema contracts | Runtime logic |
| `contracts/` | Global engineering and verification constraints | Map-specific authored intent |
| `fixtures/` | Reduced reproducible inputs | Current gameplay truth |
| `reliability/` | Corpus, regression/history and reliability catalogs | Current-map authority |
| `runtime/` | Runtime harnesses and experimental proof infrastructure | Unverified static inference |

`engine/ownership.json` is the machine-readable source for the seven **logical groups** (`core`, `analysis`, `policy-data`, `quality`, `runtime-proof`, `engineering-governance`, `design-system`). They are labels for the physical directories above, not folders to create. `engine/packages/ownership.json` separately groups packages by responsibility; do not physically duplicate packages under those group names.

For the user-facing audit flow `TARGET → DISCOVERY → UNDERSTAND → MODEL → STRESS → PROVE → REPORT`, resolve the stage through [Implementation Map](../docs/system/implementation-map.md) and the existing selected-map workflow. Stages are navigation routes; analyzers and packages retain their single canonical implementation owners.

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

Authority/data owners inform the pipeline without becoming runtime proof:

```text
project Game Design + design system + knowledge + rules + contracts + schemas
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
- Actual map Game Design lives under the project workspace; `engine/design` owns only the design system. `engine/knowledge` owns platform facts; `engine/contracts` owns engineering constraints; `rules` and `schemas` remain executable policy/structure owners.
- `engine/fixtures` and `reliability` protect quality but do not define gameplay semantics.
- `engine/runtime` provides bounded runtime proof.
- Research under `experiments/` is non-authoritative and must not become a production dependency.

Logical owner names remain `packages/*`, `analyzers/*`, and `adapters/*` in dependency/audit reports even though their physical paths are namespaced under `engine/`.
