- 2026-10-06: Inventory / Equipment / Economy static audit slice hardened without CI: inventory and equipment reset are treated as separate surfaces, ItemStack copy mutation requires writeback evidence, restore ownership conflicts are correlated across spawn/join lifecycle, authored loadout transactions require SNAPSHOT/PLAN/CLEAR_OR_REPLACE/APPLY/VERIFY/COMMIT, and economy contract bindings now cover reward idempotency, death-source arbitration, stale-drop cleanup, inventory-full policy, pickup scope validation, and RESULT_COMMITTED terminal reward gating. Shop two-phase commit, special-item identity signatures, scoped-item ownership, stale handle reacquisition, and explicit reset-authority maps remain open.\n\n- 2026-10-06: Combat Lifecycle static audit slice hardened without CI: hurt/death paths remain separate, explicit arena/team scope guard evidence now gates combat side-effect review, projectile cleanup policy is bound to lifecycle/contract analysis, and knockback/status/ignite remain separate from health damage. Attribution envelope, projectile-generation ownership, environmental attribution, damage idempotency, assist-window generation, and terminal death→kill-credit proof remain open rather than heuristic-bound.\n\n- 2026-10-06: Entity Runtime / AI static audit slice hardened without CI: bound existing AI-stack, target prerequisite, navigation/environment compatibility, route-corridor and route-mutation evidence; added duplicate movement-goal priority conflict detection. Runtime progress watchdog, stall/recovery state machine, spawn navigation preflight, congestion, recovery-generation ownership, and performance-budget proof remain open rather than heuristic-bound.\n\n- 2026-10-06: Chunk Runtime audit slice hardened without CI: added zero-tick recovery detection, unloaded-specific spawn recovery routing, entityRemove-vs-death residency proof, explicit residency state-machine proof, bounded retry proof, spawn retry deduplication proof, serialized Script TickingArea allocation proof, reason-specific TickingAreaError routing, capacity requeue evidence, and continuous lease-journal/worldLoad reconciliation evidence. Remaining setup-planning/backend-compatibility contracts stay open rather than being heuristic-bound.\n\n# Development Planning

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