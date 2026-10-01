# M-Bedrock Detection Development

**Lane:** DEVELOPMENT / BUG-DETECTION IMPROVEMENT

## Purpose

Improve M-Bedrock-Dev's reusable ability to detect, understand, prove, or correctly reject a class of map defects.

This is not generic product development. A UI feature, packaging feature, refactor, or unrelated repository capability uses the normal Product Development execution contract instead.

## Entry criteria

Enter only from one of:

- a Map Bug Audit `capability-gap`;
- a known detector false negative;
- a known detector false positive;
- stale/missing Platform Knowledge or Platform Rule;
- missing semantic/proof/runtime-harness coverage;
- a repeated manual bug check that should become deterministic;
- Minecraft version/API change that affects detection correctness.

## Allowed actions

- improve adapters/parsers/analyzers;
- add/update Platform Knowledge or Rules with evidence;
- improve Gameplay Intent / Behavior Contract representation;
- add diagnostics and proof layers;
- improve runtime harness evidence collection;
- add reduced regression fixtures/golden expectations;
- change reusable detection orchestration.

## Forbidden actions

- patch the production map as the development solution;
- hardcode seed map names/UUIDs/coordinates/scoreboards/entities;
- call the seed map audit complete;
- alter frozen benchmark expectations merely to pass;
- broaden into unrelated product development;
- return automatically to Map Bug Audit after implementation.

## Development pipeline

```text
Capability Gap / detector regression
→ smallest reproduction
→ classify first missing capability
→ select canonical owner
→ freeze generalized acceptance
→ minimum reusable implementation
→ reduced fixture / expectation
→ Detection Benchmark
→ document proof ceiling
→ STOP
```

## Gap classes

- `ingest-gap`
- `parser-gap`
- `semantic-gap`
- `platform-knowledge-gap`
- `platform-rule-gap`
- `design-grounding-gap`
- `behavior-contract-gap`
- `diagnostic-gap`
- `proof-gap`
- `runtime-harness-gap`
- `reporting-gap`

Fix the first missing owner, not a downstream symptom.

## Generalization rule

A production map can seed the problem, but the resulting capability must be reusable.

Seed-specific values are allowed only as explicit typed fixture/input data, never hidden production logic.

## Detection-development priority

- `P0` — wrong/unsafe diagnosis or core inspection blocked.
- `P1` — recurring material blind spot / false positive / false negative.
- `P2` — bounded coverage, quality, or efficiency improvement.

Do not use Blocker/Major/Minor here; those are map Bug Report severities.

## Output contract

```text
Detection Capability Delta
Gap class
Seed evidence
Canonical owner
Generalized acceptance
Implementation surface
Fixture / benchmark expectation
Before behavior
Expected after behavior
Proof ceiling
Remaining residue
```

## Handoff

After implementation, hand off to `m-bedrock-detection-benchmark`.

Benchmark success does not automatically reopen the seed map audit.

## STOP

Stop when generalized acceptance is implemented and the next required action belongs to benchmark, another owner, unavailable runtime proof, or unrelated cleanup.
