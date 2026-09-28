# Next Action

M-Bedrock-Dev now has a first-class Gameplay Intent Model and an intent-aware diagnostic gate.

## Current lane — Artifact Understanding Before Defect Classification

The immediate architecture priority is no longer broader bug-rule accumulation.

For each representative map family:

1. extract evidence-backed gameplay concepts from source, commands, scoreboards, tags, dialogue, structures, and world state;
2. reconstruct mechanics, phases, lifecycles, ownership, resources, objectives, recovery/reset policy, and spatial semantics;
3. preserve unknown intent explicitly instead of guessing;
4. bind authored invariants to concrete evidence;
5. only then allow Diagnostic Reasoning to classify an observation.

The diagnostic gate now distinguishes:

```text
confirmed-defect
probable-defect
designed-behavior
engine-constraint
compatibility-difference
insufficient-evidence
ambiguous-intent
runtime-proof-required
```

A confirmed defect requires an evidenced contradiction against authored intent. Inferred intent can support only a probable defect. Open intent ambiguity blocks defect classification.

## Calibration corpus

Use the supplied representative worlds as a calibration corpus, beginning with source-explicit maps before compiled/minified maps.

Recommended progression:

```text
explicit source intent
→ modular compiled source
→ bundled/minified source
→ historical differential
→ runtime differential
```

The goal is not map-specific hardcoding. The goal is to prove that one parser-independent intent model can reconstruct meaning across heterogeneous authored worlds.

## Runtime semantics

Continue the runtime-class claim registry work, but consume it as a separate authority:

```text
artifact intent
+
Minecraft runtime semantics
+
observed behavior
→ diagnostic reasoning
```

Do not infer Education/BDS/Preview behavior from Retail by default.

## Safety

- AI/inference may propose intent claims but cannot silently promote them to authored facts;
- unknown intent remains unknown;
- diagnosis strength cannot exceed intent evidence strength;
- static evidence never implies runtime correctness;
- severity is assigned only after defect classification.


## Calibration corpus is now a first-class regression surface

All supplied representative sample worlds should be exercised through the gameplay-understanding corpus runner.

The corpus must remain external-artifact based:

- do not commit proprietary worlds;
- keep only descriptors and normalized fingerprints in the repository;
- compare understanding drift across engine revisions;
- use drift to identify generic blind spots;
- never convert map names or observed node IDs into semantic rules.

Primary next work after each corpus run:

1. inspect maps with new unknown intent;
2. inspect semantic kinds that disappear from a previously understood source style;
3. inspect bundled/minified maps where authored evidence remains weak;
4. expand generic source/command/dialogue/world-state recovery only when multiple corpus cases justify it;
5. keep runtime evidence separate from static authored intent.


## Historical differential is now the next corpus lane

The current-world eight-map corpus has been reviewed at `6bec916ed904fd06f064a799731de4021432e12d`.

Next generic learning priority:

1. compare current vs Old Version / Raw Dev where artifacts actually exist;
2. identify stable contracts, deliberate changes, migration leftovers, and legacy paths;
3. preserve reachability uncertainty—history alone cannot prove dead code or a defect;
4. keep runtime-differential proof separate from static historical inference.


## Current corpus blocker status

Reviewed baseline `2aaf14bf81856c995cdcaed9b8af330ec7c4065c` has:

```text
maps with unknown intent  0 / 8
total unknown intent      0
```

Next priority is no longer unknown-intent elimination. It is evidence-strength improvement for bundled/minified maps and broader historical/runtime differential proof.


## Next runtime-evidence hardening lane

Arm-scoped controlled-experiment evidence is now preserved and consumable by diagnostic reclassification.

Next generic priorities:

1. bind arm semantics to explicit control/treatment roles rather than relying only on arm IDs;
2. model expected contrast direction so a diagnostic binding states which arm/state combination constitutes contradiction or design match;
3. require intervention contrast explicitly for claims that depend on causal discrimination rather than simple runtime observation;
4. carry arm-scoped evidence through causal proof and repair-decision provenance without flattening it;
5. add runtime differential fixtures for scheduler, chunk lifecycle, entity AI/pathfinding, multiplayer, and persistence classes.

