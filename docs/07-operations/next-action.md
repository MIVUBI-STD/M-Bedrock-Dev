# Next Action

## Current lane — Workflow Compression Integration

The repository now has a domain-aware, fail-closed execution control plane. The priority is no longer to invent more analyzers; it is to make the existing semantic owners cheap to invoke without weakening proof.

### Current implemented foundation

The active `Local` branch now owns:

- bounded repository path ownership in `engine/packages/task-graph/`;
- exact/directory ownership plus one trailing-prefix wildcard for colocated domain files;
- granular core-versus-domain invalidation for scripts, entities, behavior contracts, and orchestrator domain analysis;
- `BUILTIN_TASK_CAPABILITIES` with selective reverse dependency closure;
- `planRepositoryTasks()` as the fail-closed repository planning wrapper;
- conservative fallback whenever any changed path has no registered owner;
- minimum-sufficient domain capability planning in `engine/packages/analysis-planner/`;
- compact domain attention signals in AI Context Compiler;
- optional repository execution scope in compiled context packs;
- proposal-only repair coverage separated from genuinely missing deterministic realizers;
- domain diagnostics/remediation routing for arena lifecycle, spatial authority, inventory, entity AI/navigation, combat/revive, chunk lifecycle, and economy/reward.

### Canonical control flow

```text
changed paths
→ builtin Task Graph ownership
→ direct capability owners
→ reverse dependent closure
→ execution-context filter
→ validated reusable work
→ repository task plan
→ affected semantic scope
→ compact AI context
→ required analysis only
→ STOP
```

Unknown ownership never proves that work can be skipped.

### Next non-CI integration step

1. expose repository `affected` / `plan` through the existing developer command surface;
2. connect repository verification to the task plan so owned changes may use affected-only verification;
3. preserve a mandatory conservative full-verification fallback for unmatched ownership or blocked dependencies;
4. make reusable-capability identity explicit before accepting cached/completed work;
5. keep runtime-only proof behind `LOCAL_MINECRAFT` / `LIVE_MINECRAFT`;
6. only after those contracts are stable, expose the same control plane through MCP or CI.

### Domain intelligence now available

```text
gameplay intent
→ arena/player lifecycle
→ cleanup resource ledger
→ spatial authority
→ multiplayer interleavings
→ inventory/equipment ownership
→ entity AI/navigation readiness
→ combat/downed/revive
→ chunk lifecycle/readiness
→ economy/reward arbitration
→ diagnostics
→ causal/proposal repair routing
```

These domains remain separate semantic owners. Task Graph and Context Compiler only route/compress their work.

### Non-goals

Do not:

- create another generic detector layer;
- move Minecraft semantics into Task Graph;
- auto-patch proposal-only domains without exact mutation authority;
- interpret runtime-sensitive claims from static evidence;
- make unmatched paths silently skippable;
- broaden wildcard ownership beyond the bounded trailing-prefix form;
- expand CI before the non-CI control plane is stable.

### Success metric

A small owned change produces a small, explainable task plan and compact AI context. A core or unknown change expands conservatively. Deterministic repair sources have realizers; gameplay-authored or ambiguous domains remain explicitly proposal-only.
