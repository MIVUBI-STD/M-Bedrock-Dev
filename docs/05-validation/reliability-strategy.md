# Bedrock Reliability Strategy

M-Bedrock-Dev treats blindspots as explicit unknown evidence, not as an assumption that testing is complete.

## Five evidence inputs

```text
Invariant Registry
Regression Corpus
Map Compatibility Fingerprint
Minecraft Update Delta
Blindspot Coverage
        ↓
Risk-based Retest Planner
```

## Invariants

An invariant expresses behavior that must remain true across implementations or versions.

Examples:

- original source remains immutable;
- repeated gameplay regions preserve their intended local transform;
- independent multiplayer sessions do not leak mutable state;
- mcstructure block-index layers match declared volume.

Project-specific gameplay invariants can be registered without moving them into generic engine semantics.

## Regression corpus

A historical bug is valuable only if it changes future detection.

Important regressions should record the capability surface and violated invariant so a later Minecraft update can reactivate the right tests.

## Compatibility fingerprint

A map fingerprint describes dependency/risk surfaces, not merely files.

Examples:

- commands used;
- Script API modules;
- structures;
- world database use;
- entity/chunk/multiplayer-sensitive systems;
- target editions/experiments.

## Update delta

Update intelligence is represented as semantic entries such as:

- removed;
- behavior changed;
- validation tightened;
- deprecated;
- added.

The ingestion source can later be official changelogs, observed differential evidence, or curated compatibility research. The core planner is source-independent.

## Coverage

Coverage uses explicit states:

```text
covered
partial
unknown
not-applicable
```

Unknown is intentionally visible.

## Retest priority

Priority is derived from evidence overlap. It is not a subjective quality rating.

High priority can be triggered by:

- update delta overlaps a map capability/domain;
- matching historical regression exists;
- runtime-sensitive surface exists;
- relevant coverage is partial/unknown.

Suggested lanes may include static, differential, runtime, and generative testing.