Do not infer causal meaning merely because two arms differ. The experiment definition, arm roles, expected direction, target profile, evidence integrity, and diagnostic intent binding must agree before promoting the claim.


## Next lane — preserve experiment semantics into causal proof

Role-aware expected contrast is now available at diagnostic reclassification.

Next priorities:

1. carry experiment id, predicate, role, expected state, observed state, and expected-direction disposition into causal proof provenance;
2. prevent a generic `intervention-supported` proof from authorizing repair when its supporting experiment contrast belongs to a different predicate or direction;
3. bind causal candidates to the exact controlled factor/intervention that discriminated them;
4. retain control evidence, treatment evidence, runtime profile, fixture fingerprint, and experiment revision through repair admission and proof bundles;
5. require preservation/retest plans to reference the same causal experiment contract when a repair is justified by controlled runtime evidence.

A controlled difference is evidence only for the predicate and intervention contract that produced it. Do not promote experiment-level status into unrelated causal claims.


## Next lane — controlled-factor and repair provenance continuity

Experiment-backed causal proof is now predicate-bound and carried into repair proof bundles.

Next priorities:

1. bind root-cause candidates to the exact controlled factor values that discriminated control and treatment, not only factor IDs;
2. verify that the candidate mechanism actually depends on those factor values before promotion from guarded repair to full causal repair eligibility;
3. carry experiment revision, runtime profile, fixture fingerprint, factor values, and predicate evidence into repair admission decision basis;
4. require post-repair retest plans to replay the same experiment contract or a stricter compatible successor;
5. reject repair verification if the retest silently changes runtime profile, fixture, intervention definition, or expected contrast direction.

The next goal is end-to-end provenance continuity:

```text
experiment definition
→ causal predicate
→ controlled factor/value contrast
→ root-cause candidate
→ repair authorization
→ repair proof bundle
→ post-repair retest
```


## Next lane — compatible successor retest contracts

Exact post-repair experiment continuity is now enforced.

Next priorities:

1. define an explicit compatibility relation for a stricter successor experiment instead of accepting only byte-for-byte contract identity;
2. require successor contracts to preserve intervention identity, target runtime scope, fixture semantics, causal predicates, controlled factor/value direction, and expected outcome direction;
3. record the executed retest contract on runtime verification receipts and lifecycle state;
4. carry retest contract revision into the decision ledger and release proof;
5. invalidate prior runtime verification when its authorizing experiment contract is superseded incompatibly.

A newer retest is acceptable only when equivalence or stricter coverage is proven explicitly. Version recency alone is never sufficient.


## Next lane — multi-contract runtime verification and invalidation

Single authorizing experiment contract continuity and compatible successor semantics are now enforced.

Next priorities:

1. support repairs whose causal proof depends on multiple controlled experiment contracts and require explicit coverage of every contract;
2. aggregate multiple runtime verification receipts without flattening contract identity;
3. invalidate runtime verification when an authorizing experiment contract is superseded incompatibly after verification;
4. propagate contract lineage into release admission and release proof;
5. define compatibility/invalidation behavior for target runtime updates, fixture evolution, and predicate-contract revisions.

Fail closed when only a subset of the causal experiment envelope has been reverified.


## Next lane — runtime-domain proof expansion

Causal experiment provenance, multi-contract post-repair coverage, compatible successor semantics, and release invalidation are now structurally enforced.

The next bottleneck is no longer proof transport. It is real Minecraft runtime coverage.

Prioritize controlled experiment families in this order:

1. chunk lifecycle and ticking-area readiness;
2. scheduler / deferred callback / event ordering;
3. entity AI and pathfinding stall/recovery;
4. multiplayer session concurrency, disconnect/reconnect, join/leave races, and cross-arena isolation;
5. persistence and restart/reload state;
6. runtime-profile differentials across Retail, Dedicated Server, Education, and other explicitly supported targets.

For every runtime class:

```text
documented/runtime hypothesis
→ controlled factors
→ control/treatment arms
→ explicit expected contrast
→ repeatable observation
→ evidence integrity
→ causal predicate binding
→ regression fixture
```

