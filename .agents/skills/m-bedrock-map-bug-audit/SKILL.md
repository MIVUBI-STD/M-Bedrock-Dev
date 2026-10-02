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
→ Game Design Reconstruction
→ Gameplay Flow Mapping
→ State Transition Mapping
→ Reset / Preserve Rules
→ Progression Rules
→ Multiplayer / Multi Arena Rules
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
- `../../../docs/03-analysis/gameplay-audit-blind-spots.md`
- `../../schemas/map-audit-output-v2.schema.json`

## Gameplay Contract

The audit must establish:

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

If expected behavior cannot be grounded from the selected artifact, keep it unknown.

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

Do not expose implementation details as reproduction steps.

## Review

```text
Detected Issue Set
→ confirmed | needs-validation | ambiguous
→ Approved Bug Set
→ Bug Report V2
```

Do not publish normal/designed behavior as bugs.

## Forbidden

- start from suspicious code patterns alone;
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
✓ Game Design mapped
✓ Gameplay Flow mapped
✓ State transitions reviewed
✓ Reset/progression rules known
✓ Multi Arena reviewed
✓ Blind-spot surfaces reviewed
✓ Capacity / recovery / boundary cases reviewed when applicable
✓ Issues classified
✓ Production report generated
```
