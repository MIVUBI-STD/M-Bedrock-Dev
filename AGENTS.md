# M-Bedrock-Dev Agent Routing

User-authorized autonomy replaces approval waits with verified checkpoints. Never claim proof above the execution context actually available.

## Instruction priority

Current user intent takes precedence over workflow guidance while repository safety, integrity, source authority, and actual capability limits remain binding.

## Branch and boot

- `Local` is working authority.
- `main` changes only by explicit promotion.
- Material GitHub work follows `GITHUB_RULES.md`.
- Documentation starts at `docs/README.md`; load only the selected domain owner.

## Execution Context Gate

Classify by actual capability:

```text
REMOTE_GITHUB
LOCAL_ARTIFACT
LOCAL_MINECRAFT
LIVE_MINECRAFT
```

`REMOTE_GITHUB` = GitHub/source/CI only.
`LOCAL_ARTIFACT` = checkout + Node/toolchain + filesystem + artifact extract/mutate/package.
`LOCAL_MINECRAFT` = LOCAL_ARTIFACT + compatible Minecraft installation/import capability.
`LIVE_MINECRAFT` = target content actively loaded/exercised and observable in-game.

Without an explicit marker choose the lowest sufficient provable context. Do not infer local or live capability from task wording.

## GitHub-first execution partition

Complete every source/static/CI-verifiable portion before escalating a genuine higher-context residue.

```text
REMOTE_GITHUB
→ source diagnosis
→ architecture/contracts
→ deterministic implementation
→ tests/fixtures
→ CI/security/provenance

LOCAL_ARTIFACT residue
→ filesystem-heavy artifact mutation
→ actual archive/world processing
→ local deterministic package verification

LOCAL_MINECRAFT / LIVE_MINECRAFT residue
→ import/open/runtime/gameplay/visual behavior
```

One higher-context residue does not transfer the whole task.

## Task class

```text
INSPECT
DIAGNOSE
REPAIR
MODIFY
DEVELOP
VALIDATE
RESEARCH
```

Inspection establishes what exists.
Diagnosis identifies the first wrong owner.
Repair corrects a reproduced defect.
Modify intentionally changes behavior/content.
Develop adds product capability.
Validate tests a claim against the strongest available evidence.
Research gathers external/domain evidence without mutating production ownership.

## Development execution contract

For bounded work:

```text
Goal
Failure classification / first wrong owner
Acceptance
Proof required
STOP condition
```

For standard work:

```text
Goal
Success metric
Forbidden proxy / non-goal
First evidence / first wrong owner
In scope / out of scope
Execution partition / higher-context residue
Proof required
STOP condition
```

Use `.agents/skills/m-bedrock-development-brief/SKILL.md` only when architecture, cross-owner ambiguity, or unresolved success criteria materially prevent a reliable standard contract.

## Specialist routing

Select by the decision being made, not filename or programming language.

```text
artifact/container/workspace ingest and packaging
→ m-bedrock-artifact-engineering

Bedrock manifests/functions/commands/references/semantic graph
→ m-bedrock-content-analysis

diagnostic-to-patch planning / transactions / coordinate repair
→ m-bedrock-repair-engineering

version/edition capability or Bedrock-vs-Education semantics
→ m-bedrock-compatibility

cross-owner ambiguous development
→ m-bedrock-development-brief
```

Do not preload all specialists. Load one primary specialist and switch only when semantic ownership changes.

## Evidence-first mutation

```text
requested outcome
→ cheapest falsifying evidence
→ failure classification
→ first wrong owner
→ smallest complete change
→ matching proof
→ STOP
```

Do not introduce fallbacks, compatibility layers, registries, caches, retries, or second owners to compensate for an unproven diagnosis.

## Product invariants

- Original user artifacts are immutable inputs.
- Mutations occur only through explicit working-copy transactions.
- Unknown content is preserved unless explicitly targeted.
- Adapters translate formats; they do not own semantic policy.
- Analyzers derive facts; they do not mutate source.
- Compatibility is explicit/versioned, not scattered conditionals.
- AI may route/explain/orchestrate; deterministic code owns repeatable mutation.
- Artifact graph, file inventory, normalized model, and semantic graph remain distinct.
- Arena/multiplayer topology is derived, not a universal core primitive.
- CLI, future MCP, and future desktop UI consume the same core engine.

## Proof vocabulary

```text
STATIC VERIFIED
PACKAGE VERIFIED
LOCAL GAME VERIFIED
LIVE GAME VERIFIED
UNKNOWN
```

Static or package proof never implies in-game correctness.

## Source precedence

```text
current user requirement
→ current source/proof
→ nearest AGENTS.md
→ selected specialist procedure
→ selected canonical docs owner
→ current operations only when material
→ history / Experimental evidence
```

## Canonical owners

```text
docs routing             → docs/README.md
stable facts             → CONTEXT.md
GitHub execution         → GITHUB_RULES.md
product flow             → docs/01-product/
artifact boundary        → docs/02-artifacts/
analysis semantics       → docs/03-analysis/
repair semantics         → docs/04-repair/
validation semantics     → docs/05-validation/
system ownership         → docs/06-system/
current continuation     → docs/07-operations/next-action.md
current proof            → docs/07-operations/current-validation.md
local artifact continuity→ workspace/
research                 → Experimental/
```

Do not create duplicate roadmaps, state systems, architecture summaries, or proof owners.

## STOP

Completion is terminal. Do not automatically expand scope, add adjacent cleanup, create proof-of-proof, or resume deferred local/runtime work after the requested outcome is satisfied.