Do not promote a runtime-class assumption into a reusable rule until the controlled experiment surface proves it across the applicable target profile.


## Next lane — scheduler and event-ordering runtime proof

Chunk readiness experiment contracts are now structurally ready for real host execution.

Next runtime domain:

1. deferred callback generation ownership;
2. stale callback after reset/session replacement;
3. same-tick vs next-tick ordering;
4. event-before-state / state-before-event ordering;
5. cancellation and cleanup of scheduled work;
6. cross-arena scheduler isolation.

The controlled experiment should distinguish:

```text
expected generation/current-session callback
vs
stale generation/previous-session callback
```

and preserve exact runtime tick/sequence evidence so happens-before claims never derive from unordered observations.

Do not convert scheduler timing assumptions into rules until repeated controlled runtime evidence establishes the applicable target-profile semantics.


## Next lane — scheduler cancellation and cross-arena isolation

Stale-generation ownership and timeline ordering contracts are now structurally validated.

Next priorities:

1. prove cancellation prevents fixture-owned callbacks from mutating after teardown;
2. distinguish cancelled callbacks from merely delayed callbacks;
3. prove callbacks owned by arena A cannot mutate arena B state;
4. bind scheduler work to arena/session/subsystem generation in runtime evidence scope;
5. test teardown/reset while deferred work is pending;
6. test simultaneous deferred work from multiple arenas under the same runtime scheduler;
7. preserve per-arena timeline streams so ordering evidence cannot be accidentally compared across unrelated sessions.

Required fail-closed rule:

```text
callback has no matching active owner generation
→ mutation forbidden
→ explicit stale/cancelled evidence
```

Do not infer scheduler isolation from unique scoreboard names or source-level arena IDs. Isolation must be demonstrated by controlled concurrent runtime evidence.


## Next lane — entity AI and pathfinding stall/recovery proof

Scheduler generation ownership, temporal ordering, cancellation, and cross-arena isolation now have controlled proof contracts.

Next runtime domain:

1. entity movement progress over bounded tick windows;
2. path stall detection without relying on visual judgment;
3. target/goal retention during a stall;
4. collision/crowding versus navigation failure discrimination;
5. loaded-chunk readiness versus pathfinding failure discrimination;
6. controlled recovery by relocation to the nearest valid path anchor;
7. post-recovery movement resumption;
8. duplicate/teleport-loop prevention;
9. multi-entity crowding stress.

Required evidence model:

```text
entity identity/generation
+ target identity
+ position samples
+ movement delta
+ runtime ticks
+ chunk readiness
+ path anchor identity
→ stall classification
```

A stationary entity is not automatically a pathfinding defect. The experiment must distinguish waiting/target loss/collision/unloaded region from genuine navigation stall.


## Next lane — multiplayer session concurrency proof

Chunk readiness, scheduler behavior, and entity navigation now have controlled proof contracts.

Next runtime domain:

1. join-pad enter/leave ownership;
2. disconnect/reconnect generation reset;
3. death while joining an arena;
4. simultaneous player joins into one arena;
5. simultaneous starts across multiple arenas;
6. session cleanup on match end;
7. player inventory/scoreboard ownership isolation;
8. cross-arena event leakage;
9. reconnect to the same arena with a new session generation;
10. full-capacity five-player arena stress.

Required runtime scope:

```text
playerKey
connectionGeneration
lifeGeneration
arenaId
arenaGeneration
operationId
```

A player teleport, reset, or cleanup event is valid only when its session/generation ownership matches the current arena membership contract.

Do not classify a reconnect/reset issue from player location alone. Require membership state, session generation, arena generation, and lifecycle event ordering evidence.


## Next lane — persistence, reload, and restart proof

Chunk readiness, scheduler behavior, entity navigation, and multiplayer session concurrency now have controlled proof contracts.

Next runtime domain:

1. world/reload persistence of durable player and arena state;
2. explicit non-persistence of transient runtime state;
3. reconnect after process/world reload;
4. stale timer/callback invalidation across reload;
5. scoreboard/tag/dynamic-property reconciliation;
6. persistent entity identity versus transient entity loss;
7. fixture/runtime profile continuity across reload;
8. restart-safe cleanup and orphan lease reconciliation.

