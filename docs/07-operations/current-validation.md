# Current Validation

Status: GAMEPLAY INTENT + INTENT-AWARE DIAGNOSTICS IMPLEMENTED; 8-MAP UNDERSTANDING CORPUS BASELINED; RUNTIME PROOF EXPANDING

## Current static reasoning stack

- Semantic IR;
- Gameplay Intent Model;
- evidence-grounded intent graph and authored invariants;
- explicit unresolved intent/ambiguity representation;
- Behavioral World Model;
- scoped Minecraft runtime overlays;
- claim provenance/evidence ceilings;
- Diagnostic Reasoning;
- intent-aware diagnostic classification gate;
- property-to-symptom evidence binding;
- happens-before-aware reliability search;
- adversarial invariant falsification;
- semantic trace differential preservation;
- Runtime Lab control plane;
- arm-scoped runtime experiment evidence with deterministic record-level evidence identity;
- arm-scoped diagnostic bindings for contradiction, design-match, engine-constraint, compatibility, and runtime-proof evidence.

## Diagnostic safety added

The diagnostic layer can now distinguish designed behavior, engine constraints, compatibility differences, insufficient evidence, ambiguous intent, runtime-proof-required observations, probable defects, and confirmed defects.

Confirmed defect classification requires:

```text
grounded intent subject
+
authored invariant
+
observation evidence
+
contradiction evidence
+
runtime proof when the claim requires runtime semantics
```

Inferred intent is capped at probable defect.

## Still unproven

- complete semantic correctness across the supplied corpus; extraction now runs across all eight sample families, but false-semantic review remains necessary;
- coverage quality on bundled/minified map scripts;
- cross-version historical intent reconstruction;
- actual semantic differences for most runtime classes;
- complete official knowledge coverage;
- observed-vs-documented conflict resolution;
- runtime scheduler/fairness behavior;
- replayability;
- AI/pathfinding behavior;
- real chunk lifecycle;
- real multi-client execution.


## Calibration corpus proof

The current external corpus contains eight representative worlds spanning explicit source, modular compiled source, and bundled/minified source.

Reviewed baseline revision `2aaf14bf81856c995cdcaed9b8af330ec7c4065c` produced:

```text
cases                 8
intent nodes          1145
authored nodes        181
inferred nodes        964
unknown intent        0
maps with unknowns    0
route profile cases   1
authored route points 67
```

This proves the same inspection/intent pipeline can recover non-empty gameplay semantics across all eight sample families.

It does not prove that every recovered semantic classification is correct. Corpus drift and false-semantic review remain required.


## Reviewed semantic corrections

- Bedwars role/team and bed-objective concepts are recovered generically from bundled semantics.
- Resource generators are classified as mechanics rather than raw resources.
- Orb countdown/finish helper actions are no longer counted as gameplay phases; phase/stage state remains represented as state evidence.
- Two false authored structural outcomes were removed from The Circuit; authored nodes are now 181, unknown intent is 0, and Five Nights route proof remains 67 authored route points.


## Historical comparison proof

Marathon Test of Tactics v1.0.2 → v2.2.0 was compared under one engine revision:

```text
artifact fingerprint changed      yes
gameplay intent disposition       stable
added intent nodes                0
removed intent nodes              0
node status changes               0
invariant changes                 0
artifactChangedIntentStable       true
```

This proves packaging/implementation change can be distinguished from authored gameplay-intent change.


## Arm-scoped runtime diagnostic proof

Runtime experiment evidence now preserves per-arm predicate observations instead of collapsing deterministic control/treatment differences into an undifferentiated global state.

Validated behavior at revision `8a542e953e86fcad4cab12f4f1aad2dab07983d7`:

```text
control arm absent + treatment arm present
→ global predicate may remain unknown
→ per-arm observations remain explicit
→ treatment-scoped contradiction/runtime-proof bindings remain usable
→ control evidence remains preserved as provenance context
```

Runtime evidence IDs are record-specific even when multiple records share one trial-level provenance key, preventing accidental evidence loss through deduplication.

GitHub Actions Verify run `36380666955` completed successfully: repository policy, source hygiene, public API audit, typecheck, and full test suite all passed.


## Expected contrast direction proof

Controlled runtime experiments now support explicit expected contrast direction per outcome predicate:

```text
predicate
+ control expected state
+ treatment expected state
→ definition revision authority
```

Qualification now records arm roles, observed control/treatment direction, expected-direction matches, and expected-direction mismatches. Diagnostic reclassification can bind evidence by semantic role and required state rather than by arm name alone, and may require both deterministic intervention contrast and a matched expected direction before using the evidence.

