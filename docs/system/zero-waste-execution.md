---
id: document.system.zero-waste-execution
class: DOCUMENT
domain: system
role: WORKFLOW
authority: CANONICAL
lifecycle: ACTIVE
---

# Zero-Waste Execution

M-Bedrock uses minimum sufficient execution rather than broad rescans.

## Canonical flow

```text
engineering task
→ explicit task route
→ minimum sufficient evidence plan
→ deterministic result reuse
→ diagnosis / repair
→ changed semantic nodes
→ reverse dependency affected closure
→ bounded AI context
→ selective validation
→ semantic proof reuse
→ zero-waste benchmark
→ STOP
```

## Owners

```text
task routing
→ packages/analysis-planner/src/task-routing.ts

minimum evidence planning
→ packages/analysis-planner/src/planner.ts

deterministic diagnosis reuse
→ packages/diagnosis-pipeline/src/cache.ts
→ packages/diagnosis-pipeline/src/execution.ts

semantic affected closure
→ packages/graph/src/invalidation.ts
→ packages/orchestrator/src/semantic-affected-plan.ts

bounded AI context
→ packages/orchestrator/src/context-compiler.ts

selective validation
→ packages/orchestrator/src/selective-validation-plan.ts

semantic proof reuse
→ packages/orchestrator/src/semantic-proof-cache.ts

workflow composition
→ packages/orchestrator/src/zero-waste-workflow.ts

durable continuation
→ packages/project-model/src/session/work-session.ts
→ packages/orchestrator/src/work-session-store.ts

efficiency measurement
→ packages/orchestrator/src/zero-waste-benchmark.ts

diagnosis accuracy measurement
→ packages/orchestrator/src/golden-diagnosis-benchmark.ts

adaptive runtime probe budgeting
→ packages/orchestrator/src/adaptive-runtime-probe.ts

multi-client execution contract
→ packages/runtime-lab/src/host/multi-client-orchestrator.ts
```

## Safety rules

- Cache is an optimization, never evidence authority.
- Only deterministic capabilities are eligible for deterministic result reuse.
- Cache identity includes capability/executor revision, context, and exact input.
- Selective validation may skip a scenario only when an explicit binding proves it outside the affected closure.
- Unbound validation scenarios run conservatively.
- A patch operation that cannot bind to the current semantic graph blocks selective validation.
- Proof reuse requires an unchanged claim revision, runtime profile when relevant, basis nodes, and incident dependency edges.
- Work-session checkpoints retain references, not duplicated graph or diagnosis truth.
- Context compilation never invents semantic/intent relationships from names.
- Runtime probes are globally budgeted by diagnostic value and cost.
- Full observation snapshots are targeted-first; dimension-wide entity enumeration is disabled by default.
- Multi-client orchestration is only a proof-capable runtime path when backed by a real runtime adapter. A fake/test adapter never upgrades proof level.

## STOP

When the requested outcome has matching evidence, affected validation is closed, stale proof obligations are resolved, and no blocker remains, stop. Do not continue into unrelated cleanup or architecture expansion.

## Context efficiency

Minimum-sufficient execution also applies to context loading.

Default read budget after routing is known:

```text
canonical owner/source  → 1–3 focused reads
supporting docs         → only when decision-changing
history/research        → zero reads by default
broad repository scan  → zero by default
```

Use stable handles instead of retransmitting large payloads when possible:
- artifact fingerprint;
- project/session ID;
- semantic node/diagnostic ID;
- patch transaction ID;
- content hash;
- exact path and range.

### Context tiers

```text
T0 current request/result
T1 exact semantic owner/source
T2 selected specialist procedure
T3 selected durable contract/reference
T4 current planning/work state only when material
T5 research/history only when needed
```

Do not preload higher tiers for reassurance.

### Incremental context rule

```text
changed file
→ changed normalized component
→ affected graph branch
→ affected diagnostics
→ affected validation
→ bounded context refresh
```

Avoid duplicate summaries, repeated stable graph/manifest payloads, unrelated rescans, and separate caches with different authorities.

Efficiency is measured as cost to a correct accepted result, not minimum context at the expense of proof.