Required distinction:

```text
durable state
→ may survive reload

transient session authority
→ must be rebuilt/reconciled

in-memory callback/reference
→ must never silently survive as current authority
```

Do not treat state found after reload as proof it belongs to the current session generation. Persistence proof must bind stored data to a new runtime ownership envelope before mutation.


## Next lane — runtime-profile differential proof

Persistence/reload recovery now has controlled proof contracts.

Next runtime domain is compatibility discrimination across exact runtime profiles.

Priorities:

1. execute the same experiment definition against multiple captured runtime profiles;
2. keep every profile/environment evidence set isolated during qualification;
3. compare qualified predicate states across profiles only after each profile independently satisfies evidence integrity;
4. classify stable authored behavior versus runtime-profile-specific divergence;
5. preserve exact edition, host, Minecraft version, Script API version, experiments, and world/server settings in differential provenance;
6. distinguish Retail/listen-server, BDS/dedicated-server, and Education differences;
7. never call a profile-specific divergence a project defect until authored intent and target-support policy establish that the behavior should be invariant across those profiles.

Target classification surface:

```text
same authored intent
+ same fixture/experiment
+ profile A expected behavior
+ profile B divergent behavior
→ compatibility-difference candidate

not automatically:
→ authored bug
```


## Next lane — repair strategy intelligence

The primary runtime-proof transport and runtime-domain experiment foundation is now structurally mature across chunks, scheduler/event ordering, entity navigation, multiplayer concurrency, persistence/reload, and runtime-profile differential analysis.

The next bottleneck is repair selection quality.

Priorities:

1. enumerate all applicable repair strategies for the proven causal candidate;
2. reject strategies whose causal preconditions do not match the exact candidate/provenance;
3. estimate semantic blast radius before mutation;
4. estimate preservation risk and required invariant envelope;
5. estimate runtime retest burden from the authorizing experiment contracts;
6. prefer reversible/local/idempotent changes when proof strength is equal;
7. distinguish implementation repair, configuration repair, compatibility workaround, and runtime-recovery mitigation;
8. require an explicit reason when a larger mutation is selected over a smaller valid candidate;
9. retain rejected alternatives and their rejection reasons for auditability;
10. never select a repair solely because a provider exists.

Target decision shape:

```text
causal candidate
→ applicable repair candidates
→ proof compatibility
→ semantic impact
→ preservation risk
→ reversibility
→ validation/retest cost
→ deterministic selection
→ repair admission
```

The selector should optimize for the smallest repair that directly addresses the proven cause while preserving authored behavior—not the smallest diff in raw line count.


## Next lane — repair strategy enumeration and realization

Repair strategy selection is now causal-, safety-, and audit-aware.

The next bottleneck is candidate generation: the selector still depends on callers/providers to supply the candidate set.

Next priorities:

1. derive a repair opportunity envelope directly from the selected causal candidate and invariant set;
2. enumerate every registered strategy source that is applicable to the exact diagnostic, causal predicates, factors, source locations, and target profile;
3. distinguish strategy source from strategy authority — enumeration may discover a provider, template, configuration change, compatibility workaround, or recovery mitigation, but none is automatically preferred;
4. report missing strategy coverage explicitly when a proven cause has no applicable implementation path;
5. reject generated candidates that cannot bind to exact source evidence or the current source fingerprint;
6. attach repairClass, causalBinding, reversibility, idempotency, and expected validation/retest obligations at generation time;
7. deduplicate semantically equivalent candidates even if different providers produce them;
8. preserve generator/provider provenance through strategy selection and decision ledger;
9. require deterministic candidate realization before mutation;
10. keep unsupported or speculative repair ideas as proposal-only rather than silently converting them into PatchTransactions.

Target flow:

```text
selected causal candidate
→ repair opportunity envelope
→ applicable generators/providers/templates
→ candidate realization
→ candidate deduplication
→ strategy intelligence
→ deterministic selection
→ repair admission
```

The key principle is:

> Candidate generation broadens the option set; it does not lower the evidence threshold or gain authority over the selector.


## Next lane — repair realizer registry and generator coverage expansion

