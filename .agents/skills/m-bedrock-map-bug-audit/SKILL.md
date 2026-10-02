---
name: m-bedrock-map-bug-audit
description: >
  Audit one Minecraft Bedrock/Education map version for gameplay bugs using game-design-first analysis and production report output.
---

# M-Bedrock Map Bug Audit

**Lane:** OPERATIONAL / MAP USE

## Source of truth

Audit exactly one selected `.mcworld`.

That selected map version is the only current gameplay source of truth.

Do not use older versions, Development/Source, old QA/Bug Reports, Technical Docs, changelogs, other maps, or external design documents to infer current mechanics unless comparison/history is explicitly requested.

## Required audit order

Bug discovery cannot start before the selected world is reconstructed.

```text
Selected Map Version
→ Gameplay Surface Inventory
→ Game Design Reconstruction
→ Gameplay Flow Mapping
→ State Transition Mapping
→ Reset / Preserve Rules
→ Progression Rules
→ Multiplayer / Multi Arena Rules
→ Gameplay Model Closure
→ Actual Behavior
→ Gameplay Contradiction
→ Bug Classification
→ Production Bug Report V2
```

Required references:

- `references/game-design-contract.md`
- `references/gameplay-flow-contract.md`
- `references/multi-arena-contract.md`
- `references/bug-report-contract.md`
- `../../../docs/03-analysis/gameplay-model-closure.md`
- `../../../docs/03-analysis/gameplay-audit-blind-spots.md`
- `../../../docs/03-analysis/cross-system-interaction-audit.md`
- `../../../docs/03-analysis/hidden-gameplay-defect-analysis.md`
- `../../../docs/03-analysis/audit-finalization-checklist.md`
- `../../schemas/map-audit-output-v2.schema.json`

## Gameplay Contract

Before bug discovery, the audit must establish and account for the full gameplay model:

- objective;
- win condition;
- lose condition;
- player journey;
- state transitions;
- reset rules;
- preserve rules;
- progression rules;
- multiplayer rules;
- multi arena rules when applicable;
- capacity/concurrency rules when applicable;
- recovery and softlock paths;
- boundary scenarios;
- player-facing feedback for material limitations;
- persistence boundaries.

If expected behavior cannot be grounded from the selected artifact, keep it unknown. Do not convert unknown into Designed Behavior.

Bug discovery starts only after Gameplay Model Closure is CLOSED or PARTIAL. OPEN closure forbids comprehensive bug claims and finalization.

## Gameplay scenario audit backbone

The audit is scenario-driven. Surface discovery and technical analyzers provide evidence; they do not close gameplay by themselves.

The mandatory execution path is:

```text
Selected Map
→ reconstruct player journey
→ compile material gameplay scenarios
→ map every technical/gameplay component to a gameplay purpose
→ build Gameplay Causal Links
→ route each link to existing analyzers
→ resolve each link
→ detect missing links and orphan components
→ analyze player-count/failure/recovery variants
→ translate technical contradictions into player-visible gameplay consequences
→ Gameplay Scenario Closure
→ Proposed Bug Set
```

A component is not considered understood merely because it was parsed or counted. For every material component answer:

```text
What is its technical role?
What gameplay purpose does it serve?
Which scenario uses it?
What dependency does it provide?
What breaks if it fails?
What does the player experience?
```

Every material scenario must account for its causal links. Valid Gameplay Causal Link states are `PROVEN`, `CONTRADICTED`, `RUNTIME_BLOCKED`, or `DETECTION_GAP`. There is no gameplay-level `checked` state.

Every `CONTRADICTED` Gameplay Causal Link must enter Gameplay Defect Resolution before report review. The only allowed final dispositions are:

- `CONFIRMED_DEFECT_READY` — gameplay trigger, consequence, expected outcome, actual outcome, and affected scope are complete;
- `BLOCKING_COUNTERPROOF` — concrete evidence proves the wrong state is unreachable;
- `RUNTIME_PROOF_REQUIRED` — source reasoning is exhausted and one narrow Minecraft-runtime question remains;
- `DETECTION_GAP` — a named engine capability is genuinely missing.

The temporary states `GAMEPLAY_TRANSLATION_REQUIRED` and `COUNTERPROOF_SEARCH_REQUIRED` block report publication. They are AI work queues, never tester-facing `Needs Validation`.

Do not use `Needs Validation` as a generic outcome. Tester/runtime escalation is allowed only through `RUNTIME_PROOF_REQUIRED`, with a specific runtime reason and one narrow question. A broad validation checklist is forbidden.

Gameplay Scenario Closure is:

- `CLOSED` only when components are correlated to scenarios and causal links are resolved;
- `PARTIAL` only for irreducible Minecraft runtime proof;
- `OPEN` when a component is orphaned, a gameplay purpose is missing, a causal link is unproven, or a scenario is not bound to selected-artifact components.

An OPEN Gameplay Scenario Closure forbids claims that the audit is complete.

## Gameplay audit scenario preset

Before contradiction analysis, derive one reusable scenario preset from the selected map's own gameplay model. The preset is mandatory audit input, not a manual test matrix.

Always model the full journey:

```text
Entry → Join → Start → Preparation → Gameplay → Objective
→ Success/Failure → Transition → Final Result → Cleanup → Replay
```

Add only relevant scenario families:

- solo, two-player, maximum-party, and maximum+1 admission boundaries;
- simultaneous player actions and one-player-leaves-while-others-continue;
- multi-arena parallel start, capacity+1, isolation, cleanup, and reuse;
- disconnect/reconnect at materially different gameplay states;
- reload/recovery where persisted gameplay exists;
- deferred callbacks that can outlive player/session/arena ownership;
- first/final/max boundaries for levels, waves, retries, objectives, or timers;
- terminal collisions such as victory × timeout, defeat × respawn, or cleanup × pending work;
- complete second run after cleanup.

The engine-owned preset is `buildGameplayAuditScenarioPreset()` in diagnostic reasoning and is surfaced by Hidden Gameplay Defect Analysis. Do not replace it with an exhaustive tester checklist.

Every scenario is static-first:

```text
scenario
→ dependency chain
→ owner/state transition
→ contradiction or counter-proof
→ player-visible result
→ runtime confirmation only if Minecraft simulation is irreducible
```

A plausible explanation is not counter-proof. Counter-evidence may suppress a candidate only when it demonstrates a reachable guard/owner that deterministically prevents the wrong state.

## Single-pass audit discipline

Default behavior is one comprehensive discovery pass before reporting.

```text
Discover all gameplay surfaces
→ close Discovery Closure
→ close/account the gameplay model
→ challenge implementation-only design assumptions
→ verify mechanic completeness and negative space
→ prioritize temporal/cross-system risks
→ check design-consistency anomalies
→ prioritize proof depth by gameplay risk
→ detect silent degradation / fallback masking
→ trace prerequisite reachability and restricted capability exposure
→ generate relevant mixed-player and repeated-run verification
→ build root-cause / constraint / evidence-convergence analysis for complex findings
→ analyze contradictions across all understood surfaces
→ apply early counter-evidence/confirmation
→ deduplicate exact candidate work while retaining corroboration
→ classify the complete surviving issue set
→ report once
```

Do not publish an early partial bug list and rely on repeated rechecks to discover the rest. Recheck is for new artifacts, changed versions, blocked evidence becoming available, or explicit verification—not as the normal discovery strategy.

If Gameplay Model Closure is OPEN, report the missing/unaccounted surfaces instead of pretending the bug list is complete. Production review and final publication must remain closure-gated.

## Bug admission

A confirmed defect requires:

1. grounded contradiction inside the selected version;
2. counter-evidence cleared;
3. player-visible impact;
4. tester-verifiable world reproduction path.

Severity:

- Blocker — required gameplay cannot normally start/continue/complete and recovery is unavailable;
- Major — core gameplay/state/fairness is materially wrong;
- Minor — limited but real player-visible impact.

## Output Contract

Primary output uses Map Audit Output V2 and Production Bug Report V2.

Each issue must contain:

```text
Bug ID
Category
Gameplay Flow
Severity
Status
Issue
Player Impact
Reproduce Steps
Expected Behavior
Actual Behavior
Evidence
```

Tester instructions use player language:

- World
- Player
- Level
- Wave
- Arena
- Enemy

Reproduction is explanatory evidence, not a checkbox procedure. In HTML, one issue equals one checklist item. Setup/reproduction steps remain readable scenario detail and must not become individual checkboxes.

Do not expose implementation details as reproduction steps.

## Review

```text
Gameplay Causal Links
→ Gameplay Defect Resolution
→ CONFIRMED_DEFECT_READY only
→ Confirmed Defect
→ Proposed Bug Set
→ chat review
→ Approved Bug Set
→ Bug Report V2
```

`RUNTIME_PROOF_REQUIRED` and `DETECTION_GAP` remain explicit audit residue and do not enter the canonical bug report as confirmed bugs. `BLOCKING_COUNTERPROOF` is retained as rejection evidence. Temporary resolver states block review.

Do not publish normal/designed behavior, unresolved AI work, or runtime residue as bugs.

## Forbidden

- start from suspicious code patterns alone;
- encode regression examples as map/object-specific production rules;
- mix evidence from different map versions;
- use stale docs as gameplay authority;
- assign severity before defect admission;
- mutate target world during audit.

## Handoff

- detection gap → `m-bedrock-detection-development`
- approved repair → `m-bedrock-target-repair`

## STOP

The audit may stop only when:

```text
✓ Selected Map Version remains the sole gameplay authority
✓ Gameplay Discovery Closure is COMPLETE or justified PARTIAL
✓ Gameplay Model Closure is CLOSED or justified PARTIAL
✓ Gameplay Scenario Closure is CLOSED or justified PARTIAL
✓ Every material Gameplay Scenario is accounted
✓ Every Gameplay Scenario Component has a gameplay purpose
✓ Every material Gameplay Causal Link is resolved
✓ Every CONTRADICTED link has a final Gameplay Defect Resolution
✓ GAMEPLAY_TRANSLATION_REQUIRED = 0
✓ COUNTERPROOF_SEARCH_REQUIRED = 0
✓ Confirmed defects are consolidated by gameplay/root cause
✓ Runtime proof residue is narrow and explicitly justified
✓ Detection gaps name the missing engine capability
✓ Proposed Bug Set contains confirmed defects only
✓ Production report is generated only after chat approval
```

Do not use analyzer execution count, surface `checked` state, or a broad tester validation list as completion evidence.