Validated source revision: `e20d986c5a8f4455b98eafe8eaf9d694660fb3dd`.

GitHub Actions Verify run `36381222614` completed successfully:

```text
repository policy     pass
source hygiene        pass
public API audit      pass
typecheck             pass
full test suite       pass
```

This proves the role/direction contracts compile and pass the current repository regression surface. It does not by itself prove Minecraft runtime semantics outside the experiments actually executed.


## Causal intervention provenance proof

Controlled-experiment causal proof now carries typed intervention provenance including experiment revision, predicate, controlled factors, observed control/treatment states, expected-direction disposition, target runtime profile, fixture fingerprint, and predicate-specific evidence IDs.

Root-cause candidates may declare exact `causalPredicateIds`. Experiment-backed mutation is downgraded to proposal-only when intervention provenance is missing, malformed, direction-mismatched, or does not cover the candidate's causal predicates.

Repair decisions retain the full causal proof object, and repair proof bundles preserve intervention provenance so auditability is not lost after admission.

Validated source revision: `133d681e7afa6ff72d21228b5f3c0f49542a7936`.

GitHub Actions Verify run `36381755600` completed successfully:

```text
repository policy     pass
source hygiene        pass
public API audit      pass
typecheck             pass
full test suite       pass
```


## Controlled factor value provenance proof

Controlled-intervention provenance now records exact factor value contrasts, not only factor IDs:

```text
factor id
+ control value
+ treatment value
→ causal intervention provenance
```

Root-cause candidates may declare exact `causalFactorIds`. Experiment-backed mutation is downgraded to proposal-only when the candidate's claimed causal factors are not covered by controlled factor value provenance.

Validated source revision: `2a8710c9afe257794e2d381b9f73b548d116449d`.

GitHub Actions Verify run `36382109755` completed successfully:

```text
repository policy     pass
source hygiene        pass
public API audit      pass
typecheck             pass
full test suite       pass
```


## Post-repair experiment contract continuity

Runtime repair verification can now require the exact controlled-experiment contract that authorized the repair.

The retest contract includes:

```text
intervention id
experiment revision
target runtime profile fingerprint
fixture fingerprint
predicate set
```

Expected retest contracts can be derived directly from the causal intervention provenance retained in the repair proof bundle. Runtime verification fails closed when the executed experiment revision, target profile, fixture, or predicate set differs from the authorizing contract.

Validated source revision: `6b31eec249ca88fc1a511c1da7c997e72d61bd8c`.

GitHub Actions Verify run `36382430628` completed successfully:

```text
repository policy     pass
source hygiene        pass
public API audit      pass
typecheck             pass
full test suite       pass
```


## Compatible successor retest proof

Post-repair runtime verification now supports explicitly compatible successor experiment contracts.

A successor revision may satisfy an older authorizing contract only when:

```text
intervention identity        preserved
target runtime profile       preserved
fixture fingerprint          preserved
controlled factor values     preserved
expected outcome direction   preserved
authorizing predicates       covered
compatibility with old rev   explicitly declared
```

Additional predicates are allowed as stricter coverage. Revision recency alone is not sufficient.

The executed runtime experiment contract is retained on the runtime verification receipt and lifecycle state. Runtime verification decisions also record experiment id, revision, target profile, fixture, and predicate lineage in the decision ledger.

Lifecycle independently re-checks compatibility against the experiment contract derived from the repair-authorizing causal provenance, preventing manually constructed runtime receipts from bypassing contract continuity.

Validated source revision: `374d4aab315094dccdb0a57b65d956e2fa2d4a17`.

GitHub Actions Verify run `36382974403` completed successfully:

```text
repository policy     pass
source hygiene        pass
public API audit      pass
typecheck             pass
full test suite       pass
```


## Multi-contract runtime verification and experiment-envelope invalidation

Repairs backed by multiple controlled runtime experiments now require complete coverage of the authorizing experiment envelope.

Lifecycle behavior:

```text
authorizing contracts 2
verified contracts    1
→ runtimeVerificationComplete = false

authorizing contracts 2
verified contracts    2
→ runtimeVerificationComplete = true
```

Compatible successor contracts may satisfy an older authorizing contract only through the explicit compatibility rules already defined.

Release lineage now supports multiple active runtime-verification decisions. Every runtime verification must be passing, current, and descended from the same repair admission/transitive-revalidation lineage.

A deterministic `runtimeExperimentContractRevision` is now part of the decision basis when a repair is backed by controlled experiment provenance. Changes to the authorizing runtime experiment envelope invalidate stale decisions and block release.