The system can now derive repair opportunities, enumerate applicable provider sources, realize source-bound candidates, deduplicate equivalent candidates, and pass the unique option set into causal strategy selection.

The next bottleneck is realization coverage and caller independence.

Priorities:

1. introduce a typed realizer registry that maps enumerated strategy sources to concrete deterministic realization implementations;
2. derive changed semantic node ids from operation SourceRefs / the current SemanticGraph instead of accepting them from the caller;
3. add strategy-source kinds beyond providers:
   - built-in implementation planners;
   - configuration templates;
   - compatibility workarounds;
   - runtime-recovery mitigations;
4. keep speculative/non-deterministic source types proposal-only;
5. add realizer revision/fingerprint to decision basis so generated candidates become stale when generator logic changes;
6. produce a repair coverage report for every proven causal candidate:
   ```text
   applicable source discovered
   realization succeeded
   realization blocked + reason
   no implementation coverage
   ```
7. add deterministic realizers for the highest-value proven runtime classes:
   - session/generation guard insertion;
   - arena ownership/capacity guard;
   - scheduler cancellation/ownership guard;
   - bounded navigation recovery configuration;
   - persistence reconciliation/idempotency guard;
8. require all generated source edits to retain exact source provenance and source-fingerprint preconditions;
9. record generator/source provenance and realization failures in the decision ledger without turning failed ideas into patch transactions;
10. feed only successfully realized, deduplicated candidates into repair strategy intelligence.

Target flow:

```text
causal opportunity
→ source registry
→ applicability
→ concrete realizer
→ exact source binding
→ deterministic PatchTransaction
→ semantic node derivation
→ deduplication
→ strategy intelligence
```

The next quality bar is that the caller supplies causal evidence and current source state—not a hand-authored repair candidate.


## Next lane — concrete runtime repair realizers

Repair source discovery, realizer versioning, graph-bound changed-node derivation, realization coverage reporting, and realization audit provenance are now structurally enforced.

The next bottleneck is concrete runtime repair realization.

Priorities:

1. add syntax-aware source analyzers that can identify exact mutation points for proven runtime causes before writing any repair;
2. implement deterministic realizers only when the analyzer can produce an exact transform contract:
   - session/connection/participation generation guard;
   - scheduler owner-generation/cancellation guard;
   - atomic arena capacity/start ownership guard;
   - persistence reconciliation/idempotency guard;
3. keep navigation recovery primarily configuration/runtime-mitigation unless an authored recovery surface is explicitly identified;
4. require every concrete realizer to produce:
   ```text
   exact SourceRef
   expected original text/command
   deterministic replacement
   source fingerprint precondition
   static validation
   causal runtime retest obligation
   preservation obligation
   ```
5. never synthesize JavaScript/function syntax from a causal predicate alone;
6. add a structured source-transform hint contract owned by analyzers, not by providers or callers;
7. reject realizer execution when source syntax, parser version, or semantic owner no longer matches the hint;
8. add realizer-specific revision tests so a generator logic change invalidates historical strategy decisions;
9. expand concrete realizer coverage incrementally and expose remaining missing-realizer classes in the coverage report;
10. only after deterministic realization is proven should these runtime repair sources move from proposal-only to causal-auto.

Target flow:

```text
proven runtime cause
→ exact syntax-aware source transform hint
→ registered deterministic realizer
→ graph-bound PatchTransaction
→ strategy intelligence
→ repair admission
→ same causal experiment retest
```

The governing rule is:

> Runtime causal proof identifies what must change; a syntax-aware analyzer must still prove exactly where and how the source can be changed safely.


## Next lane — persistence/idempotency and arena ownership transform hints

Scheduler and session generation guards are the first runtime-causal classes with analyzer-owned exact source transforms and deterministic causal-auto realizers.

Do not generalize the transform beyond the proven AST surface.

Next priorities:

