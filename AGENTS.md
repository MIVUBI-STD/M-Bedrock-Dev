# M-Bedrock-Dev Agent Routing

Root agent policy owns repository-wide routing and invariants only. Detailed domain procedures belong to the selected skill or canonical documentation owner.

## Priority

Current user intent has priority over workflow convenience. Repository safety, source authority, proof boundaries, and actual execution capability remain binding.

## Branch authority

```text
Local → active development / working authority
main  → stable / release authority
```

Material GitHub work follows `GITHUB_RULES.md`.

## Execution context

Classify work by the strongest environment actually available:

```text
REMOTE_GITHUB
LOCAL_ARTIFACT
LOCAL_MINECRAFT
LIVE_MINECRAFT
```

Never claim proof above the available context.

Complete the source/static portion first. Escalate only the irreducible residue that truly requires filesystem, Minecraft, or live-game access.

## Task classes

```text
INSPECT
DIAGNOSE
REPAIR
MODIFY
DEVELOP
VALIDATE
RESEARCH
```

Use one active work lane until STOP or explicit handoff. Domain specialist calls do not switch lanes automatically.

## Work-lane routing

```text
find/classify map bugs
→ .agents/skills/m-bedrock-map-bug-audit/

improve reusable bug detection/diagnosis/proof
→ .agents/skills/m-bedrock-detection-development/

measure detector/regression quality
→ .agents/skills/m-bedrock-detection-benchmark/

repair an Approved Bug or approved design change
→ .agents/skills/m-bedrock-target-repair/
```

Generic Product Development is not Detection Development. Use the normal development contract and the canonical implementation owner.

Domain specialist routing is defined by `docs/06-system/skill-routing.md`.

## Development contract

For material development work establish:

```text
Goal
Success metric
First wrong owner / first evidence
In scope / out of scope
Forbidden proxy or non-goal
Required proof
STOP condition
```

Do not add fallback owners, registries, caches, retries, state machines, or compatibility layers merely to compensate for an unproven diagnosis.

## Selected-map audit invariant

Production map audit has one selected artifact and one operator flow:

```text
audit <selected.mcworld>
→ runSelectedMapAudit()
→ TARGET
→ DISCOVERY
→ UNDERSTAND
→ MODEL
→ STRESS
→ PROVE
→ REPORT
```

The selected current map artifact is the sole current gameplay authority.

Detailed audit procedure, prompt confirmation, coverage, proof admission, issue taxonomy, report projection, model-packet discipline, and STOP rules are owned by:

```text
.agents/skills/m-bedrock-map-bug-audit/SKILL.md
docs/03-analysis/master-selected-map-audit-workflow.md
docs/03-analysis/mandatory-audit-procedure.md
docs/03-analysis/bug-finding-coverage.md
```

Do not duplicate that procedure in root policy.

Historical reports, older map versions, reliability evidence, user symptoms, and external references may raise search pressure but do not independently prove current Expected/Actual behavior.

## Mutation boundary

Original user artifacts are immutable inputs.

```text
evidence
→ approved mutation authority
→ working copy
→ validation
→ preservation proof
→ output
```

Analyzers are read-only. Repair primitives do not bypass approval/preservation authority.

## Proof vocabulary

```text
STATIC VERIFIED
PACKAGE VERIFIED
LOCAL GAME VERIFIED
LIVE GAME VERIFIED
UNKNOWN
```

Static/package proof never implies Minecraft runtime correctness.

## Permission preflight

Before write, external-network, dependency-install, or LOCAL/LIVE Minecraft actions, apply the active lane permission policy under `.agents/permissions/`.

A domain specialist cannot override a denied action.

## Repository invariants

- one semantic owner per responsibility;
- one persisted fact has one authority;
- one production entrypoint per workflow;
- derived projections never become second authorities;
- unknown evidence remains unknown;
- source/static/package/runtime proof remain distinct;
- artifact graph, repository task graph, and Minecraft semantic graph remain distinct;
- deterministic code owns repeatable mutation;
- AI may route, explain, and propose but does not invent missing proof;
- historical reliability evidence is search pressure, not current-artifact truth;
- delete/reuse an existing owner before adding a new abstraction;
- do not create duplicate roadmaps, state stores, report databases, or proof owners.

## Canonical owners

```text
stable repository facts      → CONTEXT.md
documentation routing        → docs/README.md
repository naming            → docs/06-system/canonical-naming.md
architecture                 → docs/06-system/architecture.md
semantic authority           → docs/06-system/authority-model.md
implementation routing       → docs/06-system/implementation-map.md
development discipline       → docs/06-system/development-discipline.md
developer operations         → docs/06-system/development-operations.md
minimum-sufficient execution → docs/06-system/zero-waste-execution.md

current work intent           → planning/
working/project continuity    → workspace/projects/
current Bug Report V2         → workspace/reports/
current Developer Notes       → workspace/developer-notes.json
derived publication output    → workspace/publication/
historical execution evidence → engine/reliability/history/
reusable evaluation material  → engine/reliability/corpus/
platform/runtime knowledge    → engine/knowledge/
engineering contracts         → engine/contracts/
research                      → experiments/
```

## STOP

Completion is terminal. Do not automatically expand into adjacent cleanup, architecture work, proof-of-proof, or another work lane after the requested outcome is satisfied.
