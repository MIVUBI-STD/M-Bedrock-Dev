# Next Action

## Current lane — Design-First Workflow Hardening

Real-map testing remains intentionally deferred.

The current objective is to make Game Design understanding a mandatory predecessor to gameplay bug discovery and repair.

## Canonical workflow

```text
Target Identity
→ Game Design
→ Gameplay Contract
→ Design Readiness
→ Actual Behavior
→ Gameplay Contradiction
→ Bug Candidate
→ Counter-Evidence / Player Impact / Trigger
→ Proposed Bug Set
→ Chat Approval
→ Approved Bug
→ Repair Contract
→ Repair
→ Defect Verification
→ Game Design Preservation Verification
→ HTML / handoff
```

## Current rules

- no design understanding → no gameplay bug search;
- Gameplay Contract is derived, scoped, and temporary;
- canonical intended gameplay remains project-local `design/game-design.json`;
- material design unknowns block classification for their scope;
- source code proves implementation, not intended gameplay;
- historical QA is hint/regression evidence only;
- no Approved Bug → no bug repair;
- no Must Preserve constraints → no bug-repair mutation;
- symptom removal alone does not prove repair correctness;
- HTML/report publication remains downstream of approval.

## Deferred

Do not start yet:

- Challenge map audit/retest;
- Minecraft runtime testing;
- benchmark/calibration execution;
- HTML generation for Challenge maps;
- CI expansion.

## Next repository hardening target

Audit remaining orchestrator/repair entry points for any path that can:

1. discover gameplay bugs before design readiness;
2. promote implementation-derived intent into defect authority;
3. mutate a target bug without Approved Bug + preservation constraints.