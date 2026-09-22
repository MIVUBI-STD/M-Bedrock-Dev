# M-Bedrock-Dev Agent Routing

User-authorized work should proceed to the strongest proof available in the current execution context. Do not invent approval gates and do not claim runtime proof that was not observed.

## Branch and boot

- `Local` is active development authority.
- `main` is stable/release authority and changes only through explicit promotion.
- Material GitHub work follows `GITHUB_RULES.md`.
- Canonical documentation starts at `docs/README.md`.

## Execution Context Gate

Classify by actual capability:

```text
REMOTE_GITHUB
LOCAL_ARTIFACT
LOCAL_MINECRAFT
LIVE_MINECRAFT
```

Definitions:

- `REMOTE_GITHUB`: repository/source/CI only.
- `LOCAL_ARTIFACT`: local files can be extracted, analyzed, mutated and repackaged.
- `LOCAL_MINECRAFT`: a compatible Minecraft installation can be used for local acceptance.
- `LIVE_MINECRAFT`: the target content can be actively exercised and observed in-game.

Never infer a higher context from task wording alone.

## Task Class

Classify the current request before choosing tools:

```text
INSPECT
DIAGNOSE
REPAIR
MODIFY
DEVELOP
VALIDATE
RESEARCH
```

- `INSPECT`: establish what exists and how it connects.
- `DIAGNOSE`: explain a defect and identify the first wrong owner.
- `REPAIR`: correct a proven defect with minimum complete change.
- `MODIFY`: intentional behavior/content adjustment that is not a defect fix.
- `DEVELOP`: add or materially extend product capability.
- `VALIDATE`: test a claim against the strongest available evidence.
- `RESEARCH`: gather external/domain evidence without mutating product state.

Do not turn inspection into mutation, or validation into feature development.

## Evidence-first mutation

For non-trivial changes:

```text
requested outcome
→ cheapest falsifying evidence
→ failure / ownership classification
→ smallest complete change
→ matching validation
→ STOP
```

Do not add fallback layers, duplicate managers, broad retries or new abstractions to compensate for an unproven diagnosis.

## Product ownership

Canonical responsibility lanes:

```text
artifact ingest / archive safety     → packages/artifact + adapters/*
project semantic model               → packages/project-model
dependency / reference graph         → packages/graph
diagnostic findings                  → packages/diagnostics + analyzers/*
mutation / patch transaction         → packages/repair
validation and evidence              → packages/validation
edition/version capability truth     → packages/compatibility + rules/*
reports                              → packages/report
CLI / future interfaces              → apps/* or interfaces/*
```

One responsibility has one canonical owner. Adapters translate formats; they do not own business rules. Analyzers observe/derive; they do not directly mutate source artifacts.

## Proof vocabulary

Use the strongest proven level only:

```text
STATIC VERIFIED
PACKAGE VERIFIED
LOCAL GAME VERIFIED
LIVE GAME VERIFIED
UNKNOWN
```

Static proof does not imply in-game correctness.

## Core rules

- Preserve the original artifact; mutate a working copy or transaction output.
- Prefer deterministic transformations over free-form rewriting.
- Every repair should be reproducible from inputs + patch plan.
- Version and edition compatibility must be explicit, not scattered conditionals.
- Do not make MCP the core architecture; interfaces consume the same deterministic engine.
- Real bug fixtures should become regression evidence when reusable.
- Stop the same failed direction after two attempts without new separating evidence.
- `No change required` is a valid result.
