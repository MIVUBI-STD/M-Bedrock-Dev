- 2026-10-07: Entity identity / expected population reset gate added without CI: arena reset closure now consumes generation-bound actor-registry authority and proven spawn-quantity contradictions from progression actor accounting. Entity deduplication is treated as identity/multiplicity verification, never as a global type-count heuristic or automatic deletion. Declared registries that are generation-unbound and proven multiplicity mismatches quarantine arena reuse. Persistent critical-entity location/dimension schemas, replacement lineage, cap-pressure budgets, and full spawn-intent tokens remain separate open contracts.\n\n- 2026-10-07: Dirty-arena quarantine gate added without CI: ArenaResetClosure now exposes reuseEligibility and requiresRecovery. Only a complete closure is reusable; partial or unresolved closure is quarantined, and recovery must re-run closure to complete before reuse. This is a policy/readiness gate, not a new matchmaking manager. Entity deduplication and world-baseline restoration verification remain the two cleanup-specific proof gaps.\n\n- 2026-10-07: Cleanup / Reset / Repeated Run closure hardened without CI: a read-only ArenaResetClosureAssessment now consumes canonical cleanup ledger/lifecycle, inventory/loadout, capability mutation, combat revive/projectile contract, interaction/input, chunk deferred/entity residency, and world-rule conflict outputs. Arena reuse is complete only when every consumed domain is closed; partial cleanup precision remains partial rather than green. Post-reset entity deduplication, dirty-arena quarantine, and failed-reset deactivation remain open as separate recovery policies.\n\n- 2026-10-07: Player Life / Revive static+telemetry audit slice synchronized without CI: existing revive guard/transaction monitor and authored combat behavior contract now consume player-life policies for self-revive prohibition, distinct eligible reviver, single transaction owner, life-generation binding, death invalidation, stale/disconnected role invalidation, and valid completion. Respawn reconciliation matrix, explicit full life-state machine, dead-not-active participant predicates, and recursive health-handler correction remain open where static/runtime proof is incomplete.\n\n- 2026-10-07: Connection / Reconnect / Player Session static audit slice synchronized without CI: existing connection-generation, reconnect reconciliation, post-defer validation, terminal/start ownership, persistent-vs-transient identity separation, and reward-cleanup idempotency proofs are now bound to player-session policy. Leave-wide transient invalidation, respawn transition matrices, explicit participationGeneration ownership, and roommaster handoff remain open rather than inferred from naming.\n\n- 2026-10-07: World Mutation / Structure Placement static audit slice hardened without CI: existing function/script transaction owners are now bound to structure-request-not-commit and verify-before-dependent-action policies; unresolved call/recursion barriers remain explicit; deferred block mutation callbacks are correlated with existing generation-guard evidence so stale generations remain unresolved unless revalidated. Region locking, full PREPARE chunk coverage, entity-inclusion reconciliation, transform-aware bounds, animated placement completion, and compensating rollback remain open.\n\n- 2026-10-07: Interaction / UI / Input Lock static audit slice hardened without CI: production inspection now surfaces gameplay form completion paths, cancel/non-action guards, current-state/form-generation revalidation evidence, held-input first-event/debounce evidence, actor-target scope evidence, and input-lock owner-set/lifecycle restore evidence. These remain coverage/gap signals rather than automatic bug proof. Full form ownership envelopes, single-active-form purpose arbitration, operation-token idempotency, and explicit scoped input-lock lease schemas remain open.\n\n- 2026-10-07: World Interaction / Gamerule / Permissions static audit slice hardened without CI: global gamerule writes are explicitly treated as shared-world resources, conflicting values are surfaced rather than last-write-wins, arena-local-looking gamerule writes are exposed for review, and Creative/Operator/command-permission surfaces are kept separate from explicit developer capability evidence. Existing capability mutation footprint, cleanup normal-form, selector arena scope, and protection activation checks remain canonical owners. Global lease/CAS restoration, production debug-surface registry, auditable dev actions, and interaction/form ownership envelopes remain open.\n\n- 2026-10-06: Inventory / Equipment / Economy static audit slice hardened without CI: inventory and equipment reset are treated as separate surfaces, ItemStack copy mutation requires writeback evidence, restore ownership conflicts are correlated across spawn/join lifecycle, authored loadout transactions require SNAPSHOT/PLAN/CLEAR_OR_REPLACE/APPLY/VERIFY/COMMIT, and economy contract bindings now cover reward idempotency, death-source arbitration, stale-drop cleanup, inventory-full policy, pickup scope validation, and RESULT_COMMITTED terminal reward gating. Shop two-phase commit, special-item identity signatures, scoped-item ownership, stale handle reacquisition, and explicit reset-authority maps remain open.\n\n- 2026-10-06: Combat Lifecycle static audit slice hardened without CI: hurt/death paths remain separate, explicit arena/team scope guard evidence now gates combat side-effect review, projectile cleanup policy is bound to lifecycle/contract analysis, and knockback/status/ignite remain separate from health damage. Attribution envelope, projectile-generation ownership, environmental attribution, damage idempotency, assist-window generation, and terminal death→kill-credit proof remain open rather than heuristic-bound.\n\n- 2026-10-06: Entity Runtime / AI static audit slice hardened without CI: bound existing AI-stack, target prerequisite, navigation/environment compatibility, route-corridor and route-mutation evidence; added duplicate movement-goal priority conflict detection. Runtime progress watchdog, stall/recovery state machine, spawn navigation preflight, congestion, recovery-generation ownership, and performance-budget proof remain open rather than heuristic-bound.\n\n- 2026-10-06: Chunk Runtime audit slice hardened without CI: added zero-tick recovery detection, unloaded-specific spawn recovery routing, entityRemove-vs-death residency proof, explicit residency state-machine proof, bounded retry proof, spawn retry deduplication proof, serialized Script TickingArea allocation proof, reason-specific TickingAreaError routing, capacity requeue evidence, and continuous lease-journal/worldLoad reconciliation evidence. Remaining setup-planning/backend-compatibility contracts stay open rather than being heuristic-bound.\n\n# Development Planning