1. inspect persistence/dynamic-property analyzers for exact patterns that can prove an idempotency/reconciliation transform without inventing storage semantics;
2. inspect arena membership/start analyzers for exact atomic ownership/capacity mutation surfaces;
3. define new `RepairSourceTransformHint` families only where source syntax supplies all required operands;
4. keep `arena-ownership-guard-template`, navigation recovery, and compatibility workaround proposal-only until such hints exist;
5. add exact parser/analyzer revision binding for every new hint family;
6. require one-to-one causal predicate/factor coverage before causal-auto realization;
7. verify generated transforms through the same runtime experiment that authorized the repair;
8. add realizer-specific post-transform analyzer checks so the expected guard becomes statically observable after mutation;
9. reject transformations that would duplicate an existing guard, widen state scope, or introduce a second authority surface;
10. preserve source formatting beyond the smallest replaced syntax span whenever possible.

Potential next concrete family:

```text
persistence stale-state / duplicate replay proof
→ analyzer identifies authored write + reconciliation marker
→ exact idempotency hint
→ deterministic persistence realizer
→ reload/restart causal retest
```

Arena capacity/start ownership remains a high-value target, but it must stay proposal-only unless the analyzer can identify the exact membership/start commit expression and its current ownership token.

The governing rule remains:

> A runtime experiment proves the missing behavior; only source syntax can authorize the exact edit.


## Next lane — arena capacity/start ownership source-transform analysis

Scheduler generation, session generation, and persistence idempotency now have analyzer-owned exact transform hints and deterministic causal-auto realizers.

Arena capacity/start ownership remains proposal-only.

The current source analyzers do not yet prove the exact authored mutation surface required to safely synthesize an atomic arena ownership guard.

Next priorities:

1. add structured analyzer evidence for arena membership commit and arena-start commit operations;
2. identify exact owner/generation tokens already authored in the same semantic region;
3. distinguish membership observation from membership mutation;
4. distinguish queue/join-pad state from committed arena membership;
5. identify max-capacity comparison and the mutation it guards as one source-owned unit;
6. identify start-owner acquisition / countdown-start mutation as one source-owned unit;
7. emit an `arena-ownership-guard` transform hint only when all operands are explicit in source;
8. reject transforms that would introduce a new arena authority surface or duplicate an existing lock/guard;
9. keep source proposal-only if the analyzer sees only scoreboard/tag names without proving their ownership role;
10. retest every realized arena repair through the exact capacity/start runtime experiment that authorized it.

Required hint surface:

```text
exact membership/start mutation SourceRef
current arena id/generation expression
current ownership/capacity expression
expected original syntax
deterministic guarded replacement
semantic owner region
parser/analyzer revision
causal predicate/factor coverage
```

Candidate causal bindings:

```text
arena-capacity-overflow-observed
↔ capacity-guard-enabled

arena-start-ownership-violation-observed
↔ start-ownership-guard-enabled
```

Do not infer arena ownership from variable names alone. A concrete arena realizer is allowed only after the analyzer can prove the guard operands and the mutation they protect belong to the same authored arena authority path.


## Next lane — post-transform semantic proof

Scheduler generation, session generation, persistence idempotency, arena capacity, and arena start ownership now have concrete analyzer-owned source transforms.

The next quality bottleneck is proving the generated edit itself before runtime mutation/retest.

Priorities:

1. define transform-specific static postconditions owned by analyzers;
2. after a candidate transform is generated, apply it to an isolated in-memory source snapshot and reparse it;
3. require the analyzer to observe the expected new guard/authority relation after transformation;
4. require the original transform hint to disappear after transformation, proving idempotent source diagnosis;
5. reject a candidate if the transformed source creates a second authority surface, duplicate guard, parse error, or ambiguous hint;
6. preserve exact pre-transform and post-transform analyzer revisions;
7. add the post-transform proof fingerprint to candidate/decision provenance;
8. require post-transform semantic graph impact to remain within the admitted repair envelope;
9. run runtime retest only after static post-transform proof succeeds;
10. keep source mutation transactional so failed post-transform proof never changes the original world/package.

Target closure:

```text
exact analyzer hint
→ deterministic candidate
→ isolated transform
→ reparse
→ static postcondition proven
→ impact/preservation validation
→ transaction apply
→ same causal runtime experiment retest
```

The governing rule is:

> A deterministic edit is not yet a proven repair. The analyzer must recognize the intended guard after transformation, and the same runtime experiment must still close the causal loop.
