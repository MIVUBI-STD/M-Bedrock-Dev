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
Repair mutates only an Approved Bug or explicit design change.
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

## Map/version isolation

Gameplay audit defaults to one closed target:

```text
explicitly selected map/version
or single current root .mcworld
→ only current gameplay artifact
```

Do not infer current mechanics from older versions, Development/Source, historical QA, Technical Docs, other maps, or external references. They remain archive/reference unless the user explicitly requests comparison/history.

Expected and Actual Behavior must be derived from the same selected map/version. The selected map artifact is the sole current gameplay source of truth.

## User prompt interpretation boundary

Before production map audit, normalize material user wording through `docs/03-analysis/user-input-translation-contract.md`.

User wording is non-authoritative search guidance only:

```text
raw prompt
→ typed AuditUserIntentEnvelope
→ search priority / model context
→ selected-artifact evidence
```

A user-reported symptom, suspicion, expectation, design claim, historical example, scope request, or exclusion request cannot establish Expected/Actual behavior, BUG/DESIGN_MISMATCH, severity, safety, proof status, or absence.

If a material user-reported symptom cannot be reconciled with discovered selected-artifact gameplay, retain it as an `Audit Obligation`. Do not silently drop it and do not force it into an issue lane.

## Prompt confirmation checkpoint

When a selected-map audit is initiated from user wording, do not start production analysis immediately after interpretation.

First:

```text
normalize user intent
→ build one compact Pre-Audit Plan
→ show what will be done / what will be checked / proof strategy / output
→ user explicitly confirms/corrects scope
→ create AuditUserIntentConfirmation
→ runSelectedMapAudit()
```

For pre-testing audits, absence of known symptoms is expected and must not trigger a symptom interview. The confirmation is about planned audit scope and working method.

The receipt is bound to the normalized intent fingerprint. Any material change to the plan/interpretation invalidates the previous confirmation.

This checkpoint confirms communication accuracy only. It does not confirm gameplay truth, Expected/Actual behavior, or issue classification.

## Single linear production audit

There is one operator entry and one ordered production flow:

```text
audit <selected-map>
→ runSelectedMapAudit()
→ TARGET
→ DISCOVERY
→ UNDERSTAND
→ MODEL
→ STRESS
→ PROVE
→ REPORT
```

Do not create a second production command, state machine, route, manager, or report authority. Engineering inspection/projection commands are explicitly gated and never count as production audit entrypoints. A blocker does not create a branch; it pauses this same flow at the first unresolved stage. Resume only from the returned `SelectedMapAuditRun` and its single `allowedNextAction`.

## Single-source gameplay workflow

Gameplay bug work is selected-version-first. Production map audit has exactly one starting API: `runSelectedMapAudit({ artifactPath })`, where `artifactPath` is the exact selected `.mcworld`. The canonical entry owns extraction, native WorldDB/artifact proof, gameplay recomposition, procedure re-closure, and the evidence snapshot. Readiness is decided by one ordered admission owner (`map-audit-admission.ts`) across TARGET → DISCOVERY → UNDERSTAND → MODEL → STRESS → PROVE → REPORT; the first blocking stage prevents later production continuation. If PROVE is blocked by source-side Defect Resolution, continue only through `resolveSelectedMapAudit()` using the same audit run; do not call the resolver directly or rebuild gameplay state. Every audit run must expose `currentStage`, exactly one `allowedNextAction`, an explicit `continuation` owner contract, bounded `modelTaskPackets`, and immutable selected-artifact identity (artifact id/fingerprint plus grounded level/release identity when available). Model reasoning must consume those packets instead of the whole repository/context by default. Before PROVE, model reasoning is diagnostic only: it cannot authorize checkpoint closure; engine/evidence changes require a fresh canonical audit run. Every packet is bound to `auditRevision`; stale model outputs must be rejected rather than applied to a newer audit snapshot. Defect Resolution, review candidates, approval continuation, and final report build must all bind to the same current `auditRevision`. Work Session is not a second audit state machine: when bound to a selected-map audit it only mirrors the audit revision/stage/next action for persistence/UI. The sole projection/persistence owner is workflow/map-audit-work-session.ts. Preflight demand is provisional. Production audit permits one full reconciliation rerun only: first pass discovers final RIG demand, second pass executes the union. If demand still changes after pass two, fail closed as a convergence defect instead of repeatedly re-extracting/re-reading the artifact. Evidence collection may be eager for efficiency, but decision authorization is strictly ordered; later-stage evidence is marked COLLECTED_NOT_AUTHORIZED until every prior gate closes. Outputs from stages after the first blocker are inert: they must not surface as ready defects, root-cause groups, review candidates, or report content. Generic Work Session is persistence only for map audits: it must carry WorkSessionAuditBinding projected from SelectedMapAuditRun through map-audit-work-session; it must never independently advance or authorize audit stages. Review/report metadata must match that audit identity; never relabel an audit downstream. Candidate grouping must use the deterministic technical contradiction/owner/domain rather than evidence-set identity, because the same root cause may manifest with different evidence in different scenarios. AI report candidates must originate only from `readyDefects` projected from `CONFIRMED_DEFECT_READY` causal links and must respect deterministic `candidateGroups`; each AI candidate causal-link set must match exactly one deterministic candidate group, and each root-cause group must map to exactly one AI candidate; model output may enrich presentation/classification but must not invent additional AI defects outside that projection. `CONFIRMED_DEFECT_READY` requires a bounded `CounterProofSearchReceipt`; absence of discovered counter-proof without explicit search coverage/exhaustion is not confirmation. Review/report must consume that same returned audit run through the canonical continuation functions rather than rebuilding inventory, closure, or evidence context. Vital Gameplay Knowledge Closure is a read-only quality projection over that same run: it may summarize vital-domain status, findings, runtime residue, and detection gaps, but it must never advance stages, create findings, or become a second audit authority. Low-level analyzers, `inspectDirectory()`, `inspectArtifact()`, and raw reporting collectors are internal/development plumbing, not alternate production entry points. Closed-audit raw reporting routes require an opaque SelectedMapAuditAuthority issued by the canonical pipeline; reconstructing closure inputs manually is not production authority. Semantic proof reuse and rejected-candidate reuse in production must use the audit-bound wrappers and match the current `auditRevision`; unchanged evidence IDs alone are not sufficient reuse authority.

