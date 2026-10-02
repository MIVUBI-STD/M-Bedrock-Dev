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

## Gameplay simulation preset

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

The engine-owned preset is `buildGameplaySimulationPreset()` in diagnostic reasoning and is surfaced by Hidden Gameplay Defect Analysis. Do not replace it with an exhaustive tester checklist.

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
Detected Issue Set
→ confirmed | needs-validation | ambiguous | detection-gap
→ Approved Bug Set
→ Bug Report V2
```

Do not publish normal/designed behavior as bugs.

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

Stop when:

```text
✓ Gameplay surface inventory complete/accounted
✓ Gameplay Model Closure is CLOSED or PARTIAL
✓ Game Design mapped
✓ Gameplay Flow mapped
✓ State transitions reviewed
✓ Reset/progression rules known
✓ Multi Arena reviewed
✓ Blind-spot surfaces reviewed
✓ Cross-system interactions reviewed
✓ Capacity / recovery / boundary cases reviewed when applicable
✓ Every applicable coverage surface accounted as checked / blocked / not-applicable
✓ Unsupported surfaces recorded as Detection Gap
✓ Issues classified
✓ Production report generated
```
