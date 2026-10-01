# M-Bedrock Capability Development

**Lane:** DEVELOPMENT / ENGINE IMPROVEMENT

Use when the goal is to make M-Bedrock-Dev better at detecting, understanding, proving, or preventing a class of defects.

This skill improves reusable capability. It does **not** own production-map auditing or map repair.

## Valid triggers

- a `capability-gap` from Map Bug Audit;
- known false negative;
- known false positive;
- unsupported Minecraft semantic;
- stale Platform Knowledge / Rule;
- insufficient evidence model;
- missing proof layer;
- repeated manual check that should become deterministic;
- new Minecraft version/API behavior requiring capability support.

## Development pipeline

```text
Capability gap / regression
→ reproduce with smallest evidence
→ classify first missing capability
→ select canonical owner
→ define general acceptance
→ implement minimum reusable change
→ add/update reduced fixture or benchmark
→ compare before/after behavior
→ document proof ceiling
→ STOP
```

## Capability-gap classes

Classify before changing source:

- `ingest-gap` — archive/native data cannot be read safely;
- `parser-gap` — source syntax/data is not normalized;
- `semantic-gap` — parsed facts lack meaning;
- `platform-knowledge-gap` — Minecraft behavior/version fact is missing;
- `platform-rule-gap` — fact exists but target capability decision is missing;
- `design-grounding-gap` — Map Game Design / intent relation is not represented;
- `behavior-contract-gap` — target-specific constraint cannot be represented;
- `diagnostic-gap` — facts exist but defect inference is absent/wrong;
- `proof-gap` — claim needs stronger static/package/runtime evidence;
- `runtime-harness-gap` — required live observation cannot be collected;
- `reporting-gap` — proven result cannot be represented correctly.

## Canonical-owner rule

Fix the **first missing owner**, not the downstream symptom.

Examples:

```text
cannot decode subchunk
→ adapter/parser

can decode but cannot identify arena-relative mismatch
→ semantic/topology analyzer

can identify mismatch but cannot tell whether Minecraft behavior is valid
→ Platform Knowledge / Rule

can understand facts but cannot decide map expectation
→ Game Design / Gameplay Intent grounding

expectation and actual behavior known but no classification
→ diagnostic layer
```

## Generalization requirement

A capability change must be reusable beyond the seed map.

Production logic must not contain seed-specific:

- map names;
- filenames;
- UUIDs;
- coordinates;
- scoreboard names;
- entity identifiers;
- one-off regexes;
- hardcoded expected counts,

unless the value is an explicit typed input/contract rather than hidden logic.

## Evidence and fixture discipline

A production map may seed the investigation, but durable acceptance should use the smallest safe evidence available:

- reduced fixture;
- synthetic source;
- golden assertion;
- stable fingerprint;
- explicit runtime transcript.

Do not commit private/full production maps as fixtures.

## Development priority

Use capability priority, not bug severity:

- `P0` — capability can produce materially unsafe/wrong diagnosis or blocks core inspection.
- `P1` — important recurring blind spot or material false positive/negative.
- `P2` — bounded quality/coverage/efficiency improvement.

Blocker/Major/Minor remain Bug Report severity only.

## STOP conditions

Stop development when:

- acceptance is met for the generalized capability;
- the next residue requires a different canonical owner;
- proof requires LOCAL/LIVE Minecraft unavailable in the current context;
- the only remaining work is unrelated cleanup.

Do not automatically return to the seed map audit. That is a new operational run.
