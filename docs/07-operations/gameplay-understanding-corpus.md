# Gameplay Understanding Calibration Corpus

Status baseline: `2aaf14bf81856c995cdcaed9b8af330ec7c4065c`

The supplied representative worlds are now treated as an external calibration corpus for gameplay understanding.

No production world binary is committed to the repository.

## Why this corpus exists

The corpus tests whether one parser-independent understanding pipeline can recover meaning from different authoring styles:

```text
explicit source
→ modular compiled source
→ bundled/minified source
→ spatially authored route data
→ runtime evidence
```

The corpus is not a map-name rule database.

A map may teach the engine that a semantic pattern exists, but the engine must rediscover that pattern from evidence in every artifact.

## Cases

| Case | Source shape | Primary learning dimensions |
| --- | --- | --- |
| Marathon Test of Tactics L2 | explicit source | state machine, session lifecycle, reconnect recovery, ownership, resource lifecycle |
| Builder's Memory / BlitzBuild | modular compiled | build policy, reconnect, membership, scoring, plot semantics, water interaction |
| The Circuit | modular compiled | multi-mode gameplay, trial state machines, arena sessions, shop/loadout, capture/fortify/last-stand |
| Fall of the Pillager L1 | bundled/minified | class-member recovery, revive/knockdown, shop/upgrade, inventory/kit, reconnect, waves |
| Beach Bedwars | bundled/minified | team lifecycle, bed objective, economy, combat session, protocol-vs-gameplay state |
| Five Nights at Z Village L1 | bundled/minified | route topology, path-index ambiguity, arena transforms, entity navigation, runtime route evidence |
| Orb of the Illusioner L1 | bundled/minified | party state, hologram status, puzzle/stage flow, waves, player session lifecycle |
| Five Nights Defense L2 | bundled/minified | multi-arena defense, shop/upgrade, revive, route/spawn, score/economy, reset |

## Observed baseline

The following values are observations from one engine revision. They are not pass/fail thresholds.

| Case | Intent nodes | Authored | Inferred | Unknown | Invariants | State | Lifecycle | Mechanic | Resource | Policy | Outcome | Spatial | Route profiles / points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Beach Bedwars | 82 | 13 | 69 | 0 | 0 | 11 | 34 | 4 | 9 | 4 | 0 | 8 | 0 / 0 |
| BlitzBuild | 113 | 45 | 68 | 0 | 22 | 21 | 17 | 11 | 13 | 15 | 10 | 14 | 0 / 0 |
| The Circuit | 284 | 36 | 248 | 0 | 1 | 33 | 38 | 48 | 74 | 4 | 1 | 51 | 0 / 0 |
| Defense L2 | 106 | 15 | 91 | 0 | 4 | 4 | 12 | 17 | 35 | 4 | 4 | 21 | 0 / 0 |
| Five Nights L1 | 179 | 14 | 165 | 0 | 4 | 3 | 30 | 33 | 61 | 5 | 4 | 32 | 3 / 67 |
| Marathon Test of Tactics L2 | 85 | 22 | 63 | 0 | 14 | 10 | 27 | 1 | 8 | 8 | 4 | 18 | 0 / 0 |
| Orb of the Illusioner L1 | 185 | 31 | 154 | 0 | 9 | 10 | 25 | 43 | 61 | 10 | 9 | 18 | 0 / 0 |
| Fall of the Pillager L1 | 111 | 5 | 106 | 0 | 0 | 6 | 19 | 24 | 44 | 1 | 0 | 8 | 0 / 0 |

Corpus aggregate at this revision:

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

All eight cases expose lifecycle, mechanic, resource, policy, spatial-region, and state concepts. Seven expose an explicit phase concept; Orb intentionally no longer counts countdown/finish helper actions as phases.

Six of eight expose authored/inferred outcome concepts.

## How to use the corpus

Materialize the sample worlds into one local directory. The filenames are described by:

```text
fixtures/calibration/gameplay-understanding-samples.json
```

Then run:

```text
npm run cli -- corpus-calibrate \
  fixtures/calibration/gameplay-understanding-samples.json \
  <artifact-root>
```

The command returns:

- a normalized gameplay-understanding fingerprint per artifact;
- source-shape coverage;
- learning-dimension coverage;
- authored/inferred/unknown distribution;
- intent-kind coverage;
- policy/outcome coverage;
- spatial route richness.

## Interpretation rules

Do not optimize for the largest node count.

A useful calibration review asks:

- Did a previously authored concept disappear?
- Did a new unknown intent blocker appear?
- Did a semantic kind disappear entirely?
- Did route profiles or authored route points disappear?
- Did a false semantic category get corrected?
- Did bundled/minified coverage improve without increasing protocol/helper noise?
- Did one fix improve one map while degrading another source style?

A fingerprint drift is an investigation signal. It is not automatically a regression.

## Current blind spots exposed by the corpus

The corpus also tells us where understanding is still weak.

- The Circuit still has two unresolved intent questions and is the broadest mixed-mode stress case.
- Pillager remains predominantly inferred because bundled/minified source loses stronger authored type/state evidence.
- Bedwars deliberately has no gameplay outcomes in the current model after protocol status was reclassified as state.
- Five Nights is currently the strongest spatial calibration case; other maps still need richer typed geometry extraction.
- Runtime semantics such as real navigation target, route reachability, chunk availability, scheduler behavior, and multi-client ordering still require runtime evidence.

These blind spots should drive generic architecture work, not map-specific patches.


## Reviewed semantic corrections

At reviewed baseline `6bec916ed904fd06f064a799731de4021432e12d`:

- Beach Bedwars gained generic role/team and bed-objective recovery without map-name rules.
- generator/forge semantics are modeled as mechanics even when resource material names are present.
- Orb lost previous phase-kind presence because those nodes were helper actions; this is an intentional semantic correction, not loss of authored phase evidence.
- The Circuit structural return variants are no longer misclassified as gameplay outcomes; corpus unknown intent is now 0.
- Five Nights L1 retains 3 route profiles and 67 authored route points.


## Historical intent comparison

Artifact history is compared semantically, not only by archive fingerprint.

The current comparator reports stable/expanded/reduced/changed gameplay intent, node/edge/invariant additions and removals, status changes, and evidence-origin changes.

Verified Marathon example:

```text
v1.0.2 artifact fingerprint != v2.2.0 artifact fingerprint
gameplay intent = stable
artifactChangedIntentStable = true
```

History alone does not prove dead code or a defect; reachability and runtime evidence remain separate requirements.
