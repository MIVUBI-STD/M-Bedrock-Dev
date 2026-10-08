# Lazy-Developer Agent Routing

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

REMOTE_GITHUB is the normal ChatGPT execution mode and may complete repository/source work without a local checkout.

Complete every source/static claim that can be decided from the exact GitHub ref. Do not make `npm run check`, local Node/npm availability, a local checkout, or `DEV.cmd` a completion prerequisite.

Escalate only the exact claim that inherently requires filesystem execution, artifact execution, Minecraft import, or live gameplay. That higher-context residue does not invalidate remote completion of the source work already proven.

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

## Operator modes

Choose exactly one user-facing mode from the requested outcome before selecting an existing work lane.

- `SYSTEM DEVELOPMENT`: change Lazy-Developer itself (architecture, engine, detectors, knowledge, tooling, UI, contracts). Route general changes through `m-bedrock-product-development` with its `product-development` permission profile; changes that specifically improve reusable bug detection use the existing `m-bedrock-detection-development` lane.
- `MAP BUG AUDIT`: use existing capabilities to find/classify defects in one selected map. Route to `m-bedrock-map-bug-audit`. Do not mutate engine code or improve detection capability inside this mode.

Detection Benchmark and Target Repair retain their dedicated existing lanes when explicitly requested. They are not implicit steps within either mode. When an audit finds a detection gap, record the bounded handoff and stop that claim; switch to SYSTEM DEVELOPMENT only upon explicit user direction. A user saying "continue" keeps the selected mode and current scope. Mode names are operator vocabulary, not new skills, registries, or persisted state owners.

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

Generic Product Development is not Detection Development. Use `.agents/skills/m-bedrock-product-development/SKILL.md`, the normal development contract, and the canonical implementation owner.

Domain specialist routing is defined by `docs/system/skill-routing.md`.

## Mandatory development style

For every `SYSTEM DEVELOPMENT` task, apply `docs/system/development-discipline.md#development-operating-standard-dos-v1` before material changes and its completion review before STOP. Product and Detection Development skills must explicitly route to that owner. This requirement does not authorize extra scope, local execution, CI or a second manager.

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

## Knowledge access

Repository information is not consumed as a flat file tree.

Use:

```text
task
→ Router
→ Catalog identity
→ Graph relationships
→ Retrieval
→ Context
→ decision
```

In REMOTE_GITHUB:

- start from `docs/README.md` or the already-known domain Router;
- use document frontmatter `id` as stable identity;
- follow explicit Markdown links and machine-readable ownership/binding sources before broad search;
- use targeted GitHub source lookup only inside the selected owner/module;
- treat semantic similarity/search as ranking assistance, never authority;
- preserve CANONICAL / REFERENCE / HISTORICAL / DERIVED authority when composing Context;
- do not broad-scan a documentation domain for reassurance;
- if a relevant resource is unreachable from its Router/Graph, fix routing/metadata rather than relying on memory.

Machine owners:

```text
Catalog   → tooling/repository/resource-catalog.mjs
Graph     → tooling/repository/graph.mjs
Retrieval → engine/packages/analysis-planner/src/retrieval.ts
Context   → engine/packages/orchestrator/src/workflow/context-compiler.ts
```

## ChatGPT-GitHub Work Continuity

On a resume request, pin the current `Local` HEAD, identify the requested work from its canonical owner and relevant Git commits, then verify current source before continuing. A historical `Next` is not current authority. Reconcile newer commits, changed decisions, and proof limits; mark irrecoverable context UNKNOWN.

For material work, record the work identity, decision, evidence ceiling, and remaining action in the same logical commit as the change, following `GITHUB_RULES.md`. Keep durable design rules with their existing owner. `planning/` owns future intent, not a duplicate implementation-status log.

Uncommitted chat discussion is not persisted automatically. Do not invent recovered information or create a parallel memory manager, session log, or next-to-do store.

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
docs/analysis/master-selected-map-audit-workflow.md
docs/analysis/mandatory-audit-procedure.md
docs/analysis/bug-finding-coverage.md
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
repository naming            → docs/system/canonical-naming.md
architecture                 → docs/system/architecture.md
semantic authority           → docs/system/authority-model.md
implementation routing       → docs/system/implementation-map.md
development discipline       → docs/system/development-discipline.md
developer operations         → docs/system/development-operations.md
minimum-sufficient execution → docs/system/zero-waste-execution.md

current work intent           → planning/
working/project continuity    → workspace/projects/
current Bug Report V2         → workspace/projects/*/report/ (or level report/)
current Developer Notes       → workspace/projects/*/report/developer-notes.json
derived publication output    → workspace/projects/*/output/ (or level output/)
historical execution evidence → engine/reliability/history/
reusable evaluation material  → engine/reliability/corpus/
platform/runtime knowledge    → engine/knowledge/
engineering contracts         → engine/contracts/
research                      → experiments/
```

## STOP

Completion is terminal. Do not automatically expand into adjacent cleanup, architecture work, proof-of-proof, or another work lane after the requested outcome is satisfied.