Release also independently reconstructs the authorizing experiment envelope from repair causal provenance and verifies that lifecycle runtime receipts cover the complete envelope. A manually constructed lifecycle state cannot bypass this coverage requirement.

Validated source revision: `b4ed1f0022cd079257fe0227569d1f7254d17d4e`.

GitHub Actions Verify run `36383899879` completed successfully on the repository-pinned Node 24.21.0 toolchain:

```text
repository policy     pass
source hygiene        pass
public API audit      pass
typecheck             pass
full test suite       pass
```

An independent targeted verification against the Package Source Snapshot also passed TypeScript compilation and 56/56 focused repair/runtime/lineage tests. The official GitHub Actions result remains the authoritative validation.


## Chunk readiness controlled-experiment proof

Runtime Lab now has first-class controlled experiment families for chunk readiness:

1. player-loader proximity readiness;
2. temporary ticking-area recovery readiness.

Both experiments are LIVE_MINECRAFT, guarded-mutation experiments and use the existing `probe.chunk-loaded` observation primitive. They do not infer readiness from fixed delays.

The chunk experiment action contract includes:

```text
chunk.position-loader-relative-to-target
chunk.isolate-target-from-loaders
chunk.set-temporary-ticking-area
chunk.clear-temporary-ticking-area
```

The ticking-area recovery experiment always includes a teardown cleanup action.

Runtime capability preflight now checks all mutating experiment actions before execution. Missing or incompatible host capabilities fail closed before the campaign reaches Minecraft.

Synthetic repeated control/treatment evidence proves the contract path:

```text
control: temporary load disabled → target-chunk-ready absent
treatment: temporary load enabled → target-chunk-ready present
→ repeatable deterministic contrast
→ expected direction matched
→ intervention-supported
→ predicate-specific causal provenance
```

This validates experiment semantics and causal promotion wiring. It does not claim that Minecraft itself exhibits the contrast until a real LOCAL_MINECRAFT/LIVE_MINECRAFT host executes the experiment.

Validated source revision: `9a370f7e1a12838a0db81b5e3b5e78240353f2ef`.

GitHub Actions Verify run `36384578970` completed successfully:

```text
repository policy     pass
source hygiene        pass
public API audit      pass
typecheck             pass
full test suite       pass
```


## Scheduler generation and temporal-ordering proof contracts

Runtime Lab now contains two scheduler experiment surfaces:

1. stale-generation callback ownership;
2. nested system.run temporal ordering.

Stale-generation proof:

```text
control
generation guard enabled
→ stale callback mutation absent

treatment
generation guard disabled
→ stale callback mutation present

→ repeated deterministic contrast
→ expected direction matched
→ intervention-supported causal provenance
```

Temporal ordering proof no longer derives ordering from harness request timing. Mutating runtime action acknowledgements may optionally return observed runtime evidence records. The Bedrock host binds those records to controlled-experiment provenance and target-profile identity while preserving the runtime-provided observation point.

Nested scheduler ordering requires explicit timeline markers:

```text
scheduler-origin-marker
scheduler-callback-marker
```

Both markers must carry comparable `streamId`, `sequence`, and `tick` metadata.

Temporal requirements now support `minTickDelta` as well as `maxTickDelta`. The scheduler ordering plan currently requires:

```text
nesting depth 1 → callback >= 1 tick after origin
nesting depth 2 → callback >= 2 ticks after origin
```

Arm-specific temporal requirements are assessed generically by the orchestrator. Same-tick observations cannot satisfy a contract that explicitly requires a later tick.

Capability preflight continues to fail closed when required scheduler actions are unavailable.

Validated source revision: `09e88bf27ce2ff973d549152f31404a3751f972a`.

GitHub Actions Verify run `36385520987` completed successfully:

```text
repository policy     pass
source hygiene        pass
public API audit      pass
typecheck             pass
full test suite       pass
```


## Scheduler cancellation and cross-arena isolation proof contracts

Runtime Lab now has controlled experiment families for:

1. cancellation of pending scheduler work before callback eligibility;
2. single-direction cross-arena callback isolation;
3. bidirectional concurrent A↔B scheduler isolation.

Qualification no longer trusts outcome contrast alone for these experiments.

Scheduler cancellation requires supporting evidence:

```text
control arm:
scheduler-work-cancelled = present
scheduler-callback-attempted = absent

treatment arm:
scheduler-work-cancelled = absent
```

Cross-arena isolation requires callback-attempt evidence scoped to the expected owner arena/generation. Bidirectional isolation requires evidence for both arena owners.

