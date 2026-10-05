# Analysis

Canonical semantic-analysis policy. Analyzers are read-only evidence providers; they do not own production audit order.

## Selected-map audit — one door

For production gameplay audit there is exactly one semantic procedure and one engine entrypoint:

```text
CLI: audit <selected.mcworld>
→ runSelectedMapAudit()
→ TARGET
→ DISCOVERY
→ UNDERSTAND
→ MODEL
→ STRESS
→ PROVE
→ REPORT
```

**Operator master flow:** [Master Selected-Map Audit Workflow](./master-selected-map-audit-workflow.md)

**Executable checkpoint contract:** [Mandatory Gameplay Audit Procedure](./mandatory-audit-procedure.md)

The master workflow defines the complete human/AI work order. The Mandatory Gameplay Audit Procedure remains the executable checkpoint authority. All other gameplay-audit documents in this directory are supporting contracts loaded by that flow. They must not be interpreted as alternate workflows, alternate closure authorities, or alternate report routes.

### Authority hierarchy

```text
map-audit-pipeline.ts
  owns production entry + continuation
        ↓
mandatory-audit-procedure.ts / mandatory-audit-procedure.md
  owns ordered checkpoints
        ↓
map-audit-admission.ts
  owns first blocking stage / continuation authorization
        ↓
scenario + analyzer evidence
  supports checkpoints only
        ↓
PROVE
  emits confirmed issue projection
        ↓
BUG | DESIGN_MISMATCH
        ↓
single Map Audit output
```

### Player-flow projection

Inside the ordered stages, analysis follows the game:

```text
ENTRY / JOIN
→ READY / START
→ SETUP
→ ACTIVE GAMEPLAY
→ PROGRESSION
→ TERMINAL
→ CLEANUP / REPLAY
→ RECOVERY
```

Technical domains attach to those stages; they are not separate audit branches.

## Canonical navigation

Use this order:

1. [Master Selected-Map Audit Workflow](./master-selected-map-audit-workflow.md) — end-to-end work order.
2. [Mandatory Gameplay Audit Procedure](./mandatory-audit-procedure.md) — executable checkpoint closure.
3. Load specialist contracts only when the master flow activates them.

## Naming contract

- [Map Audit Naming Contract](./map-audit-naming-contract.md) — canonical public field/status names shared by source, schema, docs, and report.

## Supporting audit contracts

Load only when the canonical procedure activates the concern:

- [Gameplay Model Closure](./gameplay-model-closure.md) — UNDERSTAND closure semantics.
- [Bug-Finding Coverage System](./bug-finding-coverage.md) — canonical coverage accounting, blind spots, cross-system stress, proof conservation, and anti-suppression gate.
- [Audit Execution Flow](./audit-execution-flow.md) — reader-facing player-flow projection only.
- [Map Audit Report V2](./map-audit-report-v2-schema.md) — **Complete Bug Report**; human-facing full finding set across `PROVEN` and `NEED_VALIDATION`, with separate `BUG` and `DESIGN_MISMATCH` lanes.
- [Approved Bug Report V2](./gameplay-bug-report-v2.md) — downstream persisted approved `PROVEN BUG` ledger only.

None of these documents may authorize continuation independently of the Mandatory Audit Procedure receipt.

## Analysis domains

### Core models and graphs
- [Project model](./project-model.md)
- [Dependency graph](./dependency-graph.md)
- [State scope](./state-scope.md)
- [Topology](./topology.md)
- [Executable reasoning architecture](./executable-reasoning-architecture.md)

### Authored source semantics
- [Content discovery](./content-discovery.md)
- [Command effects](./command-effects.md)
- [Dialogue scene graph](./dialogue-scene-graph.md)
- [Entity state analysis](./entity-state-analysis.md)
- [Script API](./script-api.md)

### Native world and structure evidence
- [World DB](./world-db.md)
- [World DB native evidence](./world-db-native-evidence.md)
- [mcstructure](./mcstructure.md)
- [Structure load correlation](./structure-load-correlation.md)
- [Native world differential](./native-world-differential.md)

### Platform knowledge and compatibility
- [Knowledge layer](./knowledge-layer.md)
- [Compatibility](./compatibility.md)
- [Education](./education.md)

### Gameplay capacity and concurrency
- [Capacity and Concurrency](./capacity-concurrency.md) — presented vs deliverable capacity, throughput bottlenecks, queue behavior, and concurrency boundaries.

### Runtime gameplay knowledge
Runtime documents describe evidence requirements only; knowledge presence is not proof and does not create a workflow.

- arena/session: [arena cleanup](./arena-cleanup-runtime.md), [round integrity](./round-integrity-runtime.md), [player session](./player-session-runtime.md)
- player lifecycle: [player life](./player-life-runtime.md), [inventory](./inventory-runtime.md), [interaction](./interaction-runtime.md), [effects](./effects-runtime.md)
- entities/combat: [entity navigation](./entity-runtime-navigation.md), [entity population](./entity-population-runtime.md), [combat](./combat-runtime.md)
- world/chunks: [chunk loading](./chunk-runtime-loading.md), [world state](./world-state-runtime.md), [world mutation](./world-mutation-runtime.md), [spatial containment](./spatial-containment-runtime.md)
- execution/order: [event ordering](./event-ordering-runtime.md), [persistence/recovery](./persistence-recovery-runtime.md), [state authority](./state-authority-runtime.md)
- environment: [teleport](./teleport-runtime.md), [environment hazards](./environment-hazards-runtime.md)
- economy/content: [loot/economy](./loot-economy-runtime.md), [NPC dialogue](./npc-dialogue-runtime.md)

## Placement rule

A new analysis document is not a new audit stage. Durable semantics belong here; current proof belongs in `docs/07-operations/`; production execution order remains owned by the Mandatory Audit Procedure.