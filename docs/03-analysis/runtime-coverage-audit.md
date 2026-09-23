# Runtime Knowledge Coverage Audit

## Status

The current knowledge base now covers the major high-severity failure families needed for a Bedrock/Education map analyzer and bug finder.

This is not a claim that every Minecraft feature has been documented. It means the architecture now has coverage for the principal runtime failure mechanisms that can corrupt multiplayer arena logic.

## Coverage map

### 1. Identity, ownership, and authority — covered

- player session generation
- arena/round generation
- life/entity generation
- operation/transaction generation
- state authority vs mirrors
- dev/admin capability
- mount/dialogue/feedback ownership

Primary failure classes covered:

- stale callbacks
- reconnect leaks
- duplicate ownership
- ghost participants
- cross-arena state mutation
- stale handles

### 2. Time and asynchronous execution — covered

- before/after event restrictions
- system.run/runInterval/runJob
- deferred promises/forms
- entity-event delayed application
- timers/countdowns
- cinematic timelines
- block ticks / command-block delays
- retry/backoff

Primary failure classes:

- same-tick read-after-write
- false serialization
- stale timeout
- duplicate interval
- timing race
- retry storm

### 3. World residency and mutation — covered

- chunk readiness
- entity residency
- structure placement
- block mutation
- interactive block state
- containers
- automation topology
- spatial containment
- destructive hazards

Primary failure classes:

- unloaded-chunk false missing
- queued structure treated as complete
- partial mutation
- wrong permutation
- stale container
- boundary corruption

### 4. Player lifecycle — covered

- join / initial spawn / respawn / leave
- downed / revive / death
- inventory/equipment
- effects/attributes
- gamemode/permissions
- input locks / gesture lifecycle
- physics / teleport
- cutscene/camera
- mounts

Primary failure classes:

- self revive
- double restore
- spectator leakage
- stale form/input action
- velocity leakage
- camera/control leakage

### 5. Entity lifecycle — covered

- spawn source classification
- population caps / density
- despawn / unload / death distinction
- AI/navigation
- route corridor
- target/goal arbitration
- effects/component groups
- combat/projectile attribution
- replacement lineage
- mounts/riders

Primary failure classes:

- entity missing misdiagnosis
- stuck mob false root cause
- duplicate spawn
- despawn counted as kill
- stale projectile
- route invalid after mutation

### 6. Arena lifecycle — covered

- ready/start concurrency
- setup
- world mutation
- transfer/cutscene
- active gameplay
- scoring/objectives
- terminal arbitration
- rewards
- cleanup/reset
- repeatability/quarantine

Primary failure classes:

- double start
- simultaneous terminal race
- duplicate reward
- cleanup residue
- dirty arena reuse
- first-run-only success

### 7. Multi-arena isolation — covered

- selector scope
- state ownership
- spatial separation
- combat/friendly fire
- feedback audience
- cinematic concurrency
- world-global rule conflicts
- dev command scoping
- entity/projectile containment

Primary failure classes:

- cross-arena selector
- global cutscene queue
- world gamerule conflict
- projectile/entity leakage
- broad admin side effects

### 8. Persistence and recovery — covered

- dynamic/durable state
- boot generation
- journals
- worldLoad reconciliation
- orphan cleanup
- idempotent recovery
- schema migration
- shutdown/watchdog assumptions

Primary failure classes:

- half commit
- blind resume
- orphan lease
- duplicate replay
- stale durable session state

### 9. Performance and observability — covered

- per-arena/global work budgets
- query fan-out
- runJob granularity
- recovery thundering herd
- content log / debugger / profiler
- structured traces
- runtime invariants
- developer-action auditing

Primary failure classes:

- watchdog pressure
- hidden hot path
- unreproducible race
- instrumentation spam

### 10. Compatibility and Education — covered at runtime-foundation level

- manifest / pack graph
- module versions
- min_engine_version
- experiments/beta
- last-known-good profile diff
- Bedrock vs Education applicability
- Education version track
- Code Builder / Agent
- classroom/admin controls
- Education Dedicated Server profile

## Residual gaps

The remaining gaps are mostly specialized content families rather than foundational runtime blindspots:

1. Trading/villager economy internals.
2. Recipes/crafting/smelting transaction semantics.
3. Education chemistry-specific blocks/items.
4. Highly specialized render/material/texture bugs that do not affect gameplay authority.
5. Add-on-specific proprietary systems not discoverable until a map uses them.
6. New API/features introduced after the current source profile.

These should be added on evidence instead of expanding the foundation indefinitely.

## Architecture readiness

The next highest-value work is no longer adding broad domains.

Priority should shift to making the analyzer consume this knowledge:

```text
map artifact
↓
extract topology/state surfaces
↓
resolve effective runtime profile
↓
construct ownership + dependency graph
↓
apply knowledge facts/policies
↓
generate diagnostics with evidence/confidence
↓
build future validation cases
```

## Recommended next engineering milestones

### A. Knowledge catalog loader hardening

- discover all catalog files safely
- validate schema
- validate source IDs
- validate domain registration
- reject malformed facts
- detect duplicate fact/relation IDs

### B. Cross-domain reasoning graph

Turn relations into executable graph rules:

- requires
- gates
- produces
- deactivates
- restores
- queues-behind
- delayed-until-tick

### C. Diagnostic rule compiler

Translate risk surfaces and policy facts into detector rules with:

- severity
- evidence requirements
- confidence
- version/edition applicability
- false-positive guards
- suggested proof step

### D. Map-specific runtime model

Build normalized representations for:

- arena
- player/session
- entity registry
- world mutation
- command context
- spatial bounds
- automation graph
- terminal/reward flow

### E. Validation-plan generator

For every high-confidence diagnostic, emit future validation cases without executing them yet.

## Exit criterion for knowledge-enrichment phase

Knowledge enrichment can be considered complete enough to move forward when:

- every high-severity analyzer finding maps to a registered knowledge domain;
- cross-domain dependencies can be evaluated programmatically;
- unknown version/edition context lowers confidence instead of inventing certainty;
- new bugs generally extend existing domains rather than require new foundational architecture.

The current repository is now close to that exit criterion. The dominant remaining work is integration and executable reasoning, not collecting more broad Minecraft concepts.