Production `runSelectedMapAudit()` accepts only runtime/platform target identity. Caller-supplied map-specific behavior contracts, arena layouts, state-authority contracts, spatial policy, economy/combat/inventory expectations, or release intent are forbidden because they would create a second gameplay authority.

Do not begin bug discovery from external documents or suspicious implementation patterns alone.

```text
Selected Map Version
→ Multi-source Gameplay Surface Inventory
→ Gameplay Discovery Closure
→ Gameplay Contract + State / Boundary Reconstruction
→ Gameplay Model Closure
→ Risk-directed Analysis
→ Actual Behavior
→ Gameplay Contradiction
→ Early Counter-Evidence / Confirmation
→ Exact-work Deduplication + Corroboration
→ Bug Candidate Classification
→ Proposed Bug Set
→ Chat Approval
→ Approved Bug
→ Production Report
→ Repair Contract
→ Repair
→ Verification against Game Design
```

Rules:

- derive the Gameplay Contract from explicit gameplay evidence inside the selected map version before bug discovery;
- do not import map-specific intent from external docs, old versions, Development/Source, or other maps;
- Gameplay Contract is a scoped working model, not a second authority;
- material unknowns inside the selected artifact block bug classification for their scope;
- if expected behavior cannot be grounded from the selected artifact, keep it unknown rather than borrowing stale intent;
- no Approved Bug → no bug repair;
- no preservation contract → no target mutation for bug repair;
- repair verification proves both defect removal and preservation of approved gameplay.

Intentional modification is separate from bug repair and may change Game Design first.

## Skill routing

Choose a **work lane first**:

```text
find/classify bugs in a map
→ m-bedrock-map-bug-audit

improve reusable bug-finding capability
→ m-bedrock-detection-development

measure capability/regression
→ m-bedrock-detection-benchmark

repair an Approved Bug or explicit design change in target source/artifact
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
- Scenario scope is deterministic: never substitute arbitrary N-hop/undirected graph expansion for typed dependency traversal and semantic stop boundaries.
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
→ current planning/workspace only when material
→ reliability history / experiments only when needed
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
current work intent      → planning/
local artifact continuity→ workspace/
historical proof         → engine/reliability/history/
reusable evaluation     → engine/reliability/corpus/
research                 → experiments/
```

Do not create duplicate roadmaps, state systems, architecture summaries, or proof owners.

## STOP

Completion is terminal. Do not automatically expand scope, add adjacent cleanup, create proof-of-proof, or resume deferred local/runtime work after the requested outcome is satisfied.


### Defect narrative immutability

For AI-origin production findings, Defect Resolution owns the factual Expected and Actual/Observed core. Report candidates may improve title/problem/presentation and classification, but must not rewrite those facts. A candidate spanning multiple ready causal links with different Expected/Actual narratives must remain split until canonical ConfirmedDefect root-cause grouping resolves them.


### Model packet evidence discipline

Model-facing audit packets must carry bounded evidence descriptors and RIG knowledge context, not opaque ids alone. For platform constraints, carry bounded applicable relation claims with status, rule, knowledge sources, and runtime evidence; a synthetic platform capability receipt alone is not factual proof. Any id listed in `unresolvedEvidenceIds` is a retrieval/blocking requirement; the model must not infer its contents.