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
Develop adds product capability. Use Detection Development only when that capability specifically improves bug detection/diagnosis/proof; otherwise use normal Product Development.
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

Use `.agents/skills/m-bedrock-cross-owner-routing/SKILL.md` only when architecture, cross-owner ambiguity, or unresolved success criteria materially prevent a reliable standard contract.

## Active lane lock

Once selected, the work lane remains active until its STOP or explicit handoff. Domain-specialist calls do not change the lane. A handoff record does not execute the next lane automatically.

Generic Product Development has no detection-lane skill: use the normal development execution contract and canonical semantic owner unless the requested capability specifically improves bug detection/diagnosis/proof.

## Skill routing

Choose a **work lane first**:

```text
find/classify bugs in a map
→ m-bedrock-map-bug-audit

improve reusable bug-finding capability
→ m-bedrock-detection-development

measure capability/regression
→ m-bedrock-detection-benchmark

repair a proven defect in target source/artifact
→ m-bedrock-target-repair
```

Then consult the smallest **domain specialist** when needed:

```text
artifact/container/workspace → m-bedrock-artifact-engineering
source/semantic analysis     → m-bedrock-content-analysis
version/edition/capability   → m-bedrock-compatibility
ownership ambiguity          → m-bedrock-cross-owner-routing
```

Keep one lane active. A detection gap found during Map Audit is recorded and handed off; it does not implicitly switch the current task into development.

## Permission preflight

For any planned write, external-network action, dependency installation, or LOCAL/LIVE Minecraft interaction inside a work lane, evaluate the action against `.agents/permissions/evaluate-lane-permission.mjs` first.

`allow` permits only that planned action. `ask` requires explicit approval/context escalation. `deny` is terminal for that action and cannot be bypassed by consulting another skill.

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
research                 → experiments/
```

Do not create duplicate roadmaps, state systems, architecture summaries, or proof owners.

## STOP

Completion is terminal. Do not automatically expand scope, add adjacent cleanup, create proof-of-proof, or resume deferred local/runtime work after the requested outcome is satisfied.
