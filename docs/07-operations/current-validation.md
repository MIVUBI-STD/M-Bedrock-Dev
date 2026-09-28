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