Supporting-evidence requirements are now a generic Runtime Lab contract feature. Missing support markers or scope mismatch prevent promotion to intervention-supported even when the primary outcome appears deterministic.

Scheduler cancellation and cross-arena isolation experiments are wired into intent diagnostic reclassification. Authored-intent defects become confirmed only when:

```text
treatment violation present
+ deterministic intervention contrast
+ expected direction matched
+ runtime evidence integrity safe
```

Validated source revision: `99ff68a7b10a1be210c9e864f4213db82f35299b`.

GitHub Actions Verify run `36393729504` completed successfully:

```text
repository policy     pass
source hygiene        pass
public API audit      pass
typecheck             pass
full test suite       pass
```

Independent Package Source Snapshot verification on the same revision also passed TypeScript compilation and 34/34 focused scheduler/runtime tests under Node 24.21.0.


## Entity AI navigation recovery and crowding proof contracts

Runtime Lab now has controlled experiment families for:

1. bounded path-anchor recovery after a verified stall;
2. crowding differential for distinguishing route/navigation issues from entity congestion.

Runtime evidence now supports numeric `measurements` for progress claims, including:

```text
windowTicks
displacement
distanceToTargetReduction
velocityMagnitude
nearbyEntityCount
```

Navigation observations are scoped by:

```text
arenaId
arenaGeneration
entityKey
entityGeneration
operationId
```

so pre-recovery, post-recovery, and crowding windows cannot be silently mixed.

Recovery experiments require supporting evidence for target validity, active movement goal, chunk readiness, measurable progress sampling, a pre-recovery stall, and explicit recovery-applied state. Only then may the treatment contrast:

```text
control: recovery disabled → movement-resumed-after-recovery absent
treatment: recovery enabled → movement-resumed-after-recovery present
```

be promoted to intervention-supported causal provenance.

Crowding experiments vary nearby entity count and require the same target/goal/chunk/progress support before a stall contrast can be interpreted.

The progress validator rejects stall claims when measured displacement or distance-to-target reduction exceeds the configured stall threshold.

Validated source revision: `0949bf400118b0a8efb4d08f6b23d64857950a4a`.

GitHub Actions Verify run `36394389787` completed successfully:

```text
repository policy     pass
source hygiene        pass
public API audit      pass
typecheck             pass
full test suite       pass
```

Independent Package Source Snapshot verification on the same revision also passed TypeScript compilation and 26/26 focused AI/runtime tests under Node 24.21.0.


## Multiplayer session concurrency proof contracts

Runtime Lab now covers multiplayer session ownership and stress surfaces:

1. join-pad leave before deferred join commit;
2. disconnect/reconnect under a new connectionGeneration and participationGeneration;
3. death/respawn during a pending join under a new lifeGeneration;
4. atomic arena capacity enforcement under a simultaneous join burst;
5. single-player versus full-capacity five-player session scaling;
6. simultaneous multi-arena start ownership.

Runtime scope now includes `participationGeneration` as a first-class trust boundary alongside playerKey, connectionGeneration, lifeGeneration, arenaId, arenaGeneration, and operationId.

Supporting evidence requirements now support numeric constraints:

```text
equals
min
max
```

so concurrency proof can require facts such as:

```text
attemptedPlayers = 6
maxPlayers = 5
activePlayers <= 5
rejectedPlayers >= 1
returnedPlayers = 5
startOwners = 1
```

instead of treating telemetry numbers as informal notes.

Full-capacity scaling intentionally does not claim player count is a causal defect factor when both 1-player and 5-player sessions remain healthy. It qualifies as repeatable stress evidence. If the 5-player treatment produces an authored-invariant violation, diagnosis may confirm the defect without pretending the scaling factor itself is the root cause.

Multiplayer violation outcomes are wired into intent diagnostic reclassification:

```text
stale-join-transition-observed
stale-session-mutation-observed
stale-life-join-mutation-observed
arena-capacity-overflow-observed
arena-start-ownership-violation-observed
arena-session-invariant-violation-observed
```

Intervention-backed violations require deterministic contrast and expected-direction match. All runtime-backed confirmation still requires safe runtime evidence integrity.

Validated source revision: `0c732e88b02a3c8c74440696b9a61863c46bf1ec`.

GitHub Actions Verify run `36396449793` completed successfully:

```text
repository policy     pass
source hygiene        pass
public API audit      pass
typecheck             pass
full test suite       pass
```


## Persistence, reload, and crash-recovery proof contracts

Runtime Lab now covers:

1. durable-state restoration versus transient-session authority after reload;
2. idempotent journal recovery after reload between APPLY and COMMIT;
3. orphan pack-owned resource reconciliation under a new boot generation.

