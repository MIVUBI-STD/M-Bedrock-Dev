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

For ChatGPT-owned M-Lazy-Developer work, `Local` is a **GitHub development branch**, not the user's PC. This workspace is **ChatGPT + GitHub/cloud-only**: never ask the user for local-PC access, local data, a checkout, toolchain installation, or commands as a development or verification handoff. If execution evidence is unavailable, follow the no-local-PC invariant in `GITHUB_RULES.md` and record the exact unverified claim rather than assigning the user a local task.

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

For every `SYSTEM DEVELOPMENT` task, apply `docs/system/development-discipline.md#development-operating-standard` before material changes and its completion review before STOP. Product and Detection Development skills must explicitly route to that owner. This requirement does not authorize extra scope, local execution, CI or a second manager.

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

### Chat identity and GitHub context (M-Lazy-Developer pilot)

A chat title is a navigation label, not a source of repository truth, work status, or commit identity. For a **new conversation explicitly scoped** to this repository (repository URL, unambiguous user request, or ChatGPT Project instructions), suggest one ready-to-use title in the first substantive reply:

`M-Lazy-Developer · <specific work context> · YYYY-MM-DD`

- Use a concise, recognizable task topic from the actual request (e.g. `Discovery Alias Analysis` or `GitHub Continuity`), never generic titles such as `New Chat`, `Lanjutkan`, or `Cermati Aturan Repo`.
- The date is the conversation's **first calendar date** in the user's local timezone when established, not the date of the latest message or commit. Preserve that date when continuing the same conversation. Use today's local date only when starting a new conversation; if an older conversation's creation date is not known, do not invent one.
- Prefer a more specific topic to disambiguate two chats on the same day; append `HHmm` only if the original start time is known and truly needed. Never assign synthetic chat/commit sequence numbers like `#1`, `#2`, or `#3`. A real GitHub issue/PR number may appear only when it refers to that actual issue/PR. Commits use their actual SHA and existing `Work` metadata.
- Offer the title for manual renaming; repository policy does **not** control ChatGPT's automatic sidebar titles or update ChatGPT Project Instructions. Do not repeat the title suggestion on every turn.

For a fresh repository chat or explicit cross-chat continuation, apply the **Short-prompt repository startup** and topic-based recovery rules below: fetch a fresh GitHub `Local` HEAD and relevant current owner/source, then distinguish verified decisions, `PAUSED`/`BLOCKED` work, and unresolved proof. Prior chats, sidebar titles, ChatGPT memory, and Project instructions are orientation clues, not substitutes for GitHub evidence. An unrelated latest commit or a historical `Next` is not authorization to resume. If GitHub cannot be read, explicitly mark the current repository state unverified rather than claiming synchronization.

ChatGPT Project instructions may point to the repository URL, `Local`, and this root policy to help new conversations start correctly; they must not become a duplicated canonical rule store. Do not create chat-number mappings, separate continuity ledgers, or a second task manager.

**Short-prompt repository startup.** A message such as "amati repo ini dan ikuti aturan repo" plus a repository/branch URL is an INSPECT request, not permission to modify. Infer repository and branch from the URL; if no ref is given, establish the branch from repository authority rather than guessing. Read this file, `GITHUB_RULES.md`, and only the canonical owner/skill rules relevant to the requested work. Pin exact HEAD, inspect recent relevant commits with continuity metadata, then verify their assertions against current source and affected consumers.

Recover work by topic and actual evidence, not merely the newest commit: unrelated later commits do not replace earlier unfinished work. Distinguish current facts, historical decisions, unresolved claims, and unrecorded chat context. If several plausible active topics remain, report the alternatives and ask one deciding question rather than choosing one arbitrarily.

For a short INSPECT request, respond with repository/ref, applicable mode and rules, verified current status, credible unfinished work, proof limits, and one justified next step. Do not implement or commit. For an explicit "lanjutkan pekerjaan terakhir", resume autonomously only if the scope and authorization are unambiguous; otherwise clarify. A historical `Next` is never itself authority to edit. Use the existing development standard for recommendation maturity, verification economy and STOP.

For any resume request, reconcile newer commits, changed decisions, and proof limits with exact current source. Mark irrecoverable context UNKNOWN; never invent recovered user intent.

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