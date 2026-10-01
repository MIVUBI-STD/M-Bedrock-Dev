---
name: m-bedrock-map-bug-audit
description: >
  Audit one Minecraft Bedrock/Education map version for gameplay bugs using game-design-first analysis. Selected-version-only; no target repair.
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
→ Contradiction
→ Bug Classification
→ Production Bug Report
```

Required references:

- `references/game-design-contract.md`
- `references/gameplay-flow-contract.md`
- `references/multi-arena-contract.md`
- `references/bug-report-contract.md`

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
- multiplayer rules.

If expected behavior cannot be grounded from the selected artifact, keep it unknown.

## Bug admission

A confirmed defect requires:

1. grounded contradiction inside the selected version;
2. counter-evidence cleared;
3. player-visible impact (`blocking`, `material`, or `limited`);
4. tester-verifiable world reproduction path.

Severity:

- Blocker — required gameplay cannot normally start/continue/complete and recovery is unavailable;
- Major — core gameplay/state/fairness is materially wrong;
- Minor — limited but real player-visible impact.

## Output

Generate production bug report structure:

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
→ Bug Report V2
```

Do not hide unresolved issues that may represent real defects. Do not publish normal/designed behavior as bugs.

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
✓ Issues classified
✓ Production report generated
```