Runtime scope now includes `bootGeneration` as a first-class ownership boundary.

Reload reconciliation requires evidence that:

```text
new bootGeneration is active
durable schema-versioned record restored
worldLoad recovery entered
control arm transient session state cleared
```

Only then can the contrast:

```text
reconciliation enabled  → stale transient restore absent
reconciliation disabled → stale transient restore present
```

be promoted to intervention-supported causal provenance.

Journal recovery requires a durable PREPARED marker before side effect, observed pre-reload applyCount = 1, recovery entry on the new boot, and control convergence with finalApplyCount = 1. Duplicate apply after reload is therefore not inferred merely from a counter change.

Orphan recovery requires explicit old-boot resource seeding, new-boot scan evidence, and zero remaining orphan resources in the guarded arm.

Persistence violation outcomes are wired into intent diagnostic reclassification:

```text
stale-transient-state-restored-observed
duplicate-apply-after-reload-observed
orphan-resource-retained-observed
```

Runtime-backed confirmation still requires authored intent, deterministic expected-direction contrast, and safe runtime evidence integrity.

Validated source revision: `30c2c9bee90fbd342696d1556a28f650bce2d6c9`.

GitHub Actions Verify run `36397270471` completed successfully:

```text
repository policy     pass
source hygiene        pass
public API audit      pass
typecheck             pass
full test suite       pass
```


## Runtime-profile differential proof

The orchestrator can now compare the same logical controlled experiment across independently qualified runtime profiles without mixing evidence before qualification.

Cross-profile comparison requires:

```text
same experiment id
same fixture
same protocol
same factors/arms
same outcomes
same evidence requirements
same minimum run contract
different targetProfileFingerprint allowed
```

A profile-independent experiment contract revision normalizes only the target runtime fingerprint. Any other experiment drift blocks comparison as insufficient evidence.

Every profile case must independently reach `repeatable` or `intervention-supported` before it can contribute to a profile differential. Single-run or otherwise merely observed evidence is not sufficient.

Comparison is role-aware:

```text
predicate @ control
predicate @ treatment
```

so deterministic control/treatment experiments are not collapsed into global unknown observations.

Differential provenance retains the exact captured runtime profile metadata:

```text
profile fingerprint
edition
host
Minecraft version
Script API modules/tracks
enabled experiments
arm/role
state
evidence ids
```

Validated divergence is routed through intent diagnostic reasoning as `compatibility-difference`, with no contradiction evidence. Runtime-profile divergence therefore cannot become `confirmed-defect` merely because Retail, Dedicated Server, or Education behave differently.

Validated source revision: `ab38b041596c729d0b1cc3ba948a4ace944b1737`.

GitHub Actions Verify run `36398015843` completed successfully:

```text
repository policy     pass
source hygiene        pass
public API audit      pass
typecheck             pass
full test suite       pass
```


## Repair strategy intelligence proof

Repair strategy selection now evaluates more than mutation size and graph blast radius.

Runtime-causal strategies can declare an exact causal binding:

```text
intervention ids
predicate ids
controlled factor ids
```

When the diagnostic carries controlled-intervention provenance, automatic selection fails closed if a strategy omits or does not cover that causal binding.

Strategies may classify themselves as:

```text
implementation-repair
configuration-repair
compatibility-workaround
runtime-recovery-mitigation
```

Selection policy can restrict allowed repair classes.

The Pareto assessment now includes:

```text
repair admission
semantic blast radius
sensitive semantic kinds
affected nodes/paths/depth
preservation risk
runtime retest burden
reversibility
idempotency
changed nodes
patch operations
```

Reversible and idempotent strategies are preferred by default when the higher-order causal/safety dimensions are otherwise equal. Policy can disable those preferences explicitly.

Raw patch size is not allowed to override causal fit. A smaller strategy with missing runtime causal binding is rejected even when a larger strategy is selected. The selected result records an explicit rationale when a smaller raw mutation existed but was rejected for non-size reasons.

Every selected result now retains structured rejected alternatives:

```text
strategy id
inadmissible | dominated
rejection reasons
dominating strategy ids
```

Decision-ledger recording preserves:

```text
selected strategy
repair class
causal-binding status
rejected alternatives + disposition
```

Provider existence remains proposal provenance, not selection authority.

Validated source revision: `9a00003b85a5b8fa77221fc66b0f2a3572ec0017`.

GitHub Actions Verify run `36406861849` completed successfully:

```text
repository policy     pass
source hygiene        pass
public API audit      pass
typecheck             pass
full test suite       pass
```