Current and future work that improves M-Bedrock-Dev itself.

## Completed repository consolidation

- remote GitHub established as the primary ChatGPT repository workflow; local npm/DEV.cmd execution is optional stronger proof only;
- semantic documentation domains established;
- numbered documentation paths retired;
- planning separated from workspace;
- current/historical operational state removed from docs;
- historical audit evidence moved to reliability history;
- reusable evaluation data moved to reliability corpus;
- bug-finding coverage consolidated into one canonical owner;
- validation consolidated into canonical proof/search/retest owners;
- repair consolidated into transaction and planning owners;
- analysis compatibility pointers removed after their content was absorbed;
- repository/documentation/path/coverage verifiers aligned with the final structure;
- repository knowledge access consolidated into one Router → Catalog → Graph → Retrieval → Context path;
- Resource Catalog, Graph, source types, document metadata, and canonical vocabulary synchronized under one verification contract;
- stale information-architecture migration work removed from operations planning after reconciliation.

Canonical documentation domains:

```text
docs/product/
docs/artifacts/
docs/analysis/
docs/repair/
docs/validation/
docs/system/
```

## Active

- Run knowledge-consumption audit and close actionable reusable knowledge that lacks a dedicated analyzer/proof binding.
- Continue reducing manually maintained implementation ownership only where machine-readable ownership can replace it safely.

## Backlog

- Promote strict knowledge-consumption verification into the main repository gate when current debt reaches zero.
- Review runtime/model abstractions for unique state/invariant ownership and remove representational layers that do not enforce a distinct responsibility.

## Rule

Items here improve the product/repository. Map-specific audit work does not belong here.