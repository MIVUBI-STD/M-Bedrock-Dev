# Analysis

Canonical semantic-analysis policy. Analyzers are read-only: they derive supported facts and evidence, but they do not mutate target artifacts or invent unsupported gameplay meaning.

This directory remains intentionally shallow for path stability. Use this index as the navigation taxonomy; do not add a new analysis document unless it fits one of these groups.

## Gameplay audit workflow

For Minecraft world bug audits, start from the selected world version and build understanding before finding defects:

```text
Selected World Version
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
→ Production Bug Report
```

Related contracts:

- [Audit routing](./map-audit-routing.md)
- [Gameplay model closure — mandatory pre-bug gate](./gameplay-model-closure.md)
- [Game design audit checklist](./game-design-audit-checklist.md)
- [Gameplay bug report v2 — canonical report contract](./gameplay-bug-report-v2.md)
- [Bug report v2 HTML layout — canonical rendering template](./templates/bug-report-v2-html-layout.md)
- [Bug report v2 schema](./map-audit-report-v2-schema.md)
- [Multi arena audit contract](./multi-arena-audit-contract.md)
- [Capacity and concurrency contract](./capacity-and-concurrency-contract.md)
- [Capacity/concurrency audit checklist](./capacity-concurrency-audit-checklist.md)
- [Gameplay audit blind-spot contract](./gameplay-audit-blind-spots.md)
- [Cross-system interaction audit](./cross-system-interaction-audit.md)
- [Hidden gameplay defect analysis — canonical ownership map](./hidden-gameplay-defect-analysis.md)
- [Audit finalization checklist](./audit-finalization-checklist.md)

## Core models and graphs

- [Project model](./project-model.md)
- [Dependency graph](./dependency-graph.md)
- [Embedded command graph](./embedded-command-graph.md)
- [State scope](./state-scope.md)
- [Topology](./topology.md)
- [Topology candidates](./topology-candidates.md)
- [Executable reasoning architecture](./executable-reasoning-architecture.md)

## Authored source semantics

- [Content discovery](./content-discovery.md)
- [Command effects](./command-effects.md)
- [Command context runtime](./command-context-runtime.md)
- [Dialogue scene graph](./dialogue-scene-graph.md)
- [Entity state analysis](./entity-state-analysis.md)
- [Entity event reachability](./entity-event-reachability.md)
- [Entity knowledge graph](./entity-knowledge-graph.md)
- [Script API](./script-api.md)
- [Script API usage inventory](./script-api-usage-inventory.md)

## Native world and structure evidence

- [LevelDB keyspace](./leveldb-keyspace.md)
- [World DB](./world-db.md)
- [World DB native evidence](./world-db-native-evidence.md)
- [mcstructure](./mcstructure.md)
- [Structure chunk knowledge](./structure-chunk-knowledge.md)
- [Structure load correlation](./structure-load-correlation.md)
- [Structure transform chain](./structure-transform-chain.md)
- [Native chunk correlation](./native-chunk-correlation.md)
- [Native world differential](./native-world-differential.md)

## Platform knowledge and compatibility

- [Knowledge layer](./knowledge-layer.md)
- [Compatibility](./compatibility.md)
- [Compatibility runtime](./compatibility-runtime.md)
- [Script API lifecycle](./script-api-lifecycle.md)
- [Script API version matrix](./script-api-version-matrix.md)
- [Script API signature migrations](./script-api-signature-migrations.md)
- [Script API static compatibility](./script-api-static-compatibility.md)
- [Script API return contracts](./script-api-return-contracts.md)
- [Education](./education.md)
- [Education runtime](./education-runtime.md)

## Runtime gameplay domains

Runtime documents describe evidence requirements and domain reasoning. They are not live-game proof by themselves.

- arena/session: [arena cleanup](./arena-cleanup-runtime.md), [round integrity](./round-integrity-runtime.md), [player session](./player-session-runtime.md)
- player lifecycle: [player life](./player-life-runtime.md), [inventory](./inventory-runtime.md), [interaction](./interaction-runtime.md), [input gesture](./input-gesture-runtime.md), [effects](./effects-runtime.md), [permissions](./permissions-runtime.md)
- entities/combat: [entity navigation](./entity-runtime-navigation.md), [entity population](./entity-population-runtime.md), [combat](./combat-runtime.md), [targeting knowledge](./targeting-knowledge.md)
- world/chunks: [chunk loading](./chunk-runtime-loading.md), [world state](./world-state-runtime.md), [world mutation](./world-mutation-runtime.md), [spatial containment](./spatial-containment-runtime.md)
- execution/order: [event ordering](./event-ordering-runtime.md), [automation](./automation-runtime.md), [persistence/recovery](./persistence-recovery-runtime.md), [state authority](./state-authority-runtime.md), [performance](./performance-runtime.md)
- environment: [physics](./physics-runtime.md), [environment hazards](./environment-hazards-runtime.md), [teleport](./teleport-runtime.md), [mounts](./mounts-runtime.md)
- economy/content: [loot/economy](./loot-economy-runtime.md), [interactive blocks](./interactive-blocks-runtime.md), [NPC dialogue](./npc-dialogue-runtime.md), [embedded structures](./embedded-structure-runtime.md)
- presentation/control: [cinematic](./cinematic-runtime.md), [client feedback](./client-feedback-runtime.md)

## Observation and evidence contracts

- [Runtime telemetry contract](./runtime-telemetry-contract.md)
- [Observability runtime](./observability-runtime.md)
- [Validation runtime](./validation-runtime.md)
- [Runtime coverage audit](./runtime-coverage-audit.md)

## Placement rule

A document belongs here only when it defines durable analysis semantics or evidence interpretation. Current proof belongs in `docs/07-operations/current-validation.md`; historical execution evidence belongs in Git history or reliability history; repair policy belongs in `docs/04-repair/`